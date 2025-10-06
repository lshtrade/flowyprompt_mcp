// src/mcp/tools/getVariableSets.js
// MCP Tool: get_variable_sets - Get variable value sets for a template

import { log } from '../../utils/logger.js';
import { toMcpError, createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';
import metricsService from '../../services/metricsService.js';

/**
 * Handle get_variable_sets tool request
 * @param {object} args - Tool arguments {name: string, ref?: string, setName?: string}
 * @returns {Promise<object>} MCP tool response with variable sets
 */
export default async function getVariableSets(args) {
  const startTime = Date.now();
  const { name, ref = 'main', setName } = args;

  if (!name) {
    throw createMcpError('INVALID_REQUEST', 'Template name is required', 'request');
  }

  try {
    log.info('Processing get_variable_sets request', { name, ref, setName }, 'getVariableSets');

    // Check cache for template
    const cacheKey = `template:${name}:${ref}`;
    let template = await cacheService.get(cacheKey);
    let cached = !!template;

    if (!template) {
      // Fetch from GitHub
      const result = await githubService.fetchFile('template', name, ref);
      template = result.content;

      // Cache the template
      await cacheService.set(cacheKey, template);
      cached = false;
    }

    // Support FlowyPrompt format
    let actualTemplate = template;
    if (template.templates && Array.isArray(template.templates) && template.templates.length > 0) {
      actualTemplate = template.templates[0];
    }

    // Extract variable value sets
    const variableValueSets = actualTemplate.variableValueSets || [];

    if (variableValueSets.length === 0) {
      const emptyResult = {
        message: `No variable sets found for template: ${name}`,
        template: name,
        sets: [],
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(emptyResult, null, 2),
          }
        ],
        isError: false,
      };
    }

    // If specific set requested, return only that one with filled template
    if (setName) {
      const selectedSet = variableValueSets.find(
        vs => vs.name === setName || vs.id === setName
      );

      if (!selectedSet) {
        throw createMcpError(
          'NOT_FOUND',
          `Variable set '${setName}' not found in template '${name}'`,
          'template'
        );
      }

      // Generate prompt with variable set
      let templateText = actualTemplate.template || '';
      for (const [key, value] of Object.entries(selectedSet.values || {})) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        templateText = templateText.replace(regex, value);
      }

      const setResult = {
        template: name,
        setName: selectedSet.name,
        description: selectedSet.description || '',
        variables: selectedSet.values,
        filledTemplate: templateText,
      };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(setResult, null, 2),
          }
        ],
        isError: false,
      };
    }

    // Return all variable sets as list
    const sets = variableValueSets.map(vs => ({
      id: vs.id,
      name: vs.name,
      description: vs.description || '',
      variables: vs.values,
      variableCount: Object.keys(vs.values || {}).length,
    }));

    // Record metrics
    const latencyMs = Date.now() - startTime;
    metricsService.recordRequest('template', latencyMs, cached);

    log.info('Successfully processed get_variable_sets', {
      name,
      ref,
      cached,
      setCount: sets.length,
      latencyMs,
    }, 'getVariableSets');

    const listResult = {
      template: name,
      sets: sets,
      totalSets: sets.length,
    };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(listResult, null, 2),
        }
      ],
      isError: false,
    };
  } catch (error) {
    log.error('Error processing get_variable_sets', error, { name, ref }, 'getVariableSets');
    metricsService.recordError(error.code || 'INTERNAL_ERROR');

    throw toMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to get variable sets'
    );
  }
}
