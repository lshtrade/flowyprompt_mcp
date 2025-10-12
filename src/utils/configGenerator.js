// src/utils/configGenerator.js
// Configuration file generator for different platforms

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Mock config for config generation (avoid validation errors)
const mockConfig = {
  httpPort: 3001,
  mcp: {
    serverName: 'flowyprompt-mcp-server',
    serverVersion: '1.0.0'
  }
};

// Get current script path for configuration
const scriptPath = process.argv[1] || './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple logger for config generation (avoid circular dependency)
const mockLogger = {
  info: (message, data, context) => {
    console.log(`[${context || 'configGenerator'}] ${message}`, data || '');
  },
  error: (message, error, data, context) => {
    console.error(`[${context || 'configGenerator'}] ${message}`, error, data || '');
  }
};

/**
 * Generate platform configurations (local implementation)
 */
function generatePlatformConfigs() {
  return {
    'claude-desktop.json': {
      mcpServers: {
        flowyprompt: {
          command: 'node',
          args: [scriptPath, '--transport=stdio'],
          env: {}
        }
      }
    },

    'claude-desktop-http.json': {
      mcpServers: {
        flowyprompt: {
          command: 'node',
          args: [scriptPath, '--transport=http', `--port=${mockConfig.httpPort}`],
          env: {}
        }
      }
    },

    'chatgpt-config.json': {
      name: 'FlowyPrompt',
      description: 'FlowyPrompt template and flow management',
      baseUrl: `http://localhost:${mockConfig.httpPort}`,
      endpoints: {
        tools: '/tools',
        execute: '/tools/:toolName',
        health: '/health'
      },
      authentication: 'none'
    },

    'opencode-config.json': {
      name: 'FlowyPrompt MCP',
      baseUrl: `http://localhost:${mockConfig.httpPort}`,
      endpoints: {
        tools: '/tools',
        execute: '/tools/:toolName',
        health: '/health'
      },
      version: mockConfig.mcp.serverVersion
    }
  };
}

/**
 * Generate platform-specific configuration files
 */
export function generateConfigFiles(outputDir = process.cwd()) {
  const configs = generatePlatformConfigs();
  const generatedFiles = [];

  try {
    // Claude Desktop configuration (STDIO)
    const claudeDesktopPath = join(outputDir, 'claude-desktop.json');
    writeFileSync(claudeDesktopPath, JSON.stringify(configs['claude-desktop.json'], null, 2));
    generatedFiles.push({
      platform: 'Claude Desktop (STDIO)',
      file: 'claude-desktop.json',
      path: claudeDesktopPath
    });

    // Claude Desktop configuration (HTTP)
    const claudeDesktopHttpPath = join(outputDir, 'claude-desktop-http.json');
    writeFileSync(claudeDesktopHttpPath, JSON.stringify(configs['claude-desktop-http.json'], null, 2));
    generatedFiles.push({
      platform: 'Claude Desktop (HTTP)',
      file: 'claude-desktop-http.json',
      path: claudeDesktopHttpPath
    });

    // ChatGPT configuration
    const chatgptPath = join(outputDir, 'chatgpt-config.json');
    writeFileSync(chatgptPath, JSON.stringify(configs['chatgpt-config.json'], null, 2));
    generatedFiles.push({
      platform: 'ChatGPT',
      file: 'chatgpt-config.json',
      path: chatgptPath
    });

    // OpenCode configuration
    const opencodePath = join(outputDir, 'opencode-config.json');
    writeFileSync(opencodePath, JSON.stringify(configs['opencode-config.json'], null, 2));
    generatedFiles.push({
      platform: 'OpenCode',
      file: 'opencode-config.json',
      path: opencodePath
    });

    mockLogger.info('Platform configuration files generated', {
      outputDir,
      filesCount: generatedFiles.length
    }, 'configGenerator');

    return generatedFiles;
  } catch (error) {
    mockLogger.error('Failed to generate configuration files', error, { outputDir }, 'configGenerator');
    throw error;
  }
}

/**
 * Generate usage instructions for different platforms
 */
