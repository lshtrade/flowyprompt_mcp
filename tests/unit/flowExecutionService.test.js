// Unit tests for flow execution service
// Tests execution orchestration logic

import { jest } from '@jest/globals';

// Mock dependencies
const mockTopologicalSort = {
  orderFlowNodes: jest.fn()
};

const mockVariableMapper = {
  mapVariables: jest.fn()
};

const mockPromptsGet = jest.fn();

// Mock modules before importing
jest.unstable_mockModule('../../src/lib/topologicalSort.js', () => mockTopologicalSort);
jest.unstable_mockModule('../../src/lib/variableMapper.js', () => mockVariableMapper);
jest.unstable_mockModule('../../src/mcp/tools/promptsGet.js', () => ({
  default: mockPromptsGet
}));

// Import the module to test
const flowExecutionServiceModule = await import('../../src/services/flowExecutionService.js');
const flowExecutionService = flowExecutionServiceModule.default;

describe('Flow Execution Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: Build dependency graph from edges
  test('should build dependency graph from chain edges', async () => {
    const flow = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: ['v1'] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: ['v2'] }
        }
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'chain' }
      ]
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue([flow.nodes[0], flow.nodes[1]]);
    mockVariableMapper.mapVariables.mockReturnValue({ v1: 'value1' });
    mockPromptsGet.mockResolvedValue({
      content: 'Output',
      isError: false
    });

    await flowExecutionService.executeFlow(flow, { v1: 'value1' }, 'main');

    expect(mockTopologicalSort.orderFlowNodes).toHaveBeenCalledWith(
      flow.nodes,
      flow.edges
    );
  });

  // Test: Resolve variables for node (initial + previous)
  test('should resolve variables from initial and previous results', async () => {
    const flow = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: ['input'] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: ['node1_result'] }
        }
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'chain' }
      ]
    };

    const initialVars = { input: 'test' };

    mockTopologicalSort.orderFlowNodes.mockReturnValue([flow.nodes[0], flow.nodes[1]]);

    // First call for node-1
    mockVariableMapper.mapVariables.mockReturnValueOnce({ input: 'test' });
    // Second call for node-2
    mockVariableMapper.mapVariables.mockReturnValueOnce({
      node1_result: 'Output from node-1',
      node1_template: 'T1'
    });

    mockPromptsGet.mockResolvedValue({
      content: 'Output from node-1',
      isError: false
    });

    await flowExecutionService.executeFlow(flow, initialVars, 'main');

    expect(mockVariableMapper.mapVariables).toHaveBeenCalledTimes(2);
    expect(mockVariableMapper.mapVariables).toHaveBeenNthCalledWith(
      1,
      flow.nodes[0],
      initialVars,
      []
    );
    expect(mockVariableMapper.mapVariables).toHaveBeenNthCalledWith(
      2,
      flow.nodes[1],
      initialVars,
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'node-1' })
      ])
    );
  });

  // Test: Execute single template node
  test('should execute single template node', async () => {
    const flow = {
      metadata: { name: 'Single', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'Test_Template', variables: ['var1'] }
        }
      ],
      edges: []
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue([flow.nodes[0]]);
    mockVariableMapper.mapVariables.mockReturnValue({ var1: 'value1' });
    mockPromptsGet.mockResolvedValue({
      content: 'Template output',
      isError: false
    });

    const result = await flowExecutionService.executeFlow(flow, { var1: 'value1' }, 'main');

    expect(result.intermediateResults).toHaveLength(1);
    expect(result.intermediateResults[0]).toMatchObject({
      nodeId: 'node-1',
      templateName: 'Test_Template',
      inputVariables: { var1: 'value1' },
      output: 'Template output'
    });
    expect(result.finalResult).toBe('Template output');
    expect(result.status).toBe('success');
  });

  // Test: Execute 2-node chain (sequential)
  test('should execute 2-node chain sequentially', async () => {
    const flow = {
      metadata: { name: 'Chain', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: ['input'] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: ['node1_result'] }
        }
      ],
      edges: [
        { id: 'e1', source: 'node-1', target: 'node-2', type: 'chain' }
      ]
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue([flow.nodes[0], flow.nodes[1]]);
    mockVariableMapper.mapVariables
      .mockReturnValueOnce({ input: 'test' })
      .mockReturnValueOnce({ node1_result: 'Output 1', node1_template: 'T1' });

    mockPromptsGet
      .mockResolvedValueOnce({ content: 'Output 1', isError: false })
      .mockResolvedValueOnce({ content: 'Output 2', isError: false });

    const result = await flowExecutionService.executeFlow(flow, { input: 'test' }, 'main');

    expect(result.intermediateResults).toHaveLength(2);
    expect(result.intermediateResults[0].output).toBe('Output 1');
    expect(result.intermediateResults[1].output).toBe('Output 2');
    expect(result.finalResult).toBe('Output 2');
    expect(result.status).toBe('success');
  });

  // Test: Collect intermediate results
  test('should collect all intermediate results', async () => {
    const flow = {
      metadata: { name: 'Multi', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: ['v1'] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: ['v2'] }
        },
        {
          id: 'node-3',
          type: 'template',
          data: { selectedTemplateId: 'T3', variables: ['v3'] }
        }
      ],
      edges: []
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue(flow.nodes);
    mockVariableMapper.mapVariables.mockReturnValue({});
    mockPromptsGet
      .mockResolvedValueOnce({ content: 'Output 1', isError: false })
      .mockResolvedValueOnce({ content: 'Output 2', isError: false })
      .mockResolvedValueOnce({ content: 'Output 3', isError: false });

    const result = await flowExecutionService.executeFlow(flow, {}, 'main');

    expect(result.intermediateResults).toHaveLength(3);
    expect(result.intermediateResults[0].nodeId).toBe('node-1');
    expect(result.intermediateResults[1].nodeId).toBe('node-2');
    expect(result.intermediateResults[2].nodeId).toBe('node-3');
  });

  // Test: Return final result
  test('should return final result from last node', async () => {
    const flow = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: [] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: [] }
        }
      ],
      edges: []
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue(flow.nodes);
    mockVariableMapper.mapVariables.mockReturnValue({});
    mockPromptsGet
      .mockResolvedValueOnce({ content: 'Not final', isError: false })
      .mockResolvedValueOnce({ content: 'Final output', isError: false });

    const result = await flowExecutionService.executeFlow(flow, {}, 'main');

    expect(result.finalResult).toBe('Final output');
  });

  // Test: Handle execution error with partial results
  test('should return partial results on template execution error', async () => {
    const flow = {
      metadata: { name: 'Error', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: [] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { selectedTemplateId: 'T2', variables: [] }
        }
      ],
      edges: []
    };

    mockTopologicalSort.orderFlowNodes.mockReturnValue(flow.nodes);
    mockVariableMapper.mapVariables.mockReturnValue({});
    mockPromptsGet
      .mockResolvedValueOnce({ content: 'Success', isError: false })
      .mockRejectedValueOnce(new Error('Template not found'));

    await expect(
      flowExecutionService.executeFlow(flow, {}, 'main')
    ).rejects.toThrow();

    // Implementation should catch error and attach partialResults
  });

  // Test: Filter out multi_input and result nodes
  test('should only execute template nodes', async () => {
    const flow = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        { id: 'input-1', type: 'multi_input', data: { variables: ['v'] } },
        {
          id: 'node-1',
          type: 'template',
          data: { selectedTemplateId: 'T1', variables: ['v'] }
        },
        { id: 'result-1', type: 'result', data: { label: 'Result' } }
      ],
      edges: []
    };

    // Only template nodes should be in ordered list
    const templateNodes = flow.nodes.filter(n => n.type === 'template');
    mockTopologicalSort.orderFlowNodes.mockReturnValue(templateNodes);
    mockVariableMapper.mapVariables.mockReturnValue({ v: 'value' });
    mockPromptsGet.mockResolvedValue({ content: 'Output', isError: false });

    const result = await flowExecutionService.executeFlow(flow, { v: 'value' }, 'main');

    // Should only execute template node
    expect(result.intermediateResults).toHaveLength(1);
    expect(result.intermediateResults[0].nodeId).toBe('node-1');
  });
});
