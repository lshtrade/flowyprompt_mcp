// src/mcp/tools/promptTemplateShow.js
// MCP Tool: prompt_template_show - Show title/template/variables from a template JSON

import { log } from '../../utils/logger.js';
import { toMcpError, createMcpError } from '../../utils/errorHandler.js';
import githubService from '../../services/githubService.js';
import cacheService from '../../services/cacheService.js';
import metricsService from '../../services/metricsService.js';

/**
 * Normalize a FlowyPrompt template JSON into an array of { title, template, variables }
 * Supports input formats:
 *  - FlowyPrompt export with metadata and templates array
 *  - Single template object with title/template/variables
 *  - Fallbacks from older formats when possible
 */
function extractTemplates(normalizedJson, fallbackName) {
  const results = [];

  // FlowyPrompt export format: { metadata, templates: [ { title, template, variables } ] }
  if (normalizedJson && Array.isArray(normalizedJson.templates)) {
    for (const t of normalizedJson.templates) {
      const title = t.title || fallbackName || 'Untitled';
      const template = t.template || '';
      const variables = Array.isArray(t.variables) ? t.variables : [];
      results.push({ title, template, variables });
    }
    return results;
  }

  // Single template object
  if (normalizedJson && (normalizedJson.template || normalizedJson.variables)) {
    const title = normalizedJson.title || fallbackName || 'Untitled';
    const template = normalizedJson.template || '';
    const variables = Array.isArray(normalizedJson.variables) ? normalizedJson.variables : [];
    results.push({ title, template, variables });
    return results;
  }

  // Older format fallback: { metadata, results or content, variables }
  if (normalizedJson && (normalizedJson.metadata || normalizedJson.results || normalizedJson.content)) {
    const title = normalizedJson.title || normalizedJson.metadata?.title || fallbackName || 'Untitled';
    let template = '';

    if (Array.isArray(normalizedJson.results)) {
      template = normalizedJson.results.map(r => (typeof r === 'string' ? r : r.content)).join('\n');
    } else if (typeof normalizedJson.results === 'string') {
      template = normalizedJson.results;
    } else if (normalizedJson.results && typeof normalizedJson.results === 'object' && normalizedJson.results.content) {
      template = typeof normalizedJson.results.content === 'string' ? normalizedJson.results.content : JSON.stringify(normalizedJson.results.content);
    } else if (normalizedJson.content) {
      template = typeof normalizedJson.content === 'string' ? normalizedJson.content : JSON.stringify(normalizedJson.content);
    }

    const variables = Array.isArray(normalizedJson.variables)
      ? normalizedJson.variables.map(v => (typeof v === 'string' ? v : (v.name || v)))
      : [];

    results.push({ title, template, variables });
    return results;
  }

  // If nothing matched, return empty
  return results;
}

/**
 * Handle prompt_template_show tool request
 * @param {object} args - { name: string, ref?: string, variables?: string }
 * @returns {Promise<object>} MCP tool response listing simplified templates
 */
export default async function promptTemplateShowTool(args) {
  const startTime = Date.now();
  const { name, ref = 'main', variables = 'false' } = args || {};

  if (!name) {
    throw createMcpError('INVALID_REQUEST', 'Template name is required', 'request');
  }

  try {
    log.info('Processing prompt_template_show', { name, ref }, 'promptTemplateShow');

    const includeVariables = variables === 'true';
    const cacheKey = `prompt_template_show:${name}:${ref}:${includeVariables}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      metricsService.recordMcpTool('prompt_template_show', true);
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }],
        isError: false,
      };
    }

    // Fetch template JSON from repo
    const file = await githubService.fetchFile('template', name, ref);
    const json = file.content;

    if (!json || typeof json !== 'object') {
      throw createMcpError('VALIDATION_ERROR', 'Template file content is not valid JSON', 'template');
    }

    const items = extractTemplates(json, name);

    // Validate minimal structure
    const output = items.map(item => {
      const result = {
        template: typeof item.template === 'string' ? item.template : JSON.stringify(item.template ?? ''),
      };
      
      if (includeVariables) {
        result.title = item.title || name;
        result.variables = Array.isArray(item.variables) ? item.variables : [];
      }
      
      return result;
    });

    await cacheService.set(cacheKey, output);

    const latencyMs = Date.now() - startTime;
    metricsService.recordMcpTool('prompt_template_show', true);
    log.info('Successfully processed prompt_template_show', { name, ref, count: output.length, latencyMs }, 'promptTemplateShow');

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      isError: false,
    };
  } catch (error) {
    log.error('Error processing prompt_template_show', error, { name, ref }, 'promptTemplateShow');
    metricsService.recordMcpTool('prompt_template_show', false);
    metricsService.recordError(error.code || 'INTERNAL_ERROR');
    throw toMcpError(error.code || 'INTERNAL_ERROR', error.message || 'Failed to show prompt template');
  }
}


