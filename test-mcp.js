#!/usr/bin/env node

// Test MCP server directly
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMcpServer() {
  console.log('Starting MCP server test...\n');

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['index.js'],
    env: {
      GITHUB_PAT: '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',
      GITHUB_REPO_URL: 'https://github.com/lshtrade/test',
      GITHUB_REF: 'main',
      LOG_LEVEL: 'error'
    }
  });

  // Create MCP client
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log('✓ Connected to MCP server\n');

    // List tools
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log(`✓ Found ${tools.tools.length} tools\n`);

    // Call flows_list
    console.log('Calling flows_list...');
    const result = await client.callTool('flows_list', {});
    console.log('✓ flows_list result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
  }
}

testMcpServer().catch(console.error);
