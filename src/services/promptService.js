// src/services/promptService.js
// Prompt generation and variable extraction service
import { log } from '../utils/logger.js';

/**
 * Extract variable names from content using {{variable}} pattern
 * @param {string} content - Content with {{variable}} placeholders
 * @returns {string[]} Array of unique variable names
 */
function extractVariablesFromContent(content) {
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const found = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    found.add(match[1]); // Extract variable name (without {{ }})
  }

  return Array.from(found);
}

/**
 * Validate template variable definitions against content usage
 * @param {object} template - Template object with variables[] and results[]
 * @returns {object} Validation result with undefinedVars and unusedVars
 */
function validateVariables(template) {
  const definedVars = new Set(template.variables.map((v) => v.name));
  const contentVars = new Set();

  // Extract from all result sections
  for (const result of template.results) {
    const vars = extractVariablesFromContent(result.content);
    vars.forEach((v) => contentVars.add(v));
  }

  // Check for mismatches
  const undefinedVars = [...contentVars].filter((v) => !definedVars.has(v));
  const unusedVars = [...definedVars].filter((v) => !contentVars.has(v));

  return {
    valid: undefinedVars.length === 0,
    undefinedVars, // Used in content but not defined in variables[]
    unusedVars, // Defined in variables[] but not used in content
  };
}

/**
 * Validate variables and log warnings (per research.md clarification #1)
 * @param {object} template - Template object
 * @param {object} logger - Logger instance
 * @returns {object} Validation result
 */
function validateOrWarn(template, logger = log) {
  const validation = validateVariables(template);

  if (validation.undefinedVars.length > 0) {
    logger.warn('Template has undefined variables', {
      template: template.metadata.name,
      undefinedVars: validation.undefinedVars,
      message: 'Variables used in content but not defined in variables[]',
    });
    // Continue execution - flexibility for template authors
  }

  if (validation.unusedVars.length > 0) {
    logger.warn('Template has unused variables', {
      template: template.metadata.name,
      unusedVars: validation.unusedVars,
      message: 'Variables defined but not used in content',
    });
  }

  return validation;
}

/**
 * Substitute variables in content
 * @param {string} content - Content with {{variable}} placeholders
 * @param {object} values - Variable values {name: value}
 * @returns {string} Content with variables substituted
 */
function substituteVariables(content, values) {
  let result = content;

  // First, extract all variables from content
  const allVars = extractVariablesFromContent(content);

  // Replace each variable (use empty string if value not provided)
  for (const varName of allVars) {
    const value = values[varName] || '';
    const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Generate complete prompt with variable substitution
 * @param {object} template - Template object
 * @param {object} variableValues - Variable values {name: value}
 * @returns {string} Markdown-formatted prompt
 */
function generatePrompt(template, variableValues) {
  // 1. Build metadata header
  let prompt = `# ${template.metadata.name}\n\n`;
  prompt += `${template.metadata.description}\n\n`;
  prompt += `**Version**: ${template.metadata.version}\n`;

  if (template.metadata.tags && template.metadata.tags.length > 0) {
    prompt += `**Tags**: ${template.metadata.tags.join(', ')}\n`;
  }

  prompt += '\n---\n\n';

  // 2. Substitute and append results sections
  for (const result of template.results) {
    const substituted = substituteVariables(result.content, variableValues);
    prompt += substituted + '\n\n---\n\n';
  }

  return prompt.trim();
}

export default {
  extractVariablesFromContent,
  validateVariables,
  validateOrWarn,
  substituteVariables,
  generatePrompt,
};
