#!/usr/bin/env node

// Entry point for MCP server (stdio transport)
import { startMcpServer } from './src/mcp/server.js';
import { log } from './src/utils/logger.js';

async function main() {
  try {
    log.info('Starting FlowyPrompt MCP Server', {}, 'main');
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
