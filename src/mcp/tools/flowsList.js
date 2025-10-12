// src/mcp/tools/flowsList.js
// MCP Tool: flows/list - List available flow templates

import { log } from '../../utils/logger.js';
import { createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';

/**
 * Handle flows/list tool request
 * @param {object} args - Tool arguments {includeMetadata?: boolean, ref?: string}
 * @returns {Promise<object>} MCP tool response with flows array
 */
export default async function flowsListTool(args = {}) {
  const startTime = Date.now();
  const { includeMetadata = true, ref = 'main' } = args;

  try {
    log.info('Processing flows_list request', { ref, includeMetadata }, 'flowsListTool');

    // Check cache for flow list
    const cacheKey = `flows:list:${ref}`;
    let cachedFlows = await cacheService.get(cacheKey);

    if (cachedFlows) {
      const latencyMs = Date.now() - startTime;
      log.info('Returning cached flows list', {
        count: cachedFlows.length,
        latencyMs,
        cached: true
      }, 'flowsListTool');

      return {
        flows: cachedFlows,
        cached: true
      };
    }

    // Fetch flow files from GitHub (just metadata, not content)
    const flowFiles = await githubService.listFlows(ref);
    
    log.info('Found flow files', { count: flowFiles.length, files: flowFiles.map(f => f.name) }, 'flowsListTool');

    // Fetch and parse each flow file
    const flows = [];
    const errors = [];
    
    for (const flowFile of flowFiles) {
      try {
        // Skip large files to avoid timeout
        if (flowFile.size > 500000) {
          log.warn('Skipping large flow file', {
            name: flowFile.name,
            size: flowFile.size
          }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: 'File too large' });
          continue;
        }

        // Fetch flow file content
        log.debug('Fetching flow content', { name: flowFile.name }, 'flowsListTool');
        const result = await githubService.fetchFlow(flowFile.name, ref);
        const flowFileContent = result.content;

        // Log flow file structure for debugging
        log.debug('Processing flow file', { 
          name: flowFile.name,
          hasContent: !!flowFileContent,
          hasMetadata: !!flowFileContent?.metadata,
          hasFlows: !!flowFileContent?.flows,
          flowsCount: flowFileContent?.flows?.length || 0
        }, 'flowsListTool');

        // Validate flow file has required structure
        if (!flowFileContent) {
          const errorMsg = 'Flow file content is null or undefined';
          log.warn('Skipping invalid flow file', { name: flowFile.name, reason: errorMsg }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: errorMsg });
          continue;
        }

        if (!flowFileContent.flows || !Array.isArray(flowFileContent.flows)) {
          const errorMsg = 'Flow file missing flows array';
          log.warn('Skipping invalid flow file', { name: flowFile.name, reason: errorMsg }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: errorMsg });
          continue;
        }

        if (flowFileContent.flows.length === 0) {
          const errorMsg = 'Flow file has empty flows array';
          log.warn('Skipping empty flow file', { name: flowFile.name, reason: errorMsg }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: errorMsg });
          continue;
        }

        // Extract metadata from the first flow in the file
        const firstFlow = flowFileContent.flows[0];
        
        if (!firstFlow.meta) {
          const errorMsg = 'Flow missing meta object';
          log.warn('Skipping invalid flow', { name: flowFile.name, reason: errorMsg }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: errorMsg });
          continue;
        }

        if (!firstFlow.nodes) {
          const errorMsg = 'Flow missing nodes array';
          log.warn('Skipping invalid flow', { name: flowFile.name, reason: errorMsg }, 'flowsListTool');
          errors.push({ name: flowFile.name, error: errorMsg });
          continue;
        }

        const flowMetadata = {
          id: firstFlow.meta.id,
          name: firstFlow.meta.name || flowFile.name,
          fileName: flowFile.name,
          description: firstFlow.meta.description || '',
          version: firstFlow.meta.version || '1.0.0',
          nodeCount: firstFlow.nodes.length,
          edgeCount: firstFlow.edges ? firstFlow.edges.length : 0
        };

        // Add optional metadata if requested
        if (includeMetadata) {
          if (firstFlow.meta.created_at) {
            flowMetadata.created = firstFlow.meta.created_at;
          }
          if (firstFlow.meta.updated_at) {
            flowMetadata.updated = firstFlow.meta.updated_at;
          }
        }

        flows.push(flowMetadata);
        log.debug('Successfully processed flow', { name: flowFile.name, metadata: flowMetadata }, 'flowsListTool');
      } catch (error) {
        log.error('Error parsing flow metadata, skipping', error, {
          name: flowFile.name,
          errorMessage: error.message,
          stack: error.stack
        }, 'flowsListTool');
        errors.push({ name: flowFile.name, error: error.message });
        // Continue with other flows
      }
    }

    // Cache the flows list
    await cacheService.set(cacheKey, flows);

    const latencyMs = Date.now() - startTime;
    log.info('Successfully processed flows_list', {
      count: flows.length,
      errorCount: errors.length,
      latencyMs,
      cached: false
    }, 'flowsListTool');

    const result = {
      flows,
      cached: false
    };

    // Include errors in response if any occurred
    if (errors.length > 0) {
      result.errors = errors;
      log.warn('Some flows failed to process', { errorCount: errors.length, errors }, 'flowsListTool');
    }

    return result;
  } catch (error) {
    log.error('Error processing flows_list', error, { ref }, 'flowsListTool');

    throw createMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to list flows'
    );
  }
}
