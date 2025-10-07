// Unit tests for flow service
// Tests flow parsing and validation

import { jest } from '@jest/globals';

// Import the module to test
const flowServiceModule = await import('../../src/services/flowService.js');
const flowService = flowServiceModule.default;

describe('Flow Service', () => {
  // Test: Parse valid flow JSON
  test('should parse valid flow JSON successfully', () => {
    const flowJson = {
      metadata: {
        name: 'Test_Flow',
        version: '1.0.0',
        description: 'Test flow'
      },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: {
            label: 'Test Node',
            template: 'Test {var}',
            variables: ['var'],
            selectedTemplateId: 'Test_Template'
          }
        }
      ],
      edges: []
    };

    const parsed = flowService.parseFlow(flowJson);

    expect(parsed).toEqual(flowJson);
    expect(parsed.metadata.name).toBe('Test_Flow');
  });

  // Test: Validate flow schema (valid flow passes)
  test('should validate correct flow schema', () => {
    const validFlow = {
      metadata: {
        name: 'Valid_Flow',
        version: '1.0.0'
      },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: {
            label: 'Node',
            selectedTemplateId: 'Template',
            variables: ['var']
          }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(validFlow);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeNull();
  });

  // Test: Reject invalid flow (missing required fields)
  test('should reject flow with missing required fields', () => {
    const invalidFlow = {
      metadata: {
        name: 'Invalid_Flow'
        // Missing version
      },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'Node' }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(invalidFlow);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // Test: Validate node IDs are unique
  test('should reject flow with duplicate node IDs', () => {
    const flowWithDuplicates = {
      metadata: {
        name: 'Test_Flow',
        version: '1.0.0'
      },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'Node 1', selectedTemplateId: 'T1', variables: ['v'] }
        },
        {
          id: 'node-1', // Duplicate
          type: 'template',
          data: { label: 'Node 2', selectedTemplateId: 'T2', variables: ['v'] }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(flowWithDuplicates);

    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.message.includes('Duplicate node ID'))).toBe(true);
  });

  // Test: Validate edges reference existing nodes
  test('should reject edges that reference non-existent nodes', () => {
    const flowWithBadEdges = {
      metadata: {
        name: 'Test_Flow',
        version: '1.0.0'
      },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'Node', selectedTemplateId: 'T', variables: ['v'] }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'nonexistent-node',
          type: 'chain'
        }
      ]
    };

    const result = flowService.validateFlowSchema(flowWithBadEdges);

    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.message.includes('non-existent'))).toBe(true);
  });

  // Test: Extract template nodes only (filter out multi_input/result)
  test('should extract only template nodes', () => {
    const flow = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        { id: 'input-1', type: 'multi_input', data: { label: 'Input' } },
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'Template 1', selectedTemplateId: 'T1', variables: ['v'] }
        },
        {
          id: 'node-2',
          type: 'template',
          data: { label: 'Template 2', selectedTemplateId: 'T2', variables: ['v'] }
        },
        { id: 'result-1', type: 'result', data: { label: 'Result' } }
      ],
      edges: []
    };

    const templateNodes = flowService.extractTemplateNodes(flow);

    expect(templateNodes).toHaveLength(2);
    expect(templateNodes[0].id).toBe('node-1');
    expect(templateNodes[1].id).toBe('node-2');
    expect(templateNodes.every(node => node.type === 'template')).toBe(true);
  });

  // Test: Validate template nodes have required fields
  test('should reject template nodes without selectedTemplateId', () => {
    const flowWithInvalidTemplate = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: {
            label: 'Template',
            variables: ['v']
            // Missing selectedTemplateId
          }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(flowWithInvalidTemplate);

    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.message.includes('selectedTemplateId'))).toBe(true);
  });

  // Test: Validate template nodes have variables
  test('should reject template nodes without variables', () => {
    const flowWithNoVariables = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: {
            label: 'Template',
            selectedTemplateId: 'Test_Template',
            variables: [] // Empty
          }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(flowWithNoVariables);

    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.message.includes('at least one variable'))).toBe(true);
  });

  // Test: Accept valid node types
  test('should accept all valid node types', () => {
    const flowWithAllTypes = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'input-1',
          type: 'multi_input',
          data: { label: 'Input', variables: ['v'] }
        },
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'Template', selectedTemplateId: 'T', variables: ['v'] }
        },
        {
          id: 'result-1',
          type: 'result',
          data: { label: 'Result' }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(flowWithAllTypes);

    expect(result.valid).toBe(true);
  });

  // Test: Reject invalid node types
  test('should reject invalid node types', () => {
    const flowWithInvalidType = {
      metadata: { name: 'Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'invalid_type',
          data: { label: 'Node' }
        }
      ],
      edges: []
    };

    const result = flowService.validateFlowSchema(flowWithInvalidType);

    expect(result.valid).toBe(false);
  });
});
