import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postcss from 'postcss';

export const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const hash = (text) => createHash('sha256').update(text).digest('hex');
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');

function tokenCategory(name) {
  if (name.startsWith('--font-')) return 'typography';
  if (name.startsWith('--radius-')) return 'radius';
  if (name === '--sidebar') return 'layout';
  if (name === '--shadow') return 'effects';
  return 'colors';
}

function hasSelector(selector, candidates) {
  return candidates.some((candidate) => {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escaped}(?![\\w-])`).test(selector);
  });
}

function componentCss(ast, component) {
  const selected = ast.clone();
  selected.walkRules((rule) => {
    // Keyframe steps are retained with their animation, not treated as selectors.
    if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    if (!hasSelector(rule.selector, component.selectors)) rule.remove();
  });
  const animations = new Set();
  selected.walkDecls('animation', (decl) => animations.add(decl.value.split(/\s+/)[0]));
  selected.walkAtRules((rule) => {
    if (/keyframes$/.test(rule.name) && !animations.has(rule.params)) rule.remove();
  });
  selected.walkComments((comment) => comment.remove());
  // Preserve relevant @media/@supports wrappers, remove empty wrappers.
  selected.walkAtRules((rule) => { if (!rule.nodes?.length) rule.remove(); });
  return selected.toString().trim();
}

function rendererSource(source, name) {
  if (name !== 'renderFlow') return null;
  const start = source.indexOf('function renderFlow(');
  const end = source.indexOf('\nfunction updateEditorOutputs(', start);
  if (start < 0 || end < 0) throw new Error('renderFlow source binding is missing.');
  return {
    file: 'public/app.js',
    line: source.slice(0, start).split('\n').length,
    code: source.slice(start, end).trim()
  };
}

export function loadDesignSystem(root = REPO_ROOT) {
  // A packed installation has an immutable snapshot instead of a repository.
  // Explicit fixture roots still fail fast when their source files are missing.
  if (root === REPO_ROOT && !existsSync(path.join(root, 'mcp/catalog.json'))) {
    const system = JSON.parse(readFileSync(new URL('./.bundle/design-system.json', import.meta.url), 'utf8'));
    system.metadata.distributionMode = 'bundled-snapshot';
    return system;
  }
  const css = read(root, 'public/styles.css');
  const app = read(root, 'public/app.js');
  const catalogText = read(root, 'mcp/catalog.json');
  const catalog = JSON.parse(catalogText);
  const appPackage = JSON.parse(read(root, 'package.json'));
  const mcpPackage = JSON.parse(read(root, 'mcp/package.json'));
  const ast = postcss.parse(css, { from: 'public/styles.css' });
  const rootRule = ast.nodes.find((node) => node.type === 'rule' && node.selector === ':root');
  if (!rootRule) throw new Error('DLS :root tokens are missing.');

  const tokens = {};
  rootRule.walkDecls((decl) => {
    if (!decl.prop.startsWith('--')) return;
    const category = tokenCategory(decl.prop);
    (tokens[category] ??= {})[decl.prop] = decl.value;
  });
  if (!Object.keys(tokens).length) throw new Error('DLS tokens are empty.');
  const ids = new Set();
  const components = catalog.components.map((component) => {
    if (ids.has(component.id)) throw new Error(`Duplicate component: ${component.id}`);
    ids.add(component.id);
    const bindings = [];
    ast.walkRules((rule) => {
      if (hasSelector(rule.selector, component.selectors)) {
        bindings.push({ file: 'public/styles.css', line: rule.source.start.line, selector: rule.selector });
      }
    });
    for (const selector of component.selectors) {
      if (!bindings.some((binding) => hasSelector(binding.selector, [selector]))) {
        throw new Error(`Missing source selector ${selector} for ${component.id}`);
      }
    }
    return { ...component, bindings, css: componentCss(ast, component), rendererSource: rendererSource(app, component.renderer) };
  });
  const sources = [
    { file: 'public/styles.css', sha256: hash(css) },
    { file: 'public/app.js', sha256: hash(app) },
    { file: 'mcp/catalog.json', sha256: hash(catalogText) },
    { file: 'package.json', sha256: hash(read(root, 'package.json')) },
    { file: 'mcp/package.json', sha256: hash(read(root, 'mcp/package.json')) }
  ];
  return {
    metadata: {
      name: 'DLS Magician',
      distributionMode: 'repository-source',
      applicationVersion: appPackage.version,
      mcpVersion: mcpPackage.version,
      catalogVersion: catalog.version,
      sourceRevision: hash(JSON.stringify(sources)),
      availableThemes: ['dark'],
      supportedFrameworks: ['html-css'],
      componentCount: components.length,
      scope: catalog.scope,
      sources
    },
    tokens,
    components
  };
}

export function searchComponents(system, { query = '', limit = 8 } = {}) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = system.components.filter((component) => {
    const text = [component.id, component.name, component.description, ...component.tags].join(' ').toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
  return {
    metadata: system.metadata,
    query,
    total: matches.length,
    components: matches.slice(0, limit).map(({ id, name, description, variants, bindings }) => ({
      id, name, description, variants: Object.keys(variants), source: bindings[0]
    }))
  };
}

export function designGuidance(system, { section = 'all', category = 'all' } = {}) {
  const output = { metadata: system.metadata };
  if (section === 'all' || section === 'tokens') {
    output.tokens = category === 'all' ? system.tokens : { [category]: system.tokens[category] ?? {} };
    output.tokenNotes = 'Values are read from the current :root CSS at server startup. Component-local values and spacing literals are not invented as global tokens. Restart after source edits.';
  }
  if (section === 'all' || section === 'usage') {
    output.implementation = [
      'This repository implements vanilla HTML/CSS components; it does not expose React, SwiftUI, or mobile-native components.',
      'The current public/styles.css defines a dark theme. No light variant is supplied by this MCP.',
      'Load public/styles.css in the host application. Returned component CSS is an inspection excerpt, not a standalone stylesheet.',
      'The web app Connect via MCP modal saves a demo configuration locally. This server does not wire that modal to an external MCP client.'
    ];
    output.recommendations = [
      'Reuse documented selectors and tokens. Treat new patterns as design proposals until reviewed.',
      'Include loading, empty, error, success, disabled, and focus behavior where the user task needs them; this catalog does not claim all such states exist.',
      'Check keyboard navigation, accessible names, contrast, touch targets, reduced motion, and small-screen scrolling in the final interface.',
      'HTML examples demonstrate composition. Supply event handlers, validation, persistence, and dialog focus management in the host application.'
    ];
  }
  if (section === 'all' || section === 'versions') {
    output.versions = {
      current: system.metadata,
      history: [
        { version: '0.2.0', changes: ['Standalone local package with a versioned design-system snapshot; interactive component explorer and connection guide.'] },
        { version: '0.1.0', changes: ['Initial internal read-only MCP: component search, source-derived tokens and guidance, component examples with source bindings.'] }
      ],
      notes: 'applicationVersion is the app package version; catalogVersion describes this catalog; sourceRevision hashes the actual input files. Project/user version history is not read or exposed.'
    };
  }
  return output;
}

export function componentCode(system, { componentId, variant = 'default' }) {
  const component = system.components.find((item) => item.id === componentId);
  if (!component) throw new Error(`Unknown component '${componentId}'. Call search_components for valid IDs.`);
  if (!Object.hasOwn(component.variants, variant)) {
    throw new Error(`Unknown variant '${variant}' for '${componentId}'. Available: ${Object.keys(component.variants).join(', ')}.`);
  }
  return {
    metadata: system.metadata,
    component: { id: component.id, name: component.name, variant },
    language: 'html',
    example: component.variants[variant],
    exampleStatus: 'Curated usage example of existing CSS selectors; behavior must be implemented by the host.',
    css: component.css,
    stylesheet: 'public/styles.css',
    stylesheetRequired: true,
    ...(system.metadata.distributionMode === 'bundled-snapshot' ? { packagedStylesheet: '@empathie/dls-magician-mcp/.bundle/styles.css' } : {}),
    sourceBindings: component.bindings,
    ...(component.rendererSource ? { rendererSource: component.rendererSource } : {}),
    recommendations: component.recommendations
  };
}
