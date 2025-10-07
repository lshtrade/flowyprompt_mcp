// Flow execution service
// Orchestrates multi-step template execution with variable mapping

import { orderFlowNodes } from '../lib/topologicalSort.js';
import { mapVariables } from '../lib/variableMapper.js';
import promptsGetTool from '../mcp/tools/promptsGet.js';
import { log } from '../utils/logger.js';

/**
 * Execute a flow with template chaining
 * @param {Object} flow - Validated flow object
 * @param {Object} initialVariables - Initial variables from user
 * @param {string} ref - GitHub ref (branch/tag)
 * @returns {Promise<Object>} FlowExecution object
 */
async function executeFlow(flow, initialVariables, ref = 'main') {
  const startTime = Date.now();
  const intermediateResults = [];

  // Extract template nodes only (filter out multi_input and result nodes)
  const templateNodes = flow.nodes.filter(node => node.type === 'template');

  // Build variable map from multi_input nodes and merge with initial variables
  const resolvedVariables = { ...initialVariables };
  flow.nodes.filter(node => node.type === 'multi_input').forEach(inputNode => {
    if (inputNode.data.variables) {
      if (Array.isArray(inputNode.data.variables)) {
        // New format: array of objects with key/value
        inputNode.data.variables.forEach(v => {
          if (typeof v === 'object' && v.key) {
            resolvedVariables[v.key] = v.value || '';
          }
        });
      } else {
        // Fallback format
        Object.assign(resolvedVariables, inputNode.data.variables);
      }
    }
  });

  // Order nodes by dependencies (topological sort)
  let orderedNodes;
  try {
    orderedNodes = orderFlowNodes(templateNodes, flow.edges);
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    const enhancedError = new Error(`Template execution failed: ${errorMessage}`);
    enhancedError.code = error.code || 'EXECUTION_ERROR';
    enhancedError.partialResults = [];
    enhancedError.failedAt = {
      error: errorMessage
    };

    throw enhancedError;
  }

  // Execute each node in order
  for (const node of orderedNodes) {
    try {
      // Resolve variables for this node (combine initial variables with node-specific variables)
      const nodeVariables = { ...resolvedVariables };

      // Add results from previous nodes
      intermediateResults.forEach(result => {
        nodeVariables[`${result.nodeId}_template`] = result.templateName;
        nodeVariables[`${result.nodeId}_result`] = result.output;
      });

      // Execute template
      const templateResult = await promptsGetTool({
        name: node.data.selectedTemplateId,
        variables: nodeVariables,
        ref
      });

      if (templateResult.isError) {
        throw new Error(templateResult.content || 'Template execution failed');
      }

      // Store result
      const nodeResult = {
        nodeId: node.id,
        templateName: node.data.selectedTemplateId,
        inputVariables: resolvedVariables,
        output: templateResult.content,
        executionTimeMs: 0 // TODO: implement timing
      };

      intermediateResults.push(nodeResult);

      log.info('Node executed successfully', {
        nodeId: node.id,
        templateName: node.data.selectedTemplateId,
        outputLength: templateResult.content?.length || 0
      }, 'executeFlow');

    } catch (error) {
      const errorMessage = error.message || 'Unknown error';
      const enhancedError = new Error(`Template execution failed at node: ${node.id} - ${errorMessage}`);
      enhancedError.code = error.code || 'EXECUTION_ERROR';
      enhancedError.partialResults = intermediateResults;
      enhancedError.failedAt = {
        nodeId: node.id,
        templateName: node.data.selectedTemplateId || 'Unknown',
        error: errorMessage,
        nodeLabel: node.data?.label || node.id
      };

      log.error('Flow execution node failed', error, {
        nodeId: node.id,
        templateName: node.data.selectedTemplateId,
        completedNodes: intermediateResults.length,
        totalNodes: orderedNodes.length
      }, 'executeFlow');

      throw enhancedError;
    }
  }

  // Build final result
  const finalResult = intermediateResults.length > 0
    ? intermediateResults[intermediateResults.length - 1].output
    : '';

  const executionId = `${flow.metadata.name}_${Date.now()}`;

  return {
    flowName: flow.metadata.name,
    executionId,
    intermediateResults,
    finalResult,
    totalExecutionTimeMs: Date.now() - startTime,
    status: 'success'
  };
}

export default {
  executeFlow
};
