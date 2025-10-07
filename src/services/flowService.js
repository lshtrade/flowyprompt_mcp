// Flow service for parsing and validating flow JSON
// Uses flowSchema for JSON Schema validation

import { validateFlow } from '../models/flowSchema.js';

/**
 * Parse and validate flow JSON
 * @param {Object} flowJson - Raw flow JSON object
 * @returns {Object} Validated flow object
 * @throws {Error} If validation fails
 */
function parseFlow(flowJson) {
  const validation = validateFlowSchema(flowJson);

  if (!validation.valid) {
    const error = new Error('Flow validation failed');
    error.code = 'VALIDATION_ERROR';
    error.errors = validation.errors;
    throw error;
  }

  // Return the first flow from the flows array
  if (!flowJson.flows || flowJson.flows.length === 0) {
    const error = new Error('No flows found in flow file');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  return flowJson.flows[0];
}

/**
 * Validate flow against JSON schema
 * @param {Object} flow - Flow object to validate
 * @returns {{ valid: boolean, errors: Array|null }}
 */
function validateFlowSchema(flow) {
  return validateFlow(flow);
}

/**
 * Extract only template nodes from flow
 * @param {Object} flow - Validated flow object
 * @returns {Array} Array of template nodes only
 */
function extractTemplateNodes(flowOrFlowFile) {
  // Extract first flow if flowFile has flows array
  const flow = flowOrFlowFile.flows ? flowOrFlowFile.flows[0] : flowOrFlowFile;
  return flow.nodes.filter(node => node.type === 'template');
}

/**
 * Validate that all edge source/target nodes exist
 * @param {Object} flow - Flow object
 * @returns {{ valid: boolean, errors: Array|null }}
 */
function validateNodeReferences(flowFile) {
  // Extract first flow if flowFile has flows array
  const flow = flowFile.flows ? flowFile.flows[0] : flowFile;
  
  const nodeIds = new Set(flow.nodes.map(n => n.id));
  const errors = [];

  flow.edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      errors.push({
        field: 'edge.source',
        message: `Edge references non-existent source node: ${edge.source}`,
        edgeId: edge.id
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        field: 'edge.target',
        message: `Edge references non-existent target node: ${edge.target}`,
        edgeId: edge.id
      });
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: null };
}

export default {
  parseFlow,
  validateFlowSchema,
  extractTemplateNodes,
  validateNodeReferences
};
