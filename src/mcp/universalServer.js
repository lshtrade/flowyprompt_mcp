// src/mcp/universalServer.js
// Universal MCP Server supporting multiple transport layers

import { startMcpServer } from './server.js';
import { startHttpServer } from './httpServer.js';
import { log } from '../utils/logger.js';

// Mock config for universal server (avoid validation errors)
const mockConfig = {
  httpPort: 3001,
  mcp: {
    serverName: 'flowyprompt-mcp-server',
    serverVersion: '1.0.0'
  }
};

/**
 * Universal MCP Server Factory
 * Creates appropriate server based on transport type
 */
export function createServer(transportType = 'stdio', options = {}) {
  const transport = transportType.toLowerCase();

  switch (transport) {
    case 'stdio':
      log.info('Starting MCP Server with STDIO transport', {}, 'UniversalServer');
      return startMcpServer();

    case 'http':
      log.info('Starting MCP Server with HTTP transport', {
        port: options.port || mockConfig.httpPort || 3001
      }, 'UniversalServer');
      return startHttpServer(options.port || mockConfig.httpPort || 3001);

    default:
      throw new Error(`Unsupported transport type: ${transportType}. Supported: stdio, http`);
  }
}

/**
 * Detect transport type from environment and start appropriate server
 */
export function startUniversalServer() {
  // Check for transport type in environment or use default
  const transportType = process.env.MCP_TRANSPORT ||
                       process.argv.find(arg => arg.startsWith('--transport='))?.split('=')[1] ||
                       'stdio';

  const options = {};

  // Extract port from command line or environment
  if (transportType !== 'stdio') {
    options.port = process.env.PORT ||
                   process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ||
                   mockConfig.httpPort || 3001;
  }

  try {
    const server = createServer(transportType, options);

    log.info('Universal MCP Server started successfully', {
      transport: transportType,
      port: options.port,
      serverName: mockConfig.mcp.serverName,
      version: mockConfig.mcp.serverVersion
    }, 'UniversalServer');

    return server;
  } catch (error) {
    log.error('Failed to start Universal MCP Server', error, {
      transport: transportType,
      port: options.port
    }, 'UniversalServer');

    throw error;
  }
}

/**
 * Get platform-specific configuration for different MCP clients
 */
export function getPlatformConfig() {
  return {
    claudeDesktop: {
      stdio: {
        command: 'node',
        args: [process.argv[1], '--transport=stdio'],
        env: {}
      },
      http: {
        command: 'node',
        args: [process.argv[1], '--transport=http', `--port=${mockConfig.httpPort || 3001}`],
        env: {}
      }
    },

    claudeCode: {
      stdio: {
        command: 'node',
        args: [process.argv[1], '--transport=stdio'],
        env: {}
      },
      http: {
        command: 'node',
        args: [process.argv[1], '--transport=http', `--port=${mockConfig.httpPort || 3001}`],
        env: {}
      }
    },

    chatgpt: {
      http: {
        url: `http://localhost:${mockConfig.httpPort || 3001}`,
        endpoints: {
          tools: '/tools',
          execute: '/tools/:toolName',
          health: '/health'
        }
      }
    },

    opencode: {
      http: {
        url: `http://localhost:${mockConfig.httpPort || 3001}`,
        endpoints: {
          tools: '/tools',
          execute: '/tools/:toolName',
          health: '/health'
        }
      }
    }
  };
}

/**
 * Generate configuration files for different platforms
 */
export function generatePlatformConfigs() {
  const platformConfig = getPlatformConfig();

  return {
    'claude-desktop.json': {
      mcpServers: {
        flowyprompt: platformConfig.claudeDesktop.stdio
      }
    },

    'claude-desktop-http.json': {
      mcpServers: {
        flowyprompt: platformConfig.claudeDesktop.http
      }
    },

    'chatgpt-config.json': {
      name: 'FlowyPrompt',
      description: 'FlowyPrompt template and flow management',
      baseUrl: platformConfig.chatgpt.http.url,
      endpoints: platformConfig.chatgpt.http.endpoints,
      authentication: 'none'
    },

    'opencode-config.json': {
      name: 'FlowyPrompt MCP',
      baseUrl: platformConfig.opencode.http.url,
      endpoints: platformConfig.opencode.http.endpoints,
      version: mockConfig.mcp.serverVersion
    }
  };
}

export default {
  createServer,
  startUniversalServer,
  getPlatformConfig,
  generatePlatformConfigs
};