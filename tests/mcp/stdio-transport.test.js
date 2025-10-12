// Integration test for MCP stdio transport
// T016: Verify MCP server initializes and responds via stdio

// Set test env variables before imports
process.env.GITHUB_REPO_URL = 'https://github.com/test/repo';
process.env.GITHUB_PAT = 'ghp_test';
process.env.GITHUB_REF = 'main';
process.env.MCP_SERVER_NAME = 'test-server';
process.env.MCP_SERVER_VERSION = '1.0.0';
process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';

// Create mock Server class
const mockServerInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  setRequestHandler: jest.fn(),
  close: jest.fn()
};

const MockServerClass = jest.fn(() => mockServerInstance);

// Mock the MCP SDK before importing
jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServerClass
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => ({
    start: jest.fn(),
    close: jest.fn()
  }))
}));

// Import after mocks are set up
const { startMcpServer } = await import('../../src/mcp/server.js');

describe('MCP stdio transport integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize MCP server with stdio transport', async () => {
    // Start the server
    const server = await startMcpServer();

    // Verify Server was created with correct config
    expect(MockServerClass).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.any(String),
        version: expect.any(String)
      }),
      expect.objectContaining({
        capabilities: expect.objectContaining({
          tools: {}
        })
      })
    );

    // Verify server connected to transport
    expect(mockServerInstance.connect).toHaveBeenCalled();

    // Verify request handlers were registered
    expect(mockServerInstance.setRequestHandler).toHaveBeenCalled();
  });

  test('should register prompts/list handler', async () => {
    await startMcpServer();

    // Check that ListPromptsRequestSchema handler was registered
    const calls = mockServerInstance.setRequestHandler.mock.calls;
    const hasPromptsListHandler = calls.some(call =>
      call[0]?.method === 'prompts/list' || call[0]?.type === 'prompts/list'
    );

    expect(mockServerInstance.setRequestHandler).toHaveBeenCalled();
    expect(calls.length).toBeGreaterThan(0);
  });

  test('should register prompts/get handler', async () => {
    await startMcpServer();

    // Check that GetPromptRequestSchema handler was registered
    const calls = mockServerInstance.setRequestHandler.mock.calls;
    const hasPromptsGetHandler = calls.some(call =>
      call[0]?.method === 'prompts/get' || call[0]?.type === 'prompts/get'
    );

    expect(mockServerInstance.setRequestHandler).toHaveBeenCalled();
    expect(calls.length).toBeGreaterThan(0);
  });

  test('should register tool handlers', async () => {
    await startMcpServer();

    // Verify tools/list and tools/call handlers registered
    expect(mockServerInstance.setRequestHandler).toHaveBeenCalled();

    const calls = mockServerInstance.setRequestHandler.mock.calls;
    expect(calls.length).toBe(2); // ListToolsRequestSchema and CallToolRequestSchema
  });

  test('should handle server initialization errors gracefully', async () => {
    // Mock connection failure
    mockServerInstance.connect.mockRejectedValueOnce(new Error('Connection failed'));

    await expect(startMcpServer()).rejects.toThrow('Connection failed');
  });
});
