// src/mcp/formatters/promptFormatter.js
// Format prompts for MCP responses

/**
 * Format template metadata for MCP prompts/list response
 * @param {object} template - Template object
 * @returns {object} Formatted prompt metadata
 */
export function formatPromptMetadata(template) {
  return {
    name: template.metadata?.name || template.name,
    description: template.metadata?.description || `Prompt template: ${template.name}`,
    arguments: (template.variables || []).map((v) => ({
      name: v.name,
      description: v.description || '',
      required: v.required !== false,
    })),
  };
}

/**
 * Format generated prompt for MCP prompts/get response
 * @param {string} content - Generated prompt content
 * @param {object} template - Original template object
 * @returns {object} Formatted prompt response
 */
export function formatPromptResponse(content, template) {
  return {
    description: template.metadata?.description || '',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: content,
        },
      },
    ],
  };
}

/**
 * Format template list for MCP response
 * @param {Array} templates - Array of template objects
 * @returns {Array} Formatted template list
 */
export function formatTemplateList(templates) {
  return templates.map((template) => ({
    name: template.name,
    description: template.description || `Prompt template: ${template.name}`,
    arguments: template.arguments || [],
  }));
}

export default {
  formatPromptMetadata,
  formatPromptResponse,
  formatTemplateList,
};
