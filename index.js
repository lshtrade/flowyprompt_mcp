#!/usr/bin/env node

// Entry point for Universal MCP Server (multiple transports)
import { startUniversalServer, generatePlatformConfigs } from './src/mcp/universalServer.js';
import { log } from './src/utils/logger.js';

async function main() {
  try {
    log.info('Starting Universal FlowyPrompt MCP Server', {
      nodeVersion: process.version,
      platform: process.platform,
      args: process.argv.slice(2)
    }, 'main');

    // Start universal server (auto-detects transport type)
    await startUniversalServer();

    // For HTTP transport, also print configuration help
    const transportType = process.env.MCP_TRANSPORT ||
                         process.argv.find(arg => arg.startsWith('--transport='))?.split('=')[1] ||
                         'stdio';

    if (transportType !== 'stdio') {
      const configs = generatePlatformConfigs();
      log.info('HTTP Server started - Platform configurations available:', {
        claudeDesktop: 'claude-desktop.json',
        claudeDesktopHttp: 'claude-desktop-http.json',
        chatgpt: 'chatgpt-config.json',
        opencode: 'opencode-config.json'
      }, 'main');
    }

  } catch (error) {
    log.error('Failed to start Universal MCP server', error, {}, 'main');
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
