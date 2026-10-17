#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

// Generate paths for the machine where this script is run. Do not overwrite a
// host's existing configuration: merge this entry into its mcpServers object.
console.log(JSON.stringify({
  mcpServers: {
    'dls-magician': {
      command: process.execPath,
      args: [fileURLToPath(new URL('./server.mjs', import.meta.url))]
    }
  }
}, null, 2));
