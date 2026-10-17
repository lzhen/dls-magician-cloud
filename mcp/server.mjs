#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { pathToFileURL } from 'node:url';
import { loadDesignSystem, searchComponents, designGuidance, componentCode } from './design-system.mjs';

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function result(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

export function createServer(system = loadDesignSystem()) {
  const server = new McpServer({ name: 'dls-magician', version: system.metadata.mcpVersion });

  server.registerTool('search_components', {
    description: 'Search DLS Magician existing HTML/CSS components by ID, name, or English/Chinese keyword. Empty query lists the catalog. Returns documented variants and source locations.',
    annotations: READ_ONLY,
    inputSchema: z.object({
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(8).optional()
    }).strict()
  }, async (args) => result(searchComponents(system, args)));

  server.registerTool('get_design_guidance', {
    description: 'Read source-derived DLS CSS tokens, usage guidance, and catalog/source versions. Only the existing dark HTML/CSS implementation is documented; recommendations are identified separately.',
    annotations: READ_ONLY,
    inputSchema: z.object({
      section: z.enum(['all', 'tokens', 'usage', 'versions']).optional(),
      category: z.enum(['all', 'colors', 'typography', 'radius', 'layout', 'effects']).optional()
    }).strict()
  }, async (args) => result(designGuidance(system, args)));

  server.registerTool('get_component_code', {
    description: 'Get a usage example, exact current CSS excerpt, source bindings, and recommendations for a DLS component. Use search_components for IDs and variants. Examples need the existing stylesheet and host behavior; they are not standalone React components.',
    annotations: READ_ONLY,
    inputSchema: z.object({
      componentId: z.string().min(1).max(80),
      variant: z.string().min(1).max(80).optional()
    }).strict()
  }, async (args) => {
    try {
      return result(componentCode(system, args));
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const system = loadDesignSystem();
    const server = createServer(system);
    await server.connect(new StdioServerTransport());
    console.error(`DLS Magician MCP ${system.metadata.mcpVersion} ready on stdio (read-only).`);
  } catch (error) {
    console.error(`DLS Magician MCP could not start: ${error.message}`);
    process.exitCode = 1;
  }
}
