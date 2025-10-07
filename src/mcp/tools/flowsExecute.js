// src/mcp/tools/flowsExecute.js
// MCP Tool: flows/execute - Execute a flow chain

import { log } from '../../utils/logger.js';
import { createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import flowService from '../../services/flowService.js';
import flowExecutionService from '../../services/flowExecutionService.js';

/**
 * Handle flows/execute tool request
 * @param {object} args - Tool arguments {flowName: string, initialVariables: object, ref?: string}
 * @returns {Promise<object>} MCP tool response with execution results
 */
export default async function flowsExecuteTool(args) {
  const startTime = Date.now();
  const { flowName, initialVariables = {}, ref = 'main' } = args;

  if (!flowName) {
    throw createMcpError('INVALID_REQUEST', 'Flow name is required', 'request');
  }

  try {
    log.info('Processing flows_execute request', { flowName, ref }, 'flowsExecuteTool');

    // Fetch flow from GitHub
    const flowResult = await githubService.fetchFlow(flowName, ref);
    const flow = flowResult.content;

    // Parse and validate flow
    try {
      // Debug: Log the incoming flow structure
      log.info('Flow structure received', {
        flowName,
        hasMetadata: !!flow.metadata,
        hasFlows: !!(flow.flows && Array.isArray(flow.flows)),
        flowsCount: flow.flows ? flow.flows.length : 0,
        hasMeta: !!flow.meta,
        hasNodes: !!(flow.nodes && Array.isArray(flow.nodes)),
        hasEdges: !!(flow.edges && Array.isArray(flow.edges)),
        keys: Object.keys(flow)
      }, 'flowsExecuteTool');

      const parsedFlow = flowService.parseFlow(flow);

      // Debug: Log the parsed flow
      log.info('Flow parsed successfully', {
        flowName,
        flowId: parsedFlow.meta?.id,
        nodeCount: parsedFlow.nodes?.length || 0,
        edgeCount: parsedFlow.edges?.length || 0,
        templateNodeCount: parsedFlow.nodes?.filter(n => n.type === 'template')?.length || 0
      }, 'flowsExecuteTool');

      // Execute flow
      const executionResult = await flowExecutionService.executeFlow(
        parsedFlow,
        initialVariables,
        ref
      );

      const latencyMs = Date.now() - startTime;
      log.info('Successfully executed flow', {
        flowName,
        nodesExecuted: executionResult.intermediateResults.length,
        latencyMs,
        status: executionResult.status
      }, 'flowsExecuteTool');

      return executionResult;
    } catch (validationError) {
      log.error('Flow validation failed', validationError, {
        flowName,
        errorMessage: validationError.message,
        errorCode: validationError.code,
        errorKeys: Object.keys(validationError),
        flowStructurePreview: JSON.stringify(flow, null, 2).substring(0, 1000),
        flowKeys: Object.keys(flow),
        hasMetadata: !!flow.metadata,
        hasFlows: !!(flow.flows && Array.isArray(flow.flows))
      }, 'flowsExecuteTool');

      // Include detailed error information
      const error = createMcpError(
        'VALIDATION_ERROR',
        `Flow validation failed: ${validationError.message}`,
        'flows/execute',
        {
          errors: validationError.errors || [],
          flowName,
          flowStructure: typeof flow === 'object' ? 'object' : typeof flow
        }
      );

      if (validationError.errors) {
        error.details = validationError.errors.map(err => ({
          field: err.field || err.path || 'unknown',
          message: err.message,
          params: err.params || {}
        }));
      }

      throw error;
    }
  } catch (error) {
    log.error('Error executing flow', error, { flowName, ref }, 'flowsExecuteTool');

    // If error has partial results, include them
    if (error.partialResults) {
      const mcpError = createMcpError(
        error.code || 'EXECUTION_ERROR',
        error.message || 'Flow execution failed',
        'flows/execute',
        {
          partialResults: error.partialResults,
          failedAt: error.failedAt
        }
      );
      // Expose partial results and failedAt at top level for easier access
      mcpError.partialResults = error.partialResults;
      mcpError.failedAt = error.failedAt;
      throw mcpError;
    }

    throw createMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to execute flow',
      'flows/execute'
    );
  }
}
