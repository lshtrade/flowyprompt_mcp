// src/mcp/httpServer.js
// HTTP Streamable MCP Server implementation

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { log } from '../utils/logger.js';
import promptsListTool from './tools/promptsList.js';

// Mock config for HTTP server (avoid validation errors)
const mockConfig = {
  httpPort: 3001,
  mcp: {
    serverName: 'flowyprompt-mcp-server',
    serverVersion: '1.0.0'
  }
};

import getVariableSets from './tools/getVariableSets.js';
import flowsListTool from './tools/flowsList.js';
import flowsShowTool from './tools/flowsShow.js';

/**
 * Initialize and start MCP server with HTTP transport (streamable responses)
 */
export function startHttpServer(port = mockConfig.httpPort || 3001) {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*', // Allow all origins for cross-platform compatibility
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Cache-Control']
  }));
  app.use(express.json());

  // Create MCP server
  const server = new Server(
    {
      name: mockConfig.mcp.serverName,
      version: mockConfig.mcp.serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool handlers (same as stdio version)
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    log.info('Handling list_tools request via HTTP', {}, 'HttpMcpServer');
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
          name: 'health_check',
          description: 'Check MCP server health and configuration status',
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
    log.info('Handling call_tool request via HTTP', { tool: request.params.name }, 'HttpMcpServer');

    switch (request.params.name) {
      case 'prompts_list':
        return await promptsListTool(request.params.arguments || {});

      case 'health_check':
        const healthData = {
          status: 'healthy',
          server: {
            name: mockConfig.mcp.serverName,
            version: mockConfig.mcp.serverVersion,
            transport: 'http'
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

  // HTTP Routes

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: mockConfig.mcp.serverName,
      version: mockConfig.mcp.serverVersion,
      transport: 'http',
      timestamp: new Date().toISOString()
    });
  });

  // MCP tools endpoint
  app.post('/tools/:toolName', async (req, res) => {
    try {
      const { toolName } = req.params;
      const result = await server.request(
        { method: 'tools/call', params: { name: toolName, arguments: req.body } },
        { tool: toolName, arguments: req.body }
      );

      res.json(result);
    } catch (error) {
      log.error('HTTP tool execution error', error, { toolName }, 'HttpMcpServer');
      res.status(500).json({
        error: true,
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      });
    }
  });

  // List tools endpoint
  app.get('/tools', async (req, res) => {
    try {
      const result = await server.request(
        { method: 'tools/list', params: {} },
        {}
      );
      res.json(result);
    } catch (error) {
      log.error('HTTP tools list error', error, {}, 'HttpMcpServer');
      res.status(500).json({
        error: true,
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      });
    }
  });

  
  // Start HTTP server
  const httpServer = app.listen(port, () => {
    log.info('HTTP MCP Server started', {
      name: mockConfig.mcp.serverName,
      version: mockConfig.mcp.serverVersion,
      port,
      transport: 'http',
      endpoints: {
        health: `http://localhost:${port}/health`,
        tools: `http://localhost:${port}/tools`,
        toolExecution: `http://localhost:${port}/tools/:toolName`
      }
    }, 'HttpMcpServer');
  });

  return { app, server, httpServer };
}

export default { startHttpServer };