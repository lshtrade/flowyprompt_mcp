# Data Model: MCP Flow Execution Tools

**Feature**: 003-add-mcp-tools
**Date**: 2025-10-07
**Status**: Complete

## Overview

This data model defines the entities and relationships for flow-based template execution. Flows represent multi-step prompt workflows where template outputs feed into subsequent template inputs.

## Entity Definitions

### 1. Flow

**Description**: Represents a complete multi-step prompt workflow with nodes and edges defining execution order.

**Schema**:
```javascript
{
  // Metadata section
  metadata: {
    name: String,           // Required. Flow identifier (e.g., "Marketing_Strategy")
    version: String,        // Required. Semver format (e.g., "1.0.0")
    description: String,    // Optional. Human-readable description
    created: DateTime,      // Optional. ISO 8601 timestamp
    updated: DateTime       // Optional. ISO 8601 timestamp
  },

  // Nodes section - execution steps
  nodes: [FlowNode],        // Required. Minimum 1 node

  // Edges section - connections and dependencies
  edges: [FlowEdge]         // Required. Can be empty for single-node flows
}
```

**Validation Rules**:
- `metadata.name`: Required, alphanumeric + underscores/hyphens only, max 100 chars
- `metadata.version`: Required, must match semver pattern `^\d+\.\d+\.\d+$`
- `metadata.created/updated`: Optional, must be valid ISO 8601 if provided
- `nodes`: Required, minimum 1 node, each node must have unique `id`
- `edges`: Required array (can be empty), each edge must reference existing node IDs
- Graph must be acyclic (no circular dependencies)

**Storage Location**: GitHub repository `flows/` directory as `{name}.json`

**Example**:
```json
{
  "metadata": {
    "name": "Marketing_Strategy",
    "version": "1.0.0",
    "description": "Brand positioning to campaign plan flow",
    "created": "2025-10-07T00:00:00.000Z",
    "updated": "2025-10-07T00:00:00.000Z"
  },
  "nodes": [...],
  "edges": [...]
}
```

---

### 2. FlowNode

**Description**: Represents a single step in a flow. Can be an input point, template execution, or output collection.

**Schema**:
```javascript
{
  id: String,           // Required. Unique within flow (e.g., "node-1")
  type: Enum,           // Required. One of: "template" | "multi_input" | "result"
  position: {           // Optional. Visual layout coordinates
    x: Number,
    y: Number
  },
  data: Object          // Required. Type-specific data (see below)
}
```

**Node Type: template** (executes a saved template):
```javascript
{
  id: "node-2",
  type: "template",
  position: { x: 300, y: 100 },
  data: {
    label: String,              // Required. Display name
    template: String,           // Required. Template content with {variables}
    variables: [String],        // Required. List of variable names used
    selectedTemplateId: String  // Required. Name of saved template to execute
  }
}
```

**Node Type: multi_input** (entry point for initial variables):
```javascript
{
  id: "node-1",
  type: "multi_input",
  position: { x: 100, y: 100 },
  data: {
    label: String,         // Required. Display name
    variables: [String]    // Required. List of initial variable names
  }
}
```

**Node Type: result** (exit point, collects final output):
```javascript
{
  id: "node-4",
  type: "result",
  position: { x: 700, y: 100 },
  data: {
    label: String          // Required. Display name
  }
}
```

**Validation Rules**:
- `id`: Required, unique within flow, max 50 chars
- `type`: Required, must be one of: `template`, `multi_input`, `result`
- `position`: Optional, if provided both x and y must be numbers
- `data.label`: Required for all types
- `data.selectedTemplateId`: Required for template nodes, must reference existing saved template
- `data.variables`: Required for template and multi_input nodes, must be non-empty array

**Execution Behavior**:
- `multi_input`: No execution, provides initial variables to downstream nodes
- `template`: Execute referenced template with collected variables, store output
- `result`: No execution, marks end of flow

---

### 3. FlowEdge

**Description**: Represents a connection between two nodes, defining data flow and execution dependencies.

**Schema**:
```javascript
{
  id: String,        // Required. Unique within flow (e.g., "edge-1")
  source: String,    // Required. Source node ID
  target: String,    // Required. Target node ID
  type: Enum         // Required. One of: "data" | "chain"
}
```

**Edge Type: data** (pass variables without execution dependency):
- Source node's variables are available to target node
- Does not enforce execution order
- Used for multi_input → template connections

**Edge Type: chain** (execution order dependency):
- Target node cannot execute until source node completes
- Source node's output becomes available as `{sourceid}_result` variable
- Used for template → template sequential execution

**Validation Rules**:
- `id`: Required, unique within flow, max 50 chars
- `source`: Required, must reference existing node ID
- `target`: Required, must reference existing node ID, cannot equal source
- `type`: Required, must be `data` or `chain`
- Graph formed by chain edges must be acyclic

