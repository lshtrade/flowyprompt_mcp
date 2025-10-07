// Unit tests for variable mapper
// Tests variable resolution from multiple sources

import { jest } from '@jest/globals';

// Import the module to test
const variableMapperModule = await import('../../src/lib/variableMapper.js');
const { mapVariables } = variableMapperModule;

describe('Variable Mapper', () => {
  // Test: Map all variables from single source
  test('should map all variables from initial variables', () => {
    const targetNode = {
      id: 'node-1',
      data: {
        variables: ['company_name', 'market']
      }
    };

    const initialVars = {
      company_name: 'TechCorp',
      market: 'AI',
      extra: 'ignored'
    };

    const completedResults = [];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    expect(resolved).toEqual({
      company_name: 'TechCorp',
      market: 'AI',
      extra: 'ignored'
    });
  });

  // Test: Map variables from multiple sources (initial + previous outputs)
  test('should merge variables from initial and previous outputs', () => {
    const targetNode = {
      id: 'node-2',
      data: {
        variables: ['node1_result', 'budget']
      }
    };

    const initialVars = {
      company_name: 'TechCorp',
      market: 'AI',
      budget: '100K'
    };

    const completedResults = [
      {
        nodeId: 'node-1',
        templateName: 'Brand_Positioning',
        output: 'Positioning strategy content...',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      }
    ];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    expect(resolved).toHaveProperty('budget', '100K');
    expect(resolved).toHaveProperty('node1_result', 'Positioning strategy content...');
    expect(resolved).toHaveProperty('node1_template', 'Brand_Positioning');
  });

  // Test: Priority order - previous outputs override initial variables
  test('should prioritize previous outputs over initial variables', () => {
    const targetNode = {
      id: 'node-2',
      data: {
        variables: ['result']
      }
    };

    const initialVars = {
      result: 'initial value'
    };

    const completedResults = [
      {
        nodeId: 'result',
        templateName: 'Template',
        output: 'overridden value',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      }
    ];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    // result_result should be 'overridden value' (from node output)
    // original 'result' from initialVars should still be there
    expect(resolved).toHaveProperty('result', 'initial value');
    expect(resolved).toHaveProperty('result_result', 'overridden value');
  });

  // Test: Variable naming - {nodeid}_result format
  test('should create variables with {nodeid}_result naming', () => {
    const targetNode = {
      id: 'node-3',
      data: {
        variables: []
      }
    };

    const initialVars = {};

    const completedResults = [
      {
        nodeId: 'node-1',
        templateName: 'Template_A',
        output: 'Output A',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      },
      {
        nodeId: 'node-2',
        templateName: 'Template_B',
        output: 'Output B',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:01.000Z'
      }
    ];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    expect(resolved).toHaveProperty('node1_result', 'Output A');
    expect(resolved).toHaveProperty('node1_template', 'Template_A');
    expect(resolved).toHaveProperty('node2_result', 'Output B');
    expect(resolved).toHaveProperty('node2_template', 'Template_B');
  });

  // Test: Handle empty completed results
  test('should handle empty completed results', () => {
    const targetNode = {
      id: 'node-1',
      data: {
        variables: ['input']
      }
    };

    const initialVars = {
      input: 'test'
    };

    const completedResults = [];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    expect(resolved).toEqual({ input: 'test' });
  });

  // Test: Handle multiple previous nodes
  test('should collect outputs from all previous nodes', () => {
    const targetNode = {
      id: 'node-final',
      data: {
        variables: ['node1_result', 'node2_result', 'node3_result']
      }
    };

    const initialVars = {};

    const completedResults = [
      {
        nodeId: 'node-1',
        templateName: 'T1',
        output: 'Output 1',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:00.000Z'
      },
      {
        nodeId: 'node-2',
        templateName: 'T2',
        output: 'Output 2',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:01.000Z'
      },
      {
        nodeId: 'node-3',
        templateName: 'T3',
        output: 'Output 3',
        executionTimeMs: 1000,
        timestamp: '2025-10-07T10:30:02.000Z'
      }
    ];

    const resolved = mapVariables(targetNode, initialVars, completedResults);

    expect(resolved.node1_result).toBe('Output 1');
    expect(resolved.node2_result).toBe('Output 2');
    expect(resolved.node3_result).toBe('Output 3');
  });
});