export function generateUsageInstructions(outputDir = process.cwd()) {
  const port = mockConfig.httpPort || 3001;
  const baseUrl = `http://localhost:${port}`;

  const instructions = {
    claudeDesktop: {
      title: 'Claude Desktop Configuration',
      instructions: [
        '1. Copy claude-desktop.json to ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)',
        '2. Or copy to %APPDATA%/Claude/claude_desktop_config.json (Windows)',
        '3. Restart Claude Desktop',
        '4. The FlowyPrompt MCP server will be available in Claude Desktop'
      ],
      stdio: {
        file: 'claude-desktop.json',
        transport: 'STDIO',
        description: 'Direct MCP communication via standard input/output'
      },
      http: {
        file: 'claude-desktop-http.json',
        transport: 'HTTP',
        description: 'MCP communication via HTTP endpoints'
      }
    },

    claudeCode: {
      title: 'Claude Code Configuration',
      instructions: [
        '1. Add the following to your Claude Code settings:',
        '   - For STDIO: Use the stdio command from claude-desktop.json',
        '   - For HTTP: Use the HTTP endpoints directly',
        '2. Restart Claude Code',
        '3. FlowyPrompt tools will be available in Claude Code'
      ],
      stdio: {
        command: 'node index.js --transport=stdio',
        description: 'Start server with STDIO transport'
      },
      http: {
        baseUrl,
        endpoints: {
          tools: `${baseUrl}/tools`,
          execute: `${baseUrl}/tools/:toolName`,
          health: `${baseUrl}/health`
        }
      }
    },

    chatgpt: {
      title: 'ChatGPT Integration',
      instructions: [
        '1. Use the HTTP API endpoints directly',
        '2. POST requests to /tools/:toolName for tool execution',
        '3. GET requests to /tools for available tools'
      ],
      baseUrl,
      endpoints: {
        tools: `${baseUrl}/tools`,
        execute: `${baseUrl}/tools/:toolName`,
        health: `${baseUrl}/health`
      }
    },

    opencode: {
      title: 'OpenCode Integration',
      instructions: [
        '1. Use the HTTP API endpoints',
        '2. Configure OpenCode to use the HTTP endpoints',
        '3. Tools available via REST API calls'
      ],
      baseUrl,
      config: 'opencode-config.json'
    }
  };

  const usageGuidePath = join(outputDir, 'PLATFORM_SETUP.md');
  let markdown = '# FlowyPrompt MCP Platform Setup Guide\n\n';

  Object.entries(instructions).forEach(([platform, info]) => {
    markdown += `## ${info.title}\n\n`;
    info.instructions.forEach(instruction => {
      markdown += `${instruction}\n`;
    });

    if (info.stdio) {
      markdown += '\n### STDIO Configuration\n';
      markdown += `- **Config File**: ${info.stdio.file}\n`;
      markdown += `- **Transport**: ${info.stdio.transport}\n`;
      if (info.stdio.command) {
        markdown += `- **Command**: ${info.stdio.command}\n`;
      }
      markdown += `- **Description**: ${info.stdio.description}\n`;
    }

    if (info.http) {
      markdown += '\n### HTTP Configuration\n';
      markdown += `- **Config File**: ${info.http.file}\n`;
      markdown += `- **Transport**: ${info.http.transport}\n`;
      markdown += `- **Description**: ${info.http.description}\n`;
    }

    if (info.endpoints) {
      markdown += '\n### API Endpoints\n';
      Object.entries(info.endpoints).forEach(([name, url]) => {
        markdown += `- **${name}**: ${url}\n`;
      });
    }

    if (info.baseUrl) {
      markdown += `- **Base URL**: ${info.baseUrl}\n`;
    }

    markdown += '\n';
  });

  // Add troubleshooting section
  markdown += `## Troubleshooting\n\n`;
  markdown += `### Common Issues\n`;
  markdown += `1. **Port already in use**: Change the port using \`PORT=3002 node index.js --transport=http\`\n`;
  markdown += `2. **CORS issues**: The HTTP server includes CORS headers for all origins\n`;
  markdown += `3. **Connection timeouts**: Ensure the server is running before configuring clients\n\n`;

  markdown += `### Testing the Server\n`;
  markdown += `- **Health Check**: GET ${baseUrl}/health\n`;
  markdown += `- **List Tools**: GET ${baseUrl}/tools\n`;
  markdown += `- **Test Tool**: POST ${baseUrl}/tools/health_check\n\n`;

  markdown += `### Environment Variables\n`;
  markdown += `- \`MCP_TRANSPORT\`: Set to "stdio" or "http" (default: "stdio")\n`;
  markdown += `- \`PORT\`: Set HTTP server port (default: 3001)\n`;
  markdown += `- \`HTTP_PORT\`: Alternative port setting (default: 3001)\n\n`;

  try {
    writeFileSync(usageGuidePath, markdown);
    mockLogger.info('Usage instructions generated', { file: usageGuidePath }, 'configGenerator');
    return usageGuidePath;
  } catch (error) {
    mockLogger.error('Failed to generate usage instructions', error, { file: usageGuidePath }, 'configGenerator');
    throw error;
  }
}

/**
 * Generate all configuration files and documentation
 */
export function generateAllConfigs(outputDir = process.cwd()) {
  try {
    const configFiles = generateConfigFiles(outputDir);
    const usageGuide = generateUsageInstructions(outputDir);

    mockLogger.info('All configuration files generated successfully', {
      outputDir,
      configFilesCount: configFiles.length,
      usageGuide
    }, 'configGenerator');

    return {
      configFiles,
      usageGuide
    };
  } catch (error) {
    mockLogger.error('Failed to generate configurations', error, { outputDir }, 'configGenerator');
    throw error;
  }
}

export default {
  generateConfigFiles,
  generateUsageInstructions,
  generateAllConfigs
};