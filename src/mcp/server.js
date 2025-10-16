// src/mcp/server.js
// MCP Server implementation with stdio transport

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logger.js';
import config from '../config/index.js';
import promptsListTool, { getPromptsListData } from './tools/promptsList.js';
import getVariableSets from './tools/getVariableSets.js';
import flowsListTool from './tools/flowsList.js';
import flowsShowTool from './tools/flowsShow.js';
import metricsService from '../services/metricsService.js';
import promptTemplateShowTool from './tools/promptTemplateShow.js';

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
          name: 'prompt_template_show',
          description: 'Show simplified template info (title, template, variables) for a given template JSON',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Template name (without .json extension)'
              },
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
              variables: {
                type: 'string',
                description: 'Set to "true" to include title and variables fields, otherwise only template is returned',
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
        {
          name: 'flows_list',
          description: 'List all available flow templates from GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              includeMetadata: {
                type: 'boolean',
                description: 'Include created/updated timestamps in metadata. Default: true',
              },
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
            },
          },
        },
        {
          name: 'flows_show',
          description: 'Show detailed information about a specific flow including nodes, edges, and execution order',
          inputSchema: {
            type: 'object',
            properties: {
              flowName: {
                type: 'string',
                description: 'Flow name (without .json extension)',
              },
              ref: {
                type: 'string',
                description: 'Git reference (branch/tag/commit). Default: main',
              },
              includePositions: {
                type: 'boolean',
                description: 'Include node position coordinates. Default: false',
              },
            },
            required: ['flowName'],
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
      case 'prompt_template_show':
        return await promptTemplateShowTool(request.params.arguments || {});

      
        
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

      case 'flows_list':
        const flowsListResult = await flowsListTool(request.params.arguments || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(flowsListResult, null, 2),
            }
          ],
          isError: false,
        };

      case 'flows_show':
        const flowsShowResult = await flowsShowTool(request.params.arguments || {});
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(flowsShowResult, null, 2),
            }
          ],
          isError: false,
        };

  
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
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
