import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { REPO_ROOT, loadDesignSystem } from '../design-system.mjs';

test('packed installation works outside the repository and exposes no project database', { timeout: 60000 }, async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'dls-mcp-package-'));
  const client = new Client({ name: 'dls-package-test', version: '0.2.0' });
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const packed = JSON.parse(execFileSync(npm, ['pack', '--json', '--pack-destination', temporary], {
      cwd: path.join(REPO_ROOT, 'mcp'), encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'pipe']
    }))[0];
    const files = packed.files.map(({ path: file }) => file);
    assert.ok(files.includes('.bundle/design-system.json'));
    assert.ok(files.includes('.bundle/styles.css'));
    assert.ok(!files.some((file) => /db\.json|public\/app\.js|test\//.test(file)));
    execFileSync(npm, ['install', '--prefix', temporary, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-timeout=15000', '--fetch-retries=0', path.join(temporary, packed.filename)], {
      encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe']
    });
    const installed = path.join(temporary, 'node_modules/@empathie/dls-magician-mcp');
    const config = JSON.parse(execFileSync(process.execPath, [path.join(installed, 'config.mjs')], { encoding: 'utf8' }));
    assert.equal(config.mcpServers['dls-magician'].args[0], path.join(installed, 'server.mjs'));
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [path.join(installed, 'server.mjs')], cwd: temporary, stderr: 'pipe' }));
    assert.equal((await client.listTools()).tools.length, 3);
    const guidance = await client.callTool({ name: 'get_design_guidance', arguments: { section: 'tokens' } });
    assert.ok(!guidance.isError);
    assert.equal(guidance.structuredContent.metadata.distributionMode, 'bundled-snapshot');
    assert.equal(guidance.structuredContent.metadata.sourceRevision, loadDesignSystem().metadata.sourceRevision);
    const code = await client.callTool({ name: 'get_component_code', arguments: { componentId: 'button', variant: 'primary' } });
    assert.ok(!code.isError);
    assert.ok(code.structuredContent.example.includes('btn-primary'));
    assert.equal(code.structuredContent.packagedStylesheet, '@empathie/dls-magician-mcp/.bundle/styles.css');
  } finally {
    await client.close();
    rmSync(temporary, { recursive: true, force: true });
  }
});
