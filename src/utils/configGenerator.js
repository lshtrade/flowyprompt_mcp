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
 * Generate platform configurations (stdio transport only)
 */
function generatePlatformConfigs() {
  return {
    'claude-desktop.json': {
      mcpServers: {
        flowyprompt: {
          command: 'node',
          args: [scriptPath],
          env: {}
        }
      }
    }
  };
}

/**
 * Generate platform-specific configuration files (stdio transport only)
 */
export function generateConfigFiles(outputDir = process.cwd()) {
  const configs = generatePlatformConfigs();
  const generatedFiles = [];

  try {
    // Claude Desktop configuration (STDIO only)
    const claudeDesktopPath = join(outputDir, 'claude-desktop.json');
    writeFileSync(claudeDesktopPath, JSON.stringify(configs['claude-desktop.json'], null, 2));
    generatedFiles.push({
      platform: 'Claude Desktop',
      file: 'claude-desktop.json',
      path: claudeDesktopPath
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
 * Generate usage instructions for Claude Desktop (stdio transport only)
 */
export function generateUsageInstructions(outputDir = process.cwd()) {
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
      }
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
      markdown += '\n### Configuration\n';
      markdown += `- **Config File**: ${info.stdio.file}\n`;
      markdown += `- **Transport**: ${info.stdio.transport}\n`;
      markdown += `- **Description**: ${info.stdio.description}\n`;
    }

    markdown += '\n';
  });

  // Add troubleshooting section
  markdown += `## Troubleshooting\n\n`;
  markdown += `### Common Issues\n`;
  markdown += `1. **MCP Server Not Appearing**: Check that the config file path is correct and restart Claude Desktop\n`;
  markdown += `2. **Connection Issues**: Ensure the server starts without errors by running \`node index.js\`\n`;
  markdown += `3. **Configuration Errors**: Verify all required environment variables are set in the config file\n\n`;

  markdown += `### Testing the Server\n`;
  markdown += `- **Manual Test**: Run \`node index.js\` to verify the server starts without errors\n`;
  markdown += `- **Health Check**: Use the \`health_check\` tool in Claude Desktop\n`;
  markdown += `- **List Tools**: Use the \`prompts_list\` tool to verify GitHub connectivity\n\n`;

  markdown += `### Environment Variables\n`;
  markdown += `- \`GITHUB_PAT\`: GitHub Personal Access Token (required)\n`;
  markdown += `- \`GITHUB_REPO_URL\`: GitHub repository URL (required)\n`;
  markdown += `- \`GITHUB_REF\`: Git reference (default: main)\n`;
  markdown += `- \`MCP_SERVER_NAME\`: Server name (default: flowyprompt-mcp-server)\n`;
  markdown += `- \`MCP_SERVER_VERSION\`: Server version (default: 1.0.0)\n\n`;

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