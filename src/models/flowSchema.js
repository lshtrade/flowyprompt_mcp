// Flow JSON Schema for FlowyPrompt format validation
// Validates flow structure: metadata, nodes (template/multi_input/result), edges (data/chain)

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// JSON Schema for FlowyPrompt flow structure
const flowSchema = {
  type: 'object',
  required: ['metadata', 'flows'],
  properties: {
    metadata: {
      type: 'object',
      required: ['version', 'exportDate', 'flowCount'],
      properties: {
        version: {
          type: 'string',
          description: 'Flow file format version'
        },
        exportDate: {
          type: 'string',
          format: 'date-time',
          description: 'ISO 8601 export timestamp'
        },
        flowCount: {
          type: 'number',
          description: 'Number of flows in this file'
        },
        fileName: {
          type: 'string',
          description: 'Original file name'
        },
        source: {
          type: 'string',
          description: 'Source application'
        }
      },
      additionalProperties: true
    },
    flows: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['meta', 'nodes', 'edges'],
        properties: {
          meta: {
            type: 'object',
            required: ['id', 'name', 'version'],
            properties: {
              id: {
                type: 'string',
                minLength: 1,
                description: 'Unique flow identifier (UUID)'
              },
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                description: 'Flow name'
              },
              version: {
                type: 'string',
                pattern: '^\d+\.\d+\.\d+$',
                description: 'Semantic version (e.g., 1.0.0)'
              },
              description: {
                type: 'string',
                description: 'Human-readable description of the flow'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                description: 'ISO 8601 creation timestamp'
              },
              updated_at: {
                type: 'string',
                format: 'date-time',
                description: 'ISO 8601 last updated timestamp'
              }
            },
            additionalProperties: true
          },
          nodes: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['id', 'type', 'data'],
              properties: {
                id: {
                  type: 'string',
                  minLength: 1,
                  description: 'Unique node identifier within the flow'
                },
                type: {
                  type: 'string',
                  enum: ['template', 'multi_input', 'result'],
                  description: 'Node type: template (executes), multi_input (entry), result (exit)'
                },
                position: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' }
                  },
                  description: 'Visual layout coordinates (optional)'
                },
                data: {
                  type: 'object',
                  properties: {
                    label: {
                      type: 'string',
                      description: 'Display name for the node'
                    },
                    template: {
                      type: 'string',
                      description: 'Template content with {variables} (template nodes only)'
                    },
                    variables: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'List of variable names used (template/multi_input nodes)'
                    },
                    selectedTemplateId: {
                      type: 'string',
                      description: 'ID of saved template to execute (template nodes only)'
                    }
                  },
                  additionalProperties: true
                }
              },
              additionalProperties: true
            }
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'source', 'target'],
              properties: {
                id: {
                  type: 'string',
                  minLength: 1,
                  description: 'Unique edge identifier within the flow'
                },
                source: {
                  type: 'string',
                  description: 'Source node ID'
                },
                target: {
                  type: 'string',
                  description: 'Target node ID'
                },
                data: {
                  type: 'object',
                  properties: {
                    connectionType: {
                      type: 'string',
                      enum: ['data', 'chain', 'result'],
                      description: 'Connection type'
                    }
                  },
                  additionalProperties: true
                }
              },
              additionalProperties: true
            }
          },
          viewport: {
            type: 'object',
            description: 'Canvas viewport settings (optional)'
          }
        },
        additionalProperties: true
      }
    }
  },
  additionalProperties: false
};

// Compile schema for fast validation
const validateFlowSchema = ajv.compile(flowSchema);

/**
 * Validate flow JSON against schema
 * @param {Object} flow - Flow object to validate
 * @returns {{ valid: boolean, errors: Array|null }}
 */
export function validateFlow(flowFile) {
  const valid = validateFlowSchema(flowFile);

  if (!valid) {
    return {
      valid: false,
      errors: validateFlowSchema.errors.map(err => ({
        field: err.instancePath || err.schemaPath,
        message: err.message,
        params: err.params
      }))
    };
  }

  // Additional semantic validations on first flow
  const semanticErrors = [];
  
  if (!flowFile.flows || flowFile.flows.length === 0) {
    return {
      valid: false,
      errors: [{ field: 'flows', message: 'flows array is empty or missing' }]
    };
  }

  const flow = flowFile.flows[0]; // Validate first flow

  // Check node ID uniqueness
  const nodeIds = new Set();
  for (const node of flow.nodes) {
    if (nodeIds.has(node.id)) {
      semanticErrors.push({
        field: `/flows/0/nodes/${flow.nodes.indexOf(node)}/id`,
        message: `Duplicate node ID: ${node.id}`,
        params: { nodeId: node.id }
      });
    }
    nodeIds.add(node.id);
  }

  // Check edge ID uniqueness
  const edgeIds = new Set();
  for (const edge of flow.edges) {
    if (edgeIds.has(edge.id)) {
      semanticErrors.push({
        field: `/flows/0/edges/${flow.edges.indexOf(edge)}/id`,
        message: `Duplicate edge ID: ${edge.id}`,
        params: { edgeId: edge.id }
      });
    }
    edgeIds.add(edge.id);
  }

  // Check that edge source/target reference existing nodes
  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source)) {
      semanticErrors.push({
        field: `/flows/0/edges/${flow.edges.indexOf(edge)}/source`,
        message: `Edge references non-existent source node: ${edge.source}`,
        params: { nodeId: edge.source }
      });
    }
    if (!nodeIds.has(edge.target)) {
      semanticErrors.push({
        field: `/flows/0/edges/${flow.edges.indexOf(edge)}/target`,
        message: `Edge references non-existent target node: ${edge.target}`,
        params: { nodeId: edge.target }
      });
    }
    if (edge.source === edge.target) {
      semanticErrors.push({
        field: `/flows/0/edges/${flow.edges.indexOf(edge)}`,
        message: `Edge cannot connect node to itself: ${edge.source}`,
        params: { nodeId: edge.source }
      });
    }
  }

  // Check that template nodes have required fields
  for (const node of flow.nodes) {
    if (node.type === 'template') {
      if (!node.data.selectedTemplateId) {
        semanticErrors.push({
          field: `/flows/0/nodes/${flow.nodes.indexOf(node)}/data/selectedTemplateId`,
          message: 'Template node must have selectedTemplateId',
          params: { nodeId: node.id }
        });
      }
      if (!node.data.variables || node.data.variables.length === 0) {
        semanticErrors.push({
          field: `/flows/0/nodes/${flow.nodes.indexOf(node)}/data/variables`,
          message: 'Template node must have at least one variable',
          params: { nodeId: node.id }
        });
      }
    }
    if (node.type === 'multi_input') {
      if (!node.data.variables || node.data.variables.length === 0) {
        semanticErrors.push({
          field: `/flows/0/nodes/${flow.nodes.indexOf(node)}/data/variables`,
          message: 'Multi-input node must have at least one variable',
          params: { nodeId: node.id }
        });
      }
    }
  }

  if (semanticErrors.length > 0) {
    return {
      valid: false,
      errors: semanticErrors
    };
  }

  return { valid: true, errors: null };
}

export { flowSchema, validateFlowSchema };
export default { validateFlow, flowSchema };
