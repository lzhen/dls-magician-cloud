import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import postcss from 'postcss';
import { REPO_ROOT, loadDesignSystem, componentCode } from '../design-system.mjs';

async function connect(t) {
  const client = new Client({ name: 'dls-magician-test', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../server.mjs', import.meta.url))],
    cwd: tmpdir(),
    stderr: 'pipe'
  });
  t.after(() => client.close());
  await client.connect(transport);
  return client;
}

async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
  return result.structuredContent;
}

test('official SDK handshake discovers exactly three read-only tools from a different cwd', async (t) => {
  const client = await connect(t);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(({ name }) => name).sort(), ['get_component_code', 'get_design_guidance', 'search_components']);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
});

test('search supports English, Chinese, no match, and bounded result count', async (t) => {
  const client = await connect(t);
  assert.equal((await call(client, 'search_components', { query: 'BUTTON' })).components[0].id, 'button');
  assert.equal((await call(client, 'search_components', { query: '创建任务' })).components[0].id, 'dialog');
  assert.equal((await call(client, 'search_components', { query: 'missing-component' })).total, 0);
  const limited = await call(client, 'search_components', { limit: 2 });
  assert.equal(limited.total, 8);
  assert.equal(limited.components.length, 2);
});

test('tokens match current CSS and expose only implemented themes/frameworks', async (t) => {
  const client = await connect(t);
  const guidance = await call(client, 'get_design_guidance', { section: 'tokens' });
  const css = readFileSync(path.join(REPO_ROOT, 'public/styles.css'), 'utf8');
  const root = postcss.parse(css).nodes.find((node) => node.selector === ':root');
  const actual = {};
  root.walkDecls((decl) => { if (decl.prop.startsWith('--')) actual[decl.prop] = decl.value; });
  assert.deepEqual(Object.assign({}, ...Object.values(guidance.tokens)), actual);
  assert.deepEqual(guidance.metadata.availableThemes, ['dark']);
  assert.deepEqual(guidance.metadata.supportedFrameworks, ['html-css']);
  assert.ok(!('implementation' in guidance));
  const typography = await call(client, 'get_design_guidance', { section: 'tokens', category: 'typography' });
  assert.deepEqual(Object.keys(typography.tokens), ['typography']);
});

test('every catalog variant returns source-bound code, not invented framework exports', async (t) => {
  const client = await connect(t);
  const catalog = await call(client, 'search_components');
  for (const component of catalog.components) {
    for (const variant of component.variants) {
      const code = await call(client, 'get_component_code', { componentId: component.id, variant });
      assert.equal(code.language, 'html');
      assert.ok(code.css.length > 0);
      assert.ok(code.example.length > 0);
      assert.ok(code.sourceBindings.every(({ file, line }) => file === 'public/styles.css' && line > 0));
      assert.ok(code.stylesheetRequired);
    }
  }
  const flow = await call(client, 'get_component_code', { componentId: 'flow-node' });
  assert.ok(flow.rendererSource.code.includes('escapeHtml(step.text'));
});

test('bad IDs, prototype keys, invalid variants, and path traversal fail without reading arbitrary files', async (t) => {
  const client = await connect(t);
  for (const args of [
    { componentId: '../../data/db.json' },
    { componentId: 'unknown' },
    { componentId: '__proto__' },
    { componentId: 'button', variant: 'toString' },
    { componentId: 'button', variant: 'light' }
  ]) {
    const response = await client.callTool({ name: 'get_component_code', arguments: args });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /Unknown/);
  }
});

test('SDK rejects unsupported arguments and invalid limits before execution', async (t) => {
  const client = await connect(t);
  for (const [name, args] of [
    ['search_components', { limit: 0 }],
    ['search_components', { limit: 1000 }],
    ['search_components', { query: 'x'.repeat(201) }],
    ['get_design_guidance', { category: 'imaginary' }],
    ['get_design_guidance', { theme: 'light' }],
    ['get_component_code', {}]
  ]) {
    const response = await client.callTool({ name, arguments: args });
    assert.equal(response.isError, true);
  }
});

test('all three tools leave project data untouched and exclude users and project history', async (t) => {
  const dbPath = path.join(REPO_ROOT, 'data/db.json');
  const before = readFileSync(dbPath, 'utf8');
  const client = await connect(t);
  const results = [
    await call(client, 'search_components'),
    await call(client, 'get_design_guidance'),
    await call(client, 'get_component_code', { componentId: 'dialog' })
  ];
  const output = JSON.stringify(results);
  const db = JSON.parse(before);
  for (const user of db.users) assert.ok(!output.includes(user.email));
  assert.ok(!output.includes('structuredLanguage'));
  assert.equal(readFileSync(dbPath, 'utf8'), before);
});

test('restarting from edited source changes tokens/revision and missing bindings fail fast', () => {
  const fixture = mkdtempSync(path.join(tmpdir(), 'dls-mcp-source-'));
  try {
    for (const file of ['public/styles.css', 'public/app.js', 'mcp/catalog.json', 'mcp/package.json', 'package.json']) {
      mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      writeFileSync(path.join(fixture, file), readFileSync(path.join(REPO_ROOT, file)));
    }
    const initial = loadDesignSystem(fixture);
    const cssPath = path.join(fixture, 'public/styles.css');
    writeFileSync(cssPath, readFileSync(cssPath, 'utf8').replace('--bg: #08080a;', '--bg: #010203;'));
    const changed = loadDesignSystem(fixture);
    assert.equal(changed.tokens.colors['--bg'], '#010203');
    assert.notEqual(changed.metadata.sourceRevision, initial.metadata.sourceRevision);
    writeFileSync(cssPath, readFileSync(cssPath, 'utf8') + '\n@media (max-width: 600px) { .modal { width: 100%; } .unrelated { color: red; } }\n');
    const dialogCss = postcss.parse(componentCode(loadDesignSystem(fixture), { componentId: 'dialog' }).css);
    let responsiveModal = false;
    dialogCss.walkRules('.modal', (rule) => {
      if (rule.parent.type === 'atrule' && rule.parent.name === 'media') {
        responsiveModal = rule.parent.params === '(max-width: 600px)';
      }
    });
    assert.ok(responsiveModal, 'A responsive component rule must retain its media condition');
    assert.ok(!dialogCss.toString().includes('.unrelated'));
    const catalogPath = path.join(fixture, 'mcp/catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    catalog.components[0].selectors.push('.missing-selector');
    writeFileSync(catalogPath, JSON.stringify(catalog));
    assert.throws(() => loadDesignSystem(fixture), /Missing source selector/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('component CSS retains required dialog animations', () => {
  const system = loadDesignSystem();
  const dialog = componentCode(system, { componentId: 'dialog' });
  assert.match(dialog.css, /@keyframes modal-in/);
  assert.match(dialog.css, /@keyframes fade-in/);
  const css = postcss.parse(dialog.css);
  assert.ok(css.nodes.length > 0);
  assert.ok(!dialog.css.includes('.modal-root'));
});
