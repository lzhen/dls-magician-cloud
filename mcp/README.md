# DLS Magician MCP · internal MVP 0.1.0

A working, read-only **stdio MCP server** for the existing DLS Magician Cloud
design system. It uses the official MCP SDK and reads the repository's current
HTML/CSS implementation. No model call, API key, paid design-reference service,
web app login, or running web server is required.

## Run and verify

Use Node.js 20.19 or newer. From the repository root:

```bash
npm run mcp:setup
npm run test:mcp
npm run demo:mcp
```

The demo launches the MCP server as a child process, performs the initialize
handshake, discovers its tools, finds a create-task dialog, reads tokens and
guidance, and retrieves dialog/input/button examples. It closes the connection
and exits. It does **not** call a model or build a working task-management form.

The existing web app still starts with `npm start`, without installing any MCP
dependencies. MCP dependencies and their lockfile are isolated under `mcp/`.

## Connect a local MCP host

Generate a stdio configuration on the machine where the clone lives:

```bash
node mcp/config.mjs
```

Merge the resulting `dls-magician` entry into the local host's `mcpServers`
configuration. Preserve its other server entries. The generated command and
server path are absolute; no working-directory setting is needed. The host
launches `server.mjs` itself. Startup diagnostics go to stderr so stdout stays
valid MCP JSON-RPC.

This is a local stdio integration. It is not a remote HTTPS endpoint and has not
been connected to a signed-in AI host or to this ChatGPT conversation. Hosts
that only accept remote MCP URLs need a separate HTTP/auth integration.

## Three tools

| Tool | Arguments | Result |
| --- | --- | --- |
| `search_components` | optional `query`, optional `limit` (1–8) | Matching IDs, descriptions, variants, source locations; empty query lists all components |
| `get_design_guidance` | optional `section`: `all`, `tokens`, `usage`, `versions`; optional token `category`: `all`, `colors`, `typography`, `radius`, `layout`, `effects` | Current CSS token values, implementation notes, separately labeled recommendations, and version metadata |
| `get_component_code` | required `componentId`, optional `variant` (default: `default`) | HTML usage example, exact CSS excerpt, stylesheet binding, renderer source where applicable, and recommendations |

Example tool calls:

```json
{"name":"search_components","arguments":{"query":"创建任务"}}
{"name":"get_design_guidance","arguments":{"section":"tokens","category":"colors"}}
{"name":"get_component_code","arguments":{"componentId":"dialog"}}
{"name":"get_component_code","arguments":{"componentId":"button","variant":"primary"}}
```

Suggested host prompt:

> 用 DLS Magician 的现有组件设计一个创建任务弹窗。先查找相关组件并读取
> 使用规范，再获取组件代码。说明哪些是现有实现、哪些行为仍需补齐。

## Coverage and source of truth

- Eight documented primitives: `button`, `input`, `textarea`, `select`,
  `status`, `dialog`, `flow-node`, and `flow-connector`.
- Thirty-eight global CSS custom properties currently read from `:root` in
  `public/styles.css`. Component-local literals and spacing are not represented
  as invented global tokens.
- `mcp/catalog.json` supplies searchable descriptions, curated HTML usage
  examples, selectors, and recommendations. Selectors are checked against the
  actual stylesheet on startup; a missing binding prevents startup.
- CSS excerpts come from PostCSS parsing of the actual stylesheet, retaining
  responsive wrappers and relevant animation keyframes. Load the **full existing
  stylesheet** in the target application; the excerpts are for inspection.
- Flow components also return the current `renderFlow` function from
  `public/app.js`. HTML examples are explicitly labeled as curated examples.
- `applicationVersion` comes from the app package, `mcpVersion` from this server's
  package, and `catalogVersion` from the catalog. `sourceRevision` fingerprints
  the source files and package manifests, so a changed stylesheet does not hide
  behind an unchanged application package version.
- The data is loaded once on startup. Restart the host's MCP server after
  editing the stylesheet, app source, or catalog.

## Current boundaries

This MVP documents the current **dark, vanilla HTML/CSS** DLS implementation.
It does not claim React exports, light-theme variants, mobile-native bindings,
cross-product design approval, or accessibility certification.

Dialog examples supply markup. The host must implement submit/cancel handlers,
validation, focus trapping, Escape dismissal, background inertness, and focus
return. Keyboard behavior, contrast, motion, touch targets, and responsive
layout still need verification in the final product.

The web app's existing “Connect via MCP” dialog is a local configuration demo.
This PR supplies a real MCP **server**, not a browser-to-MCP client, and does not
change that dialog or its displayed connection status.

All three tools are read-only. They read only fixed design source files and
package manifests. They do not expose `data/db.json`, user records, project
contents, credentials, or project version history; they make no network
requests. Installing dependencies uses npm in the usual way.

## Validation

`npm run test:mcp` exercises the official SDK over a real child-process stdio
connection. It covers tool discovery, English/Chinese search, every catalog
variant, current CSS values, source revision changes, missing-source failure,
invalid inputs and variants, project-data preservation, and CSS extraction.

Tested locally with Node.js 24.19.0. `npm run demo:mcp` is the reproducible
end-to-end example. Signed-in host integration and a remote deployment have not
been performed.
