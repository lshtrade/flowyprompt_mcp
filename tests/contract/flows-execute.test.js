// Contract tests for flows/execute
// Based on contracts/flows-execute.json
// Test cases: TC-FLOW-EXEC-001 through TC-FLOW-EXEC-007

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
  fetchFlow: jest.fn(),
  fetchFile: jest.fn()
};

const mockFlowService = {
  parseFlow: jest.fn(),
  validateFlowSchema: jest.fn(),
  extractTemplateNodes: jest.fn()
};

const mockFlowExecutionService = {
  executeFlow: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};

// Mock modules before importing
jest.unstable_mockModule('../../src/services/githubService.js', () => ({
  default: mockGithubService
}));

jest.unstable_mockModule('../../src/services/flowService.js', () => ({
  default: mockFlowService
}));

jest.unstable_mockModule('../../src/services/flowExecutionService.js', () => ({
  default: mockFlowExecutionService
}));

jest.unstable_mockModule('../../src/services/cacheService.js', () => ({
  default: mockCacheService
}));

// Import after mocks are set up
const flowsExecuteModule = await import('../../src/mcp/tools/flowsExecute.js');
const flowsExecute = flowsExecuteModule.default;

describe('MCP Tool: flows/execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-FLOW-EXEC-001: Successful 2-node flow execution
  test('should execute 2-node flow successfully', async () => {
    const mockFlow = {
      metadata: { name: 'Simple_Chain', version: '1.0.0' },
      nodes: [
        { id: 'input-1', type: 'multi_input', data: { variables: ['topic'] } },
        { id: 'node-1', type: 'template', data: { selectedTemplateId: 'Topic_Analysis' } },
        { id: 'node-2', type: 'template', data: { selectedTemplateId: 'Content_Summarizer' } }
      ],
      edges: []
    };

    const mockExecutionResult = {
      flowName: 'Simple_Chain',
      executionId: 'Simple_Chain_1696680000000',
      intermediateResults: [
        {
          nodeId: 'node-1',
          templateName: 'Topic_Analysis',
          inputVariables: { topic: 'AI in Healthcare' },
          output: 'AI in healthcare is transforming diagnostics...',
          executionTimeMs: 1200,
          timestamp: '2025-10-07T10:30:00.000Z'
        },
        {
          nodeId: 'node-2',
          templateName: 'Content_Summarizer',
          inputVariables: { node1_result: 'AI in healthcare is transforming diagnostics...' },
          output: 'Summary: AI is revolutionizing healthcare diagnostics.',
          executionTimeMs: 800,
          timestamp: '2025-10-07T10:30:01.200Z'
        }
      ],
      finalResult: 'Summary: AI is revolutionizing healthcare diagnostics.',
      totalExecutionTimeMs: 2000,
      status: 'success'
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockResolvedValue(mockExecutionResult);

    const result = await flowsExecute({
      flowName: 'Simple_Chain',
      initialVariables: { topic: 'AI in Healthcare' }
    });

    expect(result.flowName).toBe('Simple_Chain');
    expect(result.intermediateResults).toHaveLength(2);
    expect(result.finalResult).toBe('Summary: AI is revolutionizing healthcare diagnostics.');
    expect(result.status).toBe('success');
    expect(result.totalExecutionTimeMs).toBeLessThan(5000);

    expect(mockGithubService.fetchFlow).toHaveBeenCalledWith('Simple_Chain', 'main');
    expect(mockFlowExecutionService.executeFlow).toHaveBeenCalledWith(
      mockFlow,
      { topic: 'AI in Healthcare' },
      'main'
    );
  });

  // TC-FLOW-EXEC-002: Variable mapping between nodes
  test('should map variables correctly between nodes', async () => {
    const mockFlow = {
      metadata: { name: 'Test_Flow', version: '1.0.0' },
      nodes: [
        { id: 'node-1', type: 'template', data: {} },
        { id: 'node-2', type: 'template', data: {} }
      ],
      edges: [{ id: 'e1', source: 'node-1', target: 'node-2', type: 'chain' }]
    };

    const mockExecutionResult = {
      flowName: 'Test_Flow',
      executionId: 'Test_Flow_1696680000000',
      intermediateResults: [
        {
          nodeId: 'node-1',
          templateName: 'Template_A',
          inputVariables: { input: 'test' },
          output: 'Result from node 1',
          executionTimeMs: 1000,
          timestamp: '2025-10-07T10:30:00.000Z'
        },
        {
          nodeId: 'node-2',
          templateName: 'Template_B',
          inputVariables: { node1_result: 'Result from node 1' },
          output: 'Final result',
          executionTimeMs: 1000,
          timestamp: '2025-10-07T10:30:01.000Z'
        }
      ],
      finalResult: 'Final result',
      totalExecutionTimeMs: 2000,
      status: 'success'
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockResolvedValue(mockExecutionResult);

    const result = await flowsExecute({
      flowName: 'Test_Flow',
      initialVariables: { input: 'test' }
    });

    // Verify node-2 received node1_result variable
    expect(result.intermediateResults[1].inputVariables).toHaveProperty('node1_result');
    expect(result.intermediateResults[1].inputVariables.node1_result).toBe('Result from node 1');
  });

  // TC-FLOW-EXEC-003: Missing initial variables error
  test('should error on missing required variables', async () => {
    const mockFlow = {
      metadata: { name: 'Test_Flow', version: '1.0.0' },
      nodes: [
        {
          id: 'input-1',
          type: 'multi_input',
          data: { variables: ['company', 'market', 'budget'] }
        }
      ],
      edges: []
    };

    const error = new Error('Missing required initial variables: market, budget');
    error.code = 'MISSING_VARIABLES';
    error.details = {
      provided: ['company'],
      required: ['company', 'market', 'budget'],
      missing: ['market', 'budget']
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockRejectedValue(error);

    await expect(
      flowsExecute({
        flowName: 'Test_Flow',
        initialVariables: { company: 'TechCorp' }
      })
    ).rejects.toThrow('Missing required initial variables: market, budget');
  });

  // TC-FLOW-EXEC-004: Template not found mid-flow (partial results)
  test('should return partial results when template not found', async () => {
    const mockFlow = {
      metadata: { name: 'Broken_Flow', version: '1.0.0' },
      nodes: [
        { id: 'node-1', type: 'template', data: {} },
        { id: 'node-2', type: 'template', data: {} }
      ],
      edges: []
    };

    const error = new Error('Template not found: Nonexistent_Template');
    error.code = 'TEMPLATE_NOT_FOUND';
    error.partialResults = [
      {
        nodeId: 'node-1',
        templateName: 'Existing_Template',
        inputVariables: { input: 'test' },
        output: 'Processed: test',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      }
    ];
    error.failedAt = {
      nodeId: 'node-2',
      templateName: 'Nonexistent_Template',
      error: 'Template not found in repository'
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockRejectedValue(error);

    try {
      await flowsExecute({
        flowName: 'Broken_Flow',
        initialVariables: { input: 'test' }
      });
      fail('Should have thrown error');
    } catch (err) {
      expect(err.code).toBe('TEMPLATE_NOT_FOUND');
      expect(err.partialResults).toHaveLength(1);
      expect(err.partialResults[0].nodeId).toBe('node-1');
      expect(err.failedAt.nodeId).toBe('node-2');
    }
  });

  // TC-FLOW-EXEC-005: Circular dependency detection
  test('should detect circular dependencies before execution', async () => {
    const mockFlow = {
      metadata: { name: 'Circular_Flow', version: '1.0.0' },
      nodes: [
        { id: 'node-1', type: 'template', data: {} },
        { id: 'node-2', type: 'template', data: {} },
        { id: 'node-3', type: 'template', data: {} }
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'chain' },
        { id: 'e2', source: 'node-2', target: 'node-3', type: 'chain' },
        { id: 'e3', source: 'node-3', target: 'node-1', type: 'chain' }
      ]
    };

    const error = new Error('Circular dependency detected: node-1 → node-2 → node-3 → node-1');
    error.code = 'CIRCULAR_DEPENDENCY';
    error.details = {
      cycle: ['node-1', 'node-2', 'node-3', 'node-1']
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockRejectedValue(error);

    await expect(
      flowsExecute({
        flowName: 'Circular_Flow',
        initialVariables: {}
      })
    ).rejects.toMatchObject({
      code: 'CIRCULAR_DEPENDENCY',
      message: expect.stringContaining('Circular dependency')
    });
  });

  // TC-FLOW-EXEC-006: Partial results on failure
  test('should include partial results in error response', async () => {
    const mockFlow = {
      metadata: { name: 'Test_Flow', version: '1.0.0' },
      nodes: [
        { id: 'node-1', type: 'template', data: {} },
        { id: 'node-2', type: 'template', data: {} },
        { id: 'node-3', type: 'template', data: {} }
      ],
      edges: []
    };

    const error = new Error('Execution error at node-2');
    error.code = 'EXECUTION_ERROR';
    error.partialResults = [
      {
        nodeId: 'node-1',
        templateName: 'Template_1',
        output: 'Output 1',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      }
    ];
    error.failedAt = { nodeId: 'node-2', templateName: 'Template_2' };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockRejectedValue(error);

    try {
      await flowsExecute({
        flowName: 'Test_Flow',
        initialVariables: {}
      });
    } catch (err) {
      expect(err.partialResults).toBeDefined();
      expect(err.partialResults).toHaveLength(1);
      expect(err.failedAt).toBeDefined();
    }
  });

  // TC-FLOW-EXEC-007: Performance target (5s for 3 nodes)
  test('should complete 3-node flow within 5 seconds', async () => {
    const mockFlow = {
      metadata: { name: 'Three_Node_Flow', version: '1.0.0' },
      nodes: [
        { id: 'node-1', type: 'template', data: {} },
        { id: 'node-2', type: 'template', data: {} },
        { id: 'node-3', type: 'template', data: {} }
      ],
      edges: []
    };

    const mockExecutionResult = {
      flowName: 'Three_Node_Flow',
      executionId: 'Three_Node_Flow_1696680000000',
      intermediateResults: [
        {
          nodeId: 'node-1',
          templateName: 'Template_1',
          output: 'Output 1',
          executionTimeMs: 1500,
          timestamp: '2025-10-07T10:30:00.000Z'
        },
        {
          nodeId: 'node-2',
          templateName: 'Template_2',
          output: 'Output 2',
          executionTimeMs: 1500,
          timestamp: '2025-10-07T10:30:01.500Z'
        },
        {
          nodeId: 'node-3',
          templateName: 'Template_3',
          output: 'Output 3',
          executionTimeMs: 1500,
          timestamp: '2025-10-07T10:30:03.000Z'
        }
      ],
      finalResult: 'Output 3',
      totalExecutionTimeMs: 4500,
      status: 'success'
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockResolvedValue(mockExecutionResult);

    const startTime = Date.now();
    const result = await flowsExecute({
      flowName: 'Three_Node_Flow',
      initialVariables: {}
    });
    const elapsed = Date.now() - startTime;

    expect(result.totalExecutionTimeMs).toBeLessThan(5000);
    expect(elapsed).toBeLessThan(5000);
    expect(result.intermediateResults).toHaveLength(3);
  });

  // Additional: Custom ref parameter
  test('should use custom ref when provided', async () => {
    const mockFlow = {
      metadata: { name: 'Test_Flow', version: '1.0.0' },
      nodes: [{ id: 'node-1', type: 'template', data: {} }],
      edges: []
    };

    const mockExecutionResult = {
      flowName: 'Test_Flow',
      executionId: 'Test_Flow_123',
      intermediateResults: [],
      finalResult: 'result',
      totalExecutionTimeMs: 1000,
      status: 'success'
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: mockFlow });
    mockFlowService.parseFlow.mockReturnValue(mockFlow);
    mockFlowExecutionService.executeFlow.mockResolvedValue(mockExecutionResult);

    await flowsExecute({
      flowName: 'Test_Flow',
      initialVariables: {},
      ref: 'develop'
    });

    expect(mockGithubService.fetchFlow).toHaveBeenCalledWith('Test_Flow', 'develop');
    expect(mockFlowExecutionService.executeFlow).toHaveBeenCalledWith(
      mockFlow,
      {},
      'develop'
    );
  });
});
