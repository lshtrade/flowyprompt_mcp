// Contract tests for prompts/list
// Based on contracts/prompts-list.json
// Test cases: TC-LIST-001 through TC-LIST-005

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
  listTemplates: jest.fn(),
  fetchFile: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};

const mockMetricsService = {
  recordMcpTool: jest.fn(),
  recordError: jest.fn()
};

// Mock modules before importing the tool
jest.unstable_mockModule('../../src/services/githubService.js', () => ({
  default: mockGithubService
}));

jest.unstable_mockModule('../../src/services/cacheService.js', () => ({
  default: mockCacheService
}));

jest.unstable_mockModule('../../src/services/metricsService.js', () => ({
  default: mockMetricsService
}));

// Now import the tool after mocks are set up
const { getPromptsListData } = await import('../../src/mcp/tools/promptsList.js');

describe('MCP Tool: prompts/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // T006: TC-LIST-001 - Success case
  test('should return list of templates with metadata', async () => {
    // Mock GitHub response
    const mockTemplates = [
      { name: 'Brand_Positioning_Strategy', size: 5000, sha: 'abc123' },
      { name: 'AI_Analysis_Report', size: 3000, sha: 'def456' }
    ];

    const mockTemplate1 = {
      metadata: {
        name: 'Brand_Positioning_Strategy',
        description: 'Develop comprehensive brand positioning strategy',
        version: '1.0.0',
        tags: ['marketing', 'strategy']
      },
      variables: [
        { name: 'company_name', description: 'Company or brand name', required: true },
        { name: 'industry', description: 'Industry sector', required: true }
      ],
      results: [{ name: 'section1', content: '{{company_name}} in {{industry}}' }]
    };

    const mockTemplate2 = {
      metadata: {
        name: 'AI_Analysis_Report',
        description: 'Generate AI technology analysis report',
        version: '1.0.0'
      },
      variables: [
        { name: 'technology', description: 'AI technology to analyze', required: true }
      ],
      results: [{ name: 'section1', content: '{{technology}} analysis' }]
    };

    mockGithubService.listTemplates.mockResolvedValue(mockTemplates);
    mockGithubService.fetchFile
      .mockResolvedValueOnce({ content: mockTemplate1, etag: 'etag1' })
      .mockResolvedValueOnce({ content: mockTemplate2, etag: 'etag2' });
    mockCacheService.get.mockResolvedValue(null); // No cache
    mockCacheService.set.mockResolvedValue(true);

    // Execute
    const result = await getPromptsListData('main');

    // Verify
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(2);

    // Check first template
    expect(result[0]).toMatchObject({
      name: 'Brand_Positioning_Strategy',
      description: 'Develop comprehensive brand positioning strategy'
    });
    expect(result[0].arguments).toBeInstanceOf(Array);
    expect(result[0].arguments).toHaveLength(2);

    // Verify GitHub service was called
    expect(mockGithubService.listTemplates).toHaveBeenCalledWith('main');
    expect(mockGithubService.fetchFile).toHaveBeenCalledTimes(2);
  });

  // T007: TC-LIST-005 - Authentication failure
  test('should handle GitHub authentication failure', async () => {
    // Mock auth error
    const authError = new Error('Bad credentials');
    authError.code = 'GITHUB_AUTH_FAILED';

    mockGithubService.listTemplates.mockRejectedValue(authError);
    mockCacheService.get.mockResolvedValue(null);

    // Execute and verify error
    await expect(getPromptsListData('main')).rejects.toThrow('Bad credentials');
  });

  // T008: Network error handling
  test('should handle network errors', async () => {
    // Mock network error
    const networkError = new Error('ENOTFOUND api.github.com');
    networkError.code = 'NETWORK_ERROR';

    mockGithubService.listTemplates.mockRejectedValue(networkError);
    mockCacheService.get.mockResolvedValue(null);

    // Execute and verify error
    await expect(getPromptsListData('main')).rejects.toThrow('ENOTFOUND');
  });

  // T009: TC-LIST-003 - Cache hit
  test('should use cache on repeated calls', async () => {
    const cachedData = [
      {
        name: 'Cached_Template',
        description: 'From cache',
        arguments: []
      }
    ];

    mockCacheService.get.mockResolvedValue(cachedData);

    const startTime = Date.now();
    const result = await getPromptsListData('main');
    const elapsed = Date.now() - startTime;

    // Verify cached data returned
    expect(result).toEqual(cachedData);

    // Verify fast response (< 300ms)
    expect(elapsed).toBeLessThan(300);

    // Verify GitHub was NOT called
    expect(mockGithubService.listTemplates).not.toHaveBeenCalled();
  });

  // Additional: Empty repository
  test('should handle empty repository gracefully', async () => {
    mockGithubService.listTemplates.mockResolvedValue([]);
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);

    const result = await getPromptsListData('main');

    expect(result).toEqual([]);
  });
});
