// Contract tests for prompts/get
// Based on contracts/prompts-get.json
// Test cases: TC-GET-001 through TC-GET-008

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
  fetchFile: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};

const mockMetricsService = {
  recordMcpTool: jest.fn(),
  recordError: jest.fn(),
  recordPromptGeneration: jest.fn(),
  recordRequest: jest.fn()
};

// Mock modules before importing
jest.unstable_mockModule('../../src/services/githubService.js', () => ({
  default: mockGithubService
}));

jest.unstable_mockModule('../../src/services/cacheService.js', () => ({
  default: mockCacheService
}));

jest.unstable_mockModule('../../src/services/metricsService.js', () => ({
  default: mockMetricsService
}));

// Import after mocks are set up
const promptsGetToolModule = await import('../../src/mcp/tools/promptsGet.js');
const promptsGetTool = promptsGetToolModule.default;

describe('MCP Tool: prompts/get', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // T010: TC-GET-001 - Successful prompt generation
  test('should generate prompt with all variables substituted', async () => {
    const templateContent = 'Company: {company_name}, Industry: {industry}';
    const mockTemplate = {
      metadata: {
        name: 'Brand_Positioning_Strategy',
        description: '브랜드 포지셔닝 전략 수립',
        version: '1.0.0',
        tags: ['marketing']
      },
      variables: [
        { name: 'company_name', required: true },
        { name: 'industry', required: true }
      ],
      results: [
        { name: 's1', content: templateContent }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(true);

    const result = await promptsGetTool({
      name: 'Brand_Positioning_Strategy',
      variables: {
        company_name: '테크스타트업',
        industry: 'AI'
      }
    });

    // Verify response structure
    expect(result.isError).toBe(false);
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('테크스타트업');
    expect(result.content[0].text).toContain('AI');

    // Verify services called correctly
    expect(mockGithubService.fetchFile).toHaveBeenCalledWith(
      'template',
      'Brand_Positioning_Strategy',
      'main'
    );
  });

  // T011: Variable substitution verification
  test('should ensure no placeholders remain after substitution', async () => {
    const mockTemplate = {
      metadata: {
        name: 'Test_Template',
        description: 'Test',
        version: '1.0.0'
      },
      variables: [
        { name: 'var1', required: true },
        { name: 'var2', required: true }
      ],
      results: [
        { name: 's1', content: 'Content: {var1} and {var2}' }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);

    const result = await promptsGetTool({
      name: 'Test_Template',
      variables: { var1: 'Value1', var2: 'Value2' }
    });

    // Verify substitution worked
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toBe('Content: Value1 and Value2');
  });

  // T012: TC-GET-002 - Missing required variable
  test('should handle missing required variable gracefully', async () => {
    const mockTemplate = {
      metadata: {
        name: 'Test_Template',
        description: 'Test',
        version: '1.0.0'
      },
      variables: [
        { name: 'required_var', required: true },
        { name: 'optional_var', required: false }
      ],
      results: [
        { name: 's1', content: 'Required: {required_var}' }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);

    // Missing required_var - should still generate but leave placeholder
    const result = await promptsGetTool({
      name: 'Test_Template',
      variables: { optional_var: 'value' }
    });

    // Should complete but contain unreplaced placeholder
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toContain('{required_var}');
  });

  // T013: TC-GET-003 - Optional variable handling
  test('should handle optional variables gracefully', async () => {
    const mockTemplate = {
      metadata: {
        name: 'Test_Template',
        description: 'Test',
        version: '1.0.0'
      },
      variables: [
        { name: 'required_var', required: true },
        { name: 'optional_var', required: false }
      ],
      results: [
        { name: 's1', content: 'Required: {required_var}, Optional: {optional_var}' }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);

    // Only provide required variable
    const result = await promptsGetTool({
      name: 'Test_Template',
      variables: { required_var: 'Value' }
    });

    // Should not throw error
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toContain('Required: Value');
  });

  // T014: TC-GET-004 - Template not found
  test('should error when template not found', async () => {
    const notFoundError = new Error('Template not found');
    notFoundError.code = 'NOT_FOUND';

    mockGithubService.fetchFile.mockRejectedValue(notFoundError);
    mockCacheService.get.mockResolvedValue(null);

    await expect(
      promptsGetTool({
        name: 'Nonexistent_Template',
        variables: {}
      })
    ).rejects.toThrow('Template not found');
  });

  // T015: Variable type validation (string only)
  test('should handle non-string variable values', async () => {
    const mockTemplate = {
      metadata: {
        name: 'Test_Template',
        description: 'Test',
        version: '1.0.0'
      },
      variables: [
        { name: 'text_var', required: true }
      ],
      results: [
        { name: 's1', content: 'Text: {text_var}' }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);

    // Pass non-string value - should convert to string
    const result = await promptsGetTool({
      name: 'Test_Template',
      variables: { text_var: 123 } // Number instead of string
    });

    // Should convert and substitute
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toContain('123');
  });

  // Additional: Cache usage
  test('should use cached template when available', async () => {
    const mockTemplate = {
      metadata: {
        name: 'Cached_Template',
        description: 'From cache',
        version: '1.0.0'
      },
      variables: [],
      results: [
        { name: 's1', content: 'Cached content' }
      ]
    };

    // Return cached template
    mockCacheService.get.mockResolvedValue(mockTemplate);

    const startTime = Date.now();
    const result = await promptsGetTool({
      name: 'Cached_Template',
      variables: {}
    });
    const elapsed = Date.now() - startTime;

    // Verify used cache
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toBeDefined();
    expect(elapsed).toBeLessThan(300); // Fast response from cache

    // GitHub should NOT be called
    expect(mockGithubService.fetchFile).not.toHaveBeenCalled();
  });

  // Additional: Template with no variables
  test('should handle templates with no variables', async () => {
    const mockTemplate = {
      metadata: {
        name: 'No_Variables_Template',
        description: 'Static template',
        version: '1.0.0'
      },
      variables: [],
      results: [
        { name: 's1', content: 'Static content with no variables' }
      ]
    };

    mockGithubService.fetchFile.mockResolvedValue({ content: mockTemplate, etag: 'etag1' });
    mockCacheService.get.mockResolvedValue(null);

    const result = await promptsGetTool({
      name: 'No_Variables_Template',
      variables: {}
    });

    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].text).toContain('Static content with no variables');
  });
});
