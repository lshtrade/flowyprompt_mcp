// Contract tests for flows/list
// Based on contracts/flows-list.json
// Test cases: TC-FLOW-LIST-001 through TC-FLOW-LIST-005

// Set test env variables before imports
process.env.GITHUB_REPO_URL = 'https://github.com/test/repo';
process.env.GITHUB_PAT = 'ghp_test';
process.env.GITHUB_REF = 'main';
process.env.MCP_SERVER_NAME = 'test';
process.env.MCP_SERVER_VERSION = '1.0.0';
process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';

// Create mock implementations
const mockGithubService = {
  listFlows: jest.fn(),
  fetchFlow: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};

// Mock modules before importing
jest.unstable_mockModule('../../src/services/githubService.js', () => ({
  default: mockGithubService
}));

jest.unstable_mockModule('../../src/services/cacheService.js', () => ({
  default: mockCacheService
}));

// Import after mocks are set up
const flowsListModule = await import('../../src/mcp/tools/flowsList.js');
const flowsList = flowsListModule.default;

describe('MCP Tool: flows/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-FLOW-LIST-001: Successful flow list retrieval
  test('should list flows with full metadata', async () => {
    const mockFlows = [
      {
        name: 'Marketing_Strategy',
        content: {
          metadata: {
            name: 'Marketing_Strategy',
            version: '1.0.0',
            description: 'Multi-step marketing strategy generation flow',
            created: '2025-10-07T00:00:00.000Z',
            updated: '2025-10-07T10:30:00.000Z'
          },
          nodes: [
            { id: 'node-1', type: 'multi_input', data: { label: 'Input' } },
            { id: 'node-2', type: 'template', data: { label: 'Template' } },
            { id: 'node-3', type: 'template', data: { label: 'Template2' } },
            { id: 'node-4', type: 'result', data: { label: 'Output' } }
          ],
          edges: []
        }
      },
      {
        name: 'Content_Pipeline',
        content: {
          metadata: {
            name: 'Content_Pipeline',
            version: '1.2.0',
            description: 'Research to draft to final content flow',
            created: '2025-09-15T00:00:00.000Z',
            updated: '2025-10-01T00:00:00.000Z'
          },
          nodes: [
            { id: 'n1', type: 'multi_input', data: {} },
            { id: 'n2', type: 'template', data: {} },
            { id: 'n3', type: 'template', data: {} },
            { id: 'n4', type: 'template', data: {} },
            { id: 'n5', type: 'result', data: {} }
          ],
          edges: []
        }
      }
    ];

    mockGithubService.listFlows.mockResolvedValue(mockFlows);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);

    const result = await flowsList({ includeMetadata: true });

    expect(result.flows).toHaveLength(2);
    expect(result.flows[0]).toEqual({
      name: 'Marketing_Strategy',
      description: 'Multi-step marketing strategy generation flow',
      version: '1.0.0',
      nodeCount: 4,
      created: '2025-10-07T00:00:00.000Z',
      updated: '2025-10-07T10:30:00.000Z'
    });
    expect(result.flows[1].nodeCount).toBe(5);
    expect(result.cached).toBe(false);

    expect(mockGithubService.listFlows).toHaveBeenCalledWith('main');
  });

  // TC-FLOW-LIST-002: Handle empty flows directory
  test('should handle empty flows directory', async () => {
    mockGithubService.listFlows.mockResolvedValue([]);
    mockCacheService.get.mockResolvedValue(null);

    const result = await flowsList({});

    expect(result.flows).toEqual([]);
    expect(result.cached).toBe(false);
  });

  // TC-FLOW-LIST-003: Handle malformed flow JSON
  test('should skip invalid flows and return valid ones', async () => {
    const mockFlows = [
      {
        name: 'Valid_Flow',
        content: {
          metadata: { name: 'Valid_Flow', version: '1.0.0', description: 'Valid' },
          nodes: [{ id: 'n1', type: 'template', data: { label: 'Test' } }],
          edges: []
        }
      },
      {
        name: 'Invalid_Flow',
        content: null // Malformed
      }
    ];

    mockGithubService.listFlows.mockResolvedValue(mockFlows);
    mockCacheService.get.mockResolvedValue(null);

    const result = await flowsList({});

    // Should skip invalid flow
    expect(result.flows).toHaveLength(1);
    expect(result.flows[0].name).toBe('Valid_Flow');
  });

  // TC-FLOW-LIST-004: Cache hit performance
  test('should return cached result quickly', async () => {
    const cachedFlows = [
      {
        name: 'Cached_Flow',
        description: 'From cache',
        version: '1.0.0',
        nodeCount: 3,
        created: '2025-10-07T00:00:00.000Z',
        updated: '2025-10-07T00:00:00.000Z'
      }
    ];

    mockCacheService.get.mockResolvedValue(cachedFlows);

    const startTime = Date.now();
    const result = await flowsList({});
    const elapsed = Date.now() - startTime;

    expect(result.flows).toEqual(cachedFlows);
    expect(result.cached).toBe(true);
    expect(elapsed).toBeLessThan(300); // Performance target

    // Should NOT call GitHub service when cached
    expect(mockGithubService.listFlows).not.toHaveBeenCalled();
  });

  // TC-FLOW-LIST-005: GitHub API failure handling
  test('should handle GitHub API errors gracefully', async () => {
    const githubError = new Error('GitHub API: 500 Internal Server Error');
    githubError.code = 'GITHUB_ERROR';

    mockGithubService.listFlows.mockRejectedValue(githubError);
    mockCacheService.get.mockResolvedValue(null);

    await expect(flowsList({})).rejects.toThrow('GitHub API: 500 Internal Server Error');
  });

  // Additional: Test without metadata
  test('should return flows without metadata when includeMetadata=false', async () => {
    const mockFlows = [
      {
        name: 'Test_Flow',
        content: {
          metadata: {
            name: 'Test_Flow',
            version: '1.0.0',
            description: 'Test',
            created: '2025-10-07T00:00:00.000Z',
            updated: '2025-10-07T00:00:00.000Z'
          },
          nodes: [{ id: 'n1', type: 'template', data: {} }],
          edges: []
        }
      }
    ];

    mockGithubService.listFlows.mockResolvedValue(mockFlows);
    mockCacheService.get.mockResolvedValue(null);

    const result = await flowsList({ includeMetadata: false });

    expect(result.flows[0]).toEqual({
      name: 'Test_Flow',
      description: 'Test',
      version: '1.0.0',
      nodeCount: 1
    });
    expect(result.flows[0].created).toBeUndefined();
    expect(result.flows[0].updated).toBeUndefined();
  });

  // Additional: Custom ref parameter
  test('should use custom ref when provided', async () => {
    mockGithubService.listFlows.mockResolvedValue([]);
    mockCacheService.get.mockResolvedValue(null);

    await flowsList({ ref: 'develop' });

    expect(mockGithubService.listFlows).toHaveBeenCalledWith('develop');
  });
});
