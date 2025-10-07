// Flow service for parsing and validating flow JSON
// Uses flowSchema for JSON Schema validation

import { validateFlow } from '../models/flowSchema.js';

/**
 * Parse and validate flow JSON
 * @param {Object} flowJson - Raw flow JSON object (flowFile structure from GitHub)
 * @returns {Object} Validated flow object (single flow)
 * @throws {Error} If validation fails
 */
function parseFlow(flowJson) {
  // Log the incoming structure for debugging
  log.info('Parsing flow structure', {
    hasMetadata: !!flowJson.metadata,
    hasFlows: !!(flowJson.flows && Array.isArray(flowJson.flows)),
    flowsCount: flowJson.flows ? flowJson.flows.length : 0,
    hasMeta: !!(flowJson.meta && flowJson.nodes && flowJson.edges),
    keys: Object.keys(flowJson)
  }, 'parseFlow');

  // Validate that we have the expected flowFile structure
  if (!flowJson.metadata || !flowJson.flows || !Array.isArray(flowJson.flows)) {
    const error = new Error('Invalid flow structure: expected metadata and flows array');
    error.code = 'VALIDATION_ERROR';
    log.error('Flow structure validation failed', {
      error: error.message,
      structure: Object.keys(flowJson),
      hasMetadata: !!flowJson.metadata,
      hasFlows: !!flowJson.flows
    }, 'parseFlow');
    throw error;
  }

  if (flowJson.flows.length === 0) {
    const error = new Error('No flows found in flow file');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  // Extract the first flow from the flows array
  const flow = flowJson.flows[0];

  // Validate that the extracted flow has the required structure
  if (!flow.meta || !flow.nodes || !flow.edges) {
    const error = new Error('Invalid flow structure: flow must have meta, nodes, and edges');
    error.code = 'VALIDATION_ERROR';
    log.error('Flow object validation failed', {
      error: error.message,
      flowKeys: Object.keys(flow),
      hasMeta: !!flow.meta,
      hasNodes: !!flow.nodes,
      hasEdges: !!flow.edges
    }, 'parseFlow');
    throw error;
  }

  // Validate the flow structure using our schema
  const validation = validateFlow(flowJson);

  if (!validation.valid) {
    const error = new Error(`Flow validation failed: ${validation.errors?.[0]?.message || 'Unknown error'}`);
    error.code = 'VALIDATION_ERROR';
    error.errors = validation.errors;

    log.error('Flow schema validation failed', {
      error: error.message,
      errors: validation.errors,
      flowName: flow.meta?.name || 'unknown'
    }, 'parseFlow');

    throw error;
  }

  log.info('Flow parsed successfully', {
    flowName: flow.meta?.name,
    flowId: flow.meta?.id,
    nodeCount: flow.nodes?.length || 0,
    edgeCount: flow.edges?.length || 0
  }, 'parseFlow');

  return flow;
}

/**
 * Validate flow against JSON schema
 * @param {Object} flowFile - FlowFile object to validate
 * @returns {{ valid: boolean, errors: Array|null }}
 */
function validateFlowSchema(flowFile) {
  return validateFlow(flowFile);
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
