// src/mcp/tools/promptsList.js
// MCP Tool: prompts/list - List all available templates

import { log } from '../../utils/logger.js';
import { toMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';
import metricsService from '../../services/metricsService.js';
import promptFormatter from '../formatters/promptFormatter.js';

/**
 * Internal function to get prompts list data (returns raw array)
 * @param {string} ref - Git reference
 * @returns {Promise<Array>} Array of prompt templates
 */
export async function getPromptsListData(ref) {
  const startTime = Date.now();

  // Check cache first
  const cacheKey = `template-list:${ref}`;
  const cached = await cacheService.get(cacheKey);

  if (cached) {
    log.info('Cache hit for template list', { ref }, 'promptsListTool');
    return cached;
  }

  try {
    // Fetch from GitHub
    const templates = await githubService.listTemplates(ref);

    // Format for MCP response with arguments
    // Fetch template metadata for small files only (< 200KB) to extract variables
    const formatted = await Promise.all(templates.map(async (template) => {
      // Skip large files to avoid timeout
      if (template.size > 200000) {
        log.warn('Skipping large template for arguments extraction', {
          name: template.name,
          size: template.size
        }, 'promptsListTool');
        return {
          name: template.name,
          description: `Prompt template: ${template.name}`,
          arguments: [],
        };
      }

      try {
        // Fetch template content to extract variables
        const result = await githubService.fetchFile('template', template.name, ref);
        const content = result.content;

        // Support FlowyPrompt format
        let actualTemplate = content;
        if (content.templates && Array.isArray(content.templates) && content.templates.length > 0) {
          actualTemplate = content.templates[0];
        }

        let templateVars = [];
        let variableValueSets = [];
        let description = `Prompt template: ${template.name}`;

        if (actualTemplate.template && actualTemplate.variables) {
          // FlowyPrompt format
          templateVars = actualTemplate.variables || [];
          variableValueSets = actualTemplate.variableValueSets || [];
          description = actualTemplate.title || description;
        } else if (actualTemplate.metadata) {
          // Original format
          templateVars = (actualTemplate.variables || []).map(v => v.name);
          description = actualTemplate.metadata.description || description;
        }

        const arguments_ = [];

        // Add variable value set selector if available (as first argument for better UX)
        if (variableValueSets.length > 0) {
          // Create enum with variable set names for dropdown selection
          const setOptions = variableValueSets.map(vs => vs.name);

          arguments_.push({
            name: '_variableSet',
            description: 'Select a pre-filled variable set',
            required: false,
            // Note: MCP doesn't support enum in arguments yet, but we can simulate with description
            // enum: setOptions, // This would be ideal when MCP supports it
          });

          // Add each variable set as a separate option with all values shown
          variableValueSets.forEach((vs, index) => {
            const varsPreview = Object.entries(vs.values || {})
              .map(([k, v]) => `${k}=${v}`)
              .join(', ');

            arguments_.push({
              name: `_useSet_${vs.name}`,
              description: `Use "${vs.name}" (enter X to use): ${varsPreview}`,
              required: false,
            });
          });
        }

        // Add individual variables
        if (Array.isArray(templateVars)) {
          templateVars.forEach((v) => {
            arguments_.push({
              name: typeof v === 'string' ? v : v.name,
              description: typeof v === 'string' ? `Value for ${v}` : (v.description || `Value for ${v.name}`),
              required: false,
            });
          });
        }

        return {
          name: template.name,
          description: description,
          arguments: arguments_,
        };
      } catch (error) {
        // If fetching fails, return basic info without arguments
        log.warn('Failed to fetch template details for list', {
          name: template.name,
          error: error.message
        }, 'promptsListTool');
        return {
          name: template.name,
          description: `Prompt template: ${template.name}`,
          arguments: [],
        };
      }
    }));

    // Cache the result
    await cacheService.set(cacheKey, formatted);

    // Record metrics
    const latencyMs = Date.now() - startTime;
    metricsService.recordMcpTool('prompts_list', true);

    log.info('Successfully processed prompts_list', {
      ref,
      count: formatted.length,
      latencyMs,
    }, 'promptsListTool');

    return formatted;
  } catch (error) {
    log.error('Error processing prompts_list', error, { ref }, 'promptsListTool');
    metricsService.recordMcpTool('prompts_list', false);
    metricsService.recordError(error.code || 'INTERNAL_ERROR');

    throw toMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to list templates'
    );
  }
}

/**
 * MCP Tool handler for prompts_list (returns MCP tool format)
 * @param {object} args - Tool arguments
 * @returns {Promise<object>} MCP tool response
 */
export default async function promptsListTool(args) {
  const { ref = 'main' } = args;

  try {
    const formatted = await getPromptsListData(ref);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formatted, null, 2),
        }
      ],
      isError: false,
    };
  } catch (error) {
    throw error; // Re-throw MCP errors from getPromptsListData
  }
}