**Example**:
```json
{
  "id": "edge-2",
  "source": "node-2",
  "target": "node-3",
  "type": "chain"
}
```

**Variable Mapping**:
When node-2 (Brand_Positioning) outputs content, it becomes available to node-3 as:
- `{node2_result}`: The output content string
- `{node2_template}`: The template name used

---

### 4. ExecutionResult

**Description**: Result from executing a single template node. Used for building execution chain visualization and passing data between nodes.

**Schema**:
```javascript
{
  nodeId: String,            // Required. Node that was executed
  templateName: String,      // Required. Name of template executed
  inputVariables: Object,    // Required. Variables used for this execution
  output: String,            // Required. Generated content from template
  executionTimeMs: Number,   // Required. Milliseconds taken to execute
  timestamp: DateTime        // Required. ISO 8601 execution timestamp
}
```

**Validation Rules**:
- `nodeId`: Required, must match a template node in the flow
- `templateName`: Required, non-empty string
- `inputVariables`: Required, object with string keys and string values
- `output`: Required, can be empty string if template produced no output
- `executionTimeMs`: Required, positive integer
- `timestamp`: Required, valid ISO 8601 timestamp

**Example**:
```json
{
  "nodeId": "node-2",
  "templateName": "Brand_Positioning_Strategy",
  "inputVariables": {
    "company_name": "TechCorp",
    "market": "AI"
  },
  "output": "TechCorp should position as an AI-first enterprise solution provider...",
  "executionTimeMs": 1234,
  "timestamp": "2025-10-07T10:30:00.000Z"
}
```

**Usage**:
- Stored in `intermediateResults` array during execution
- Output made available to downstream nodes via variable mapping
- Returned in final response for debugging and visualization

---

### 5. FlowExecution

**Description**: Complete execution of a flow from start to finish, including all intermediate results and final outcome.

**Schema**:
```javascript
{
  flowId: String,                        // Required. Name of flow executed
  executionId: String,                   // Required. Unique execution identifier
  initialVariables: Object,              // Required. Variables provided at start
  intermediateResults: [ExecutionResult], // Required. Results from each node
  finalResult: String,                   // Required. Output from last node
  totalExecutionTimeMs: Number,          // Required. Total time in milliseconds
  status: Enum                           // Required. "success" | "partial" | "failed"
}
```

**Validation Rules**:
- `flowId`: Required, must match an existing flow name
- `executionId`: Required, format: `{flowId}_{timestamp}`
- `initialVariables`: Required, object with string keys and values
- `intermediateResults`: Required, array of ExecutionResult objects in execution order
- `finalResult`: Required for success status, last result's output
- `totalExecutionTimeMs`: Required, positive integer, sum of all execution times + overhead
- `status`: Required, must be `success`, `partial`, or `failed`

**Status Values**:
- `success`: All nodes executed successfully, finalResult available
- `partial`: Some nodes executed, then failure occurred (intermediateResults available)
- `failed`: Execution failed before any nodes completed (validation error, etc.)

**Example (Success)**:
```json
{
  "flowId": "Marketing_Strategy",
  "executionId": "Marketing_Strategy_1696680000000",
  "initialVariables": {
    "company_name": "TechCorp",
    "market": "AI",
    "budget": "100K"
  },
  "intermediateResults": [
    {
      "nodeId": "node-2",
      "templateName": "Brand_Positioning_Strategy",
      "inputVariables": { "company_name": "TechCorp", "market": "AI" },
      "output": "...",
      "executionTimeMs": 1234,
      "timestamp": "2025-10-07T10:30:00.000Z"
    },
    {
      "nodeId": "node-3",
      "templateName": "Campaign_Creation",
      "inputVariables": {
        "node2_result": "...",
        "budget": "100K"
      },
      "output": "...",
      "executionTimeMs": 1456,
      "timestamp": "2025-10-07T10:30:01.234Z"
    }
  ],
  "finalResult": "...",
  "totalExecutionTimeMs": 2690,
  "status": "success"
}
```

**Example (Partial - Template Not Found)**:
```json
{
  "flowId": "Marketing_Strategy",
  "executionId": "Marketing_Strategy_1696680000000",
  "initialVariables": { "company_name": "TechCorp", "market": "AI" },
  "intermediateResults": [
    {
      "nodeId": "node-2",
      "templateName": "Brand_Positioning_Strategy",
      "inputVariables": { "company_name": "TechCorp", "market": "AI" },
      "output": "...",
      "executionTimeMs": 1234,
      "timestamp": "2025-10-07T10:30:00.000Z"
    }
  ],
  "finalResult": null,
  "totalExecutionTimeMs": 1234,
  "status": "partial",
  "error": {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template not found: Campaign_Creation",
    "failedAt": {
      "nodeId": "node-3",
      "templateName": "Campaign_Creation"
    }
  }
}
```

