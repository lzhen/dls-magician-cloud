import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const client = new Client({ name: 'dls-magician-internal-demo', version: '0.1.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('./server.mjs', import.meta.url))],
  // Prove the server does not depend on the caller's working directory.
  cwd: tmpdir(),
  stderr: 'pipe'
});

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    if (response.isError) throw new Error(JSON.stringify(response.content));
    return response.structuredContent ?? JSON.parse(response.content[0].text);
  };
  const search = await call('search_components', { query: '创建任务' });
  const guidance = await call('get_design_guidance', { section: 'all' });
  const dialog = await call('get_component_code', { componentId: 'dialog' });
  const input = await call('get_component_code', { componentId: 'input' });
  const button = await call('get_component_code', { componentId: 'button', variant: 'primary' });
  console.log(JSON.stringify({
    task: 'Find DLS components for a create-task dialog and retrieve their real design-system bindings.',
    transport: 'stdio',
    tools: tools.map(({ name }) => name),
    metadata: guidance.metadata,
    searchMatches: search.components.map(({ id }) => id),
    tokenCount: Object.values(guidance.tokens).reduce((count, group) => count + Object.keys(group).length, 0),
    examples: [dialog, input, button].map((item) => ({
      ...item.component,
      html: item.example,
      source: item.sourceBindings[0],
      stylesheet: item.stylesheet
    })),
    hostWorkRemaining: 'Compose the returned markup, wire submit/cancel, validate form data, and implement dialog focus management.'
  }, null, 2));
} finally {
  await client.close();
}
