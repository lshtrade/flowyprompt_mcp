#!/usr/bin/env node

// Entry point for FlowyPrompt MCP Server (stdio transport only)
import { startMcpServer } from './src/mcp/server.js';
import { log } from './src/utils/logger.js';

async function main() {
  try {
    log.info('Starting FlowyPrompt MCP Server', {
      nodeVersion: process.version,
      platform: process.platform,
      args: process.argv.slice(2)
    }, 'main');

    // Start MCP server with stdio transport
    await startMcpServer();

  } catch (error) {
    log.error('Failed to start MCP server', error, {}, 'main');
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down gracefully', {}, 'main');
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down gracefully', {}, 'main');
  process.exit(0);
});

// Start server
main();
