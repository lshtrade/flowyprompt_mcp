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
    flowService.parseFlow(flow);

    // Execute flow
    const executionResult = await flowExecutionService.executeFlow(
      flow,
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
