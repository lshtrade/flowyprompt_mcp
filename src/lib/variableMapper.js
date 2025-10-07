// Variable mapper for resolving template inputs from multiple sources
// Priority: Previous node outputs > Initial variables

/**
 * Map variables for a target node from initial variables and completed results
 * @param {Object} targetNode - The node that needs variables resolved
 * @param {Object} initialVars - Initial variables provided by user
 * @param {Array} completedResults - Array of ExecutionResult objects from previously executed nodes
 * @returns {Object} Merged variables object ready for template execution
 */
export function mapVariables(targetNode, initialVars, completedResults) {
  // Start with copy of initial variables
  const resolved = { ...initialVars };

  // Add outputs from completed nodes
  // Each completed node contributes:
  // - {nodeid}_result: the template output
  // - {nodeid}_template: the template name
  completedResults.forEach(result => {
    // Use nodeId with hyphens removed for valid variable names
    const nodeIdKey = result.nodeId.replace(/-/g, '');
    resolved[`${nodeIdKey}_result`] = result.output;
    resolved[`${nodeIdKey}_template`] = result.templateName;
  });

  return resolved;
}

export default { mapVariables };
