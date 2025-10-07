// src/mcp/tools/promptsGet.js
// MCP Tool: prompts/get - Get specific template with variable substitution

import { log } from '../../utils/logger.js';
import { toMcpError, createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';
import metricsService from '../../services/metricsService.js';
import promptService from '../../services/promptService.js';
import promptFormatter from '../formatters/promptFormatter.js';

/**
 * Handle prompts/get tool request
 * @param {object} args - Tool arguments {name: string, ref?: string, variables?: object}
 * @returns {Promise<object>} MCP tool response with generated prompt
 */
export default async function promptsGetTool(args) {
  const startTime = Date.now();
  const { name, ref = 'main', variables = {} } = args;

  if (!name) {
    throw createMcpError('INVALID_REQUEST', 'Template name is required', 'request');
  }

  try {
    log.info('Processing prompts_get request', { name, ref }, 'promptsGetTool');

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

    // Support FlowyPrompt format: {templates: [{template, variables}]}
    let actualTemplate = template;
    if (template.templates && Array.isArray(template.templates) && template.templates.length > 0) {
      actualTemplate = template.templates[0];
    }

    // Extract variables and content based on format
    let templateText = '';
    let templateVars = [];
    let variableValueSets = [];
    let templateTitle = name;

    if (actualTemplate.template && actualTemplate.variables) {
      // FlowyPrompt format
      templateText = actualTemplate.template;
      templateVars = actualTemplate.variables || [];
      variableValueSets = actualTemplate.variableValueSets || [];
      templateTitle = actualTemplate.title || name;
    } else if (actualTemplate.metadata && actualTemplate.results) {
      // Original format (fallback)
      // Handle case where results might be a string or array
      if (Array.isArray(actualTemplate.results)) {
        templateText = actualTemplate.results.map(r => r.content).join('\n');
      } else if (typeof actualTemplate.results === 'string') {
        templateText = actualTemplate.results;
      } else if (actualTemplate.results && actualTemplate.results.content) {
        templateText = actualTemplate.results.content;
      } else {
      // Try to handle unknown formats gracefully
      log.warn('Unknown template format, attempting to extract content', {
        templateName: name,
        availableKeys: Object.keys(actualTemplate),
        templateType: typeof actualTemplate
      }, 'promptsGetTool');
      
      // Last resort: try to extract content from various possible locations
      if (typeof actualTemplate === 'string') {
        templateText = actualTemplate;
      } else if (actualTemplate.content) {
        templateText = typeof actualTemplate.content === 'string' 
          ? actualTemplate.content 
          : JSON.stringify(actualTemplate.content);
      } else if (actualTemplate.template) {
        templateText = actualTemplate.template;
      } else {
        throw createMcpError(
          'VALIDATION_ERROR',
          `Invalid template structure: unsupported format. Available keys: ${Object.keys(actualTemplate).join(', ')}`,
          'template'
        );
      }
      templateTitle = actualTemplate.title || actualTemplate.name || name;
    }
    }

    // Handle variable value set selection
    let finalVariables = { ...variables };
    let selectedSetName = null;

    // Check for _useSet_ pattern (any non-empty value means selected)
    for (const [key, value] of Object.entries(variables)) {
      if (key.startsWith('_useSet_') && value && value.toString().trim() !== '') {
        selectedSetName = key.replace('_useSet_', '');
        log.info('Variable set selected via _useSet pattern', {
          key,
          value,
          setName: selectedSetName
        }, 'promptsGetTool');
        break;
      }
    }

    // Fallback to _variableSet (text input)
    if (!selectedSetName && variables._variableSet) {
      selectedSetName = variables._variableSet;
      log.info('Variable set selected via _variableSet', {
        setName: selectedSetName
      }, 'promptsGetTool');
    }

    // Apply variable set if found
    if (selectedSetName && variableValueSets.length > 0) {
      const selectedSet = variableValueSets.find(
        vs => vs.name === selectedSetName || vs.id === selectedSetName
      );

      if (selectedSet && selectedSet.values) {
        // Merge variable set values with provided variables (provided variables take precedence)
        finalVariables = { ...selectedSet.values, ...variables };

        // Remove all selector variables
        delete finalVariables._variableSet;
        Object.keys(finalVariables).forEach(key => {
          if (key.startsWith('_useSet_')) {
            delete finalVariables[key];
          }
        });

        log.info('Applied variable value set', {
          setName: selectedSet.name,
          variables: Object.keys(selectedSet.values)
        }, 'promptsGetTool');
      }
    }

    // Extract arguments for MCP
    const arguments_ = [];

    // Add variable value set selector if available (as first argument for better UX)
    if (variableValueSets.length > 0) {
      arguments_.push({
        name: '_variableSet',
        description: 'Select a pre-filled variable set',
        required: false,
      });

      // Add each variable set as a separate option
      variableValueSets.forEach((vs) => {
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

    // Substitute variables in template text
    // Replace {variable} with actual values
    let generatedPrompt = templateText;
    for (const [key, value] of Object.entries(finalVariables)) {
      if (key === '_variableSet') continue; // Skip the selector
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      generatedPrompt = generatedPrompt.replace(regex, value);
    }

    // Record metrics
    const latencyMs = Date.now() - startTime;
    metricsService.recordMcpTool('prompts_get', true);
    metricsService.recordPromptGeneration(latencyMs);
    metricsService.recordRequest('template', latencyMs, cached);

    log.info('Successfully processed prompts_get', {
      name,
      ref,
      cached,
      variableCount: Object.keys(variables).length,
      latencyMs,
    }, 'promptsGetTool');

    return {
      content: generatedPrompt,
      description: templateTitle,
      arguments: arguments_,
      isError: false,
    };
  } catch (error) {
    log.error('Error processing prompts_get', error, { name, ref }, 'promptsGetTool');
    metricsService.recordMcpTool('prompts_get', false);
    metricsService.recordError(error.code || 'INTERNAL_ERROR');

    throw toMcpError(
      error.code || 'INTERNAL_ERROR',
      error.message || 'Failed to get template'
    );
  }
}