---

## Relationships

### Flow → FlowNode (1:N)
- One flow contains multiple nodes
- Minimum 1 node per flow
- Each node belongs to exactly one flow
- Node IDs must be unique within the flow

### Flow → FlowEdge (1:N)
- One flow contains multiple edges
- Edges can be empty for single-node flows
- Each edge belongs to exactly one flow
- Edge IDs must be unique within the flow

### FlowNode → FlowEdge (N:M via source/target)
- Each edge connects exactly 2 nodes (source and target)
- One node can be source for multiple edges
- One node can be target for multiple edges
- Graph formed by edges must be acyclic

### FlowExecution → ExecutionResult (1:N)
- One execution contains multiple results
- Results are ordered by execution sequence
- Each result corresponds to one template node execution

### ExecutionResult → FlowNode (N:1)
- Each result references one node
- One node can have multiple results across different executions
- Node type must be "template" (not multi_input or result)

---

## State Transitions

### Flow Execution Lifecycle

```
1. INITIALIZED
   ↓ (Parse flow JSON, validate schema)
2. VALIDATED
   ↓ (Build dependency graph, check cycles)
3. ORDERED
   ↓ (Collect initial variables from multi_input nodes)
4. EXECUTING
   ↓ (For each template node in topological order)
   │  - Collect variables from inputs + previous results
   │  - Execute template via prompts/get
   │  - Store ExecutionResult
   │  - On error → PARTIAL_FAILED
   ↓
5. COMPLETED (status: success)
   OR
   PARTIAL_FAILED (status: partial, intermediateResults available)
   OR
   FAILED (status: failed, validation/fatal error)
```

---

## Variable Resolution

### Priority Order (highest to lowest)

1. **Previous node outputs**: `{nodeid}_result` from executed template nodes
2. **Initial variables**: Provided via `initialVariables` in execution request
3. **Multi-input node variables**: Defined in multi_input node data

### Resolution Algorithm

```javascript
function resolveVariables(targetNode, initialVars, completedResults) {
  const resolved = { ...initialVars }; // Start with initial variables

  // Add outputs from completed nodes
  completedResults.forEach(result => {
    resolved[`${result.nodeId}_result`] = result.output;
    resolved[`${result.nodeId}_template`] = result.templateName;
  });

  // Validate all required variables present
  const required = targetNode.data.variables.filter(v => v.required);
  const missing = required.filter(v => !resolved.hasOwnProperty(v.name));

  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.map(v => v.name).join(', ')}`);
  }

  return resolved;
}
```

---

## Indexes and Caching

### Flow List Cache
- **Key**: `flows:list:{ref}`
- **Value**: Array of flow metadata objects
- **TTL**: 15 minutes (same as templates)
- **Invalidation**: On cache expiration or manual refresh

### Flow Definition Cache
- **Key**: `flow:{flowName}:{ref}`
- **Value**: Complete flow JSON object
- **TTL**: 15 minutes (same as templates)
- **Invalidation**: On cache expiration or manual refresh

### Template Cache (Reused)
- **Key**: `template:{templateName}:{ref}`
- **Value**: Template JSON object
- **TTL**: 15 minutes
- **Reuse**: Flow execution leverages existing template cache

---

## Performance Considerations

### Flow List Operation
- **Target**: <300ms (cached), <2s (cold)
- **Strategy**: Cache entire list, lazy-load flow contents on demand
- **Optimization**: Fetch only metadata fields, skip full node/edge parsing

### Flow Execution Operation
- **Target**: <5s for 3-node chain
- **Strategy**: Parallel template fetching, sequential execution
- **Bottleneck**: Template execution time (depends on template complexity)
- **Optimization**: Reuse template cache, avoid redundant GitHub API calls

### Memory Usage
- **Per execution**: ~10KB per node result (depends on template output size)
- **Maximum**: 50KB per flow execution (assuming 5 nodes with 10KB each)
- **Mitigation**: Stream results in future version if memory becomes issue

---

## Security Considerations

### Flow Definition Validation
- Validate JSON schema before parsing to prevent injection
- Limit flow file size to 1MB to prevent DoS
- Validate node/edge counts (max 50 nodes, 100 edges per flow)

### Template Access Control
- Flow execution inherits template access control from prompts/get
- If user cannot access template X, flow execution fails at that node
- Return partial results with clear error message

### Variable Sanitization
- All variable values treated as plain text (no code execution)
- Variable substitution uses simple string replacement
- No eval() or template literal execution

---

*Data model complete: 2025-10-07*
