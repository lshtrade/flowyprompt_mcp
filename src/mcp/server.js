// src/mcp/server.js
// MCP Server implementation with stdio transport

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logger.js';
import config from '../config/index.js';
import promptsListTool, { getPromptsListData } from './tools/promptsList.js';
import promptsGetTool from './tools/promptsGet.js';
import getVariableSets from './tools/getVariableSets.js';
import metricsService from '../services/metricsService.js';

/**
 * Initialize and start MCP server with stdio transport
 */
export async function startMcpServer() {
  const server = new Server(
    {
      name: config.mcp.serverName,
      version: config.mcp.serverVersion,
    },
    {
      capabilities: {
        prompts: {},
        tools: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.info('Handling list_tools request', {}, 'McpServer');
    return {
      tools: [
        {
          name: 'prompts_list',
          description: 'List all available prompt templates from GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
            },
          },
        },
        {
          name: 'prompts_get',
          description: 'Get a specific prompt template with variable substitution',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Template name (without .json extension)',
              },
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
              variables: {
                type: 'object',
                description: 'Variable values for template substitution',
                additionalProperties: {
                  type: 'string',
                },
              },
            },
            required: ['name'],
          },
        },
        {
          name: 'health_check',
          description: 'Check MCP server health and configuration status',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_metrics',
          description: 'Get server performance and usage metrics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_variable_sets',
          description: 'Get variable value sets for a template (pre-filled variable combinations)',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Template name (without .json extension)',
              },
              setName: {
                type: 'string',
                description: 'Specific variable set name to get filled template (optional)',
              },
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
            },
            required: ['name'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    log.info('Handling call_tool request', { tool: request.params.name }, 'McpServer');
    
    switch (request.params.name) {
      case 'prompts_list':
        return await promptsListTool(request.params.arguments || {});
      
      case 'prompts_get':
        return await promptsGetTool(request.params.arguments || {});
      
      case 'health_check':
        const healthData = {
          status: 'healthy',
          server: {
            name: config.mcp.serverName,
            version: config.mcp.serverVersion,
          },
          config: {
            githubRepo: config.githubRepoUrl,
            githubRef: config.githubRef,
            cacheType: config.cacheType,
            cacheTtlMs: config.cacheTtlMs,
          },
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(healthData, null, 2),
            }
          ],
          isError: false,
        };
      
      case 'get_metrics':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metricsService.getMetrics(), null, 2),
            }
          ],
          isError: false,
        };

      case 'get_variable_sets':
        return await getVariableSets(request.params.arguments || {});

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  });

  // Register prompt handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    log.info('Handling list_prompts request', {}, 'McpServer');

    try {
      // Use internal data function directly (returns raw array)
      const prompts = await getPromptsListData('main');

      // Debug logging
      log.info('Prompts list result', {
        isArray: Array.isArray(prompts),
        count: prompts.length
      }, 'McpServer');

      // Convert to prompts list format
      return {
        prompts: prompts.map((template) => ({
          name: template.name,
          description: template.description || `Prompt template: ${template.name}`,
          arguments: template.arguments || [],
        })),
      };
    } catch (error) {
      log.error('Error in list_prompts handler', error, {}, 'McpServer');
      throw error;
    }
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    log.info('Handling get_prompt request', { name: request.params.name }, 'McpServer');

    // Delegate to prompts_get tool with arguments
    const result = await promptsGetTool({
      name: request.params.name,
      variables: request.params.arguments || {},
    });

    return {
      description: result.description || `Generated prompt: ${request.params.name}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: result.content,
          },
        },
      ],
    };
  });

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log.info('MCP Server started', {
    name: config.mcp.serverName,
    version: config.mcp.serverVersion,
    transport: 'stdio',
  }, 'McpServer');

  return server;
}

export default { startMcpServer };
