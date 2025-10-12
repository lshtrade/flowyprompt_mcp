# Research: MCP Flow Execution Tools

**Feature**: 003-add-mcp-tools
**Date**: 2025-10-07
**Status**: Complete

## Research Decisions

### 1. Topological Sort Implementation

**Decision**: Use **graphlib** library

**Rationale**:
- Industry-standard graph library used by workflow engines (Webpack, Grunt)
- Built-in cycle detection with clear error messages
- Robust topological sort implementation (Kahn's algorithm)
- Small bundle size (~15KB minified)
- Active maintenance (last update within 6 months)
- Well-documented API

**Alternatives Considered**:
- **toposort** (9KB): Simpler but no graph data structure, requires manual edge management
- **dag-map** (8KB): Minimal API, less battle-tested
- **Custom implementation**: Would require extensive testing for edge cases (cycles, disconnected graphs)

**Implementation Approach**:
```javascript
import { Graph, alg } from 'graphlib';

function orderFlowNodes(nodes, edges) {
  const graph = new Graph();

  nodes.forEach(node => graph.setNode(node.id, node));
  edges.forEach(edge => graph.setEdge(edge.source, edge.target));

  // Detect cycles
  if (!alg.isAcyclic(graph)) {
    const cycles = alg.findCycles(graph);
    throw new Error(`Circular dependency detected: ${JSON.stringify(cycles[0])}`);
  }

  // Get execution order
  const ordered = alg.topsort(graph);
  return ordered.map(id => graph.node(id));
}
```

### 2. Variable Mapping Strategy

**Decision**: **Auto-map by name with validation**

**Rationale**:
- Simplicity: Users don't need to specify mapping explicitly
- Consistency: Matches existing `{variable}` placeholder syntax
- Error detection: Validate at execution time, report missing/extra variables
- Debugging: Clear error messages showing which variables failed to map

**Alternatives Considered**:
- **Explicit edge mapping**: JSONPath expressions in edges (e.g., `{result} → {context}`)
  - Rejected: Too complex for initial version, can add later if needed
- **Dot notation**: Access nested output properties (e.g., `output.summary → context`)
  - Rejected: Requires output structure standardization, adds complexity

**Implementation Approach**:
```javascript
function mapVariables(sourceOutput, targetVariables) {
  const mapped = {};
  const missing = [];

  targetVariables.forEach(varDef => {
    const varName = varDef.name;

    // Try to find variable in source output
    // For initial version, assume output is flat key-value object
    if (sourceOutput.hasOwnProperty(varName)) {
      mapped[varName] = sourceOutput[varName];
    } else if (varDef.required) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(', ')}`);
  }

  return mapped;
}
```

**Future Enhancement**: Support explicit mapping in edge `data` field for advanced use cases.

### 3. Flow Validation Approach

**Decision**: **JSON Schema with ajv validator**

**Rationale**:
- Consistency: Project already uses Joi for config validation, but JSON Schema is better for data structures
- Standard: JSON Schema is widely adopted for API contracts
- Error messages: ajv provides detailed validation errors with property paths
- Performance: ajv compiles schemas for fast validation
- Ecosystem: Better tooling support (VSCode autocomplete, documentation generation)

**Alternatives Considered**:
- **Joi**: Currently used for config validation
  - Rejected: Designed for configuration objects, not complex nested data
- **Custom validation**: Manual field checking
  - Rejected: Error-prone, difficult to maintain, poor error messages

**Schema Structure**:
```javascript
const flowSchema = {
  type: 'object',
  required: ['metadata', 'nodes', 'edges'],
  properties: {
    metadata: {
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: { type: 'string', pattern: '^[A-Za-z0-9_-]+$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        description: { type: 'string' },
        created: { type: 'string', format: 'date-time' },
        updated: { type: 'string', format: 'date-time' }
      }
    },
    nodes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'type', 'data'],
        properties: {
          id: { type: 'string' },
          type: { enum: ['template', 'multi_input', 'result'] },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } }
          },
          data: { type: 'object' }
        }
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'source', 'target'],
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          type: { enum: ['data', 'chain'] }
        }
      }
    }
  }
};
```

### 4. Error Handling Strategy

**Decision**: **Fail-fast with partial results**

**Rationale**:
- User value: Show what succeeded before failure occurred
- Debugging: Easier to identify which template caused failure
- Consistency: Matches user expectation from spec (Scenario 4)
- Simplicity: No complex state management for retry/resume

**Error Response Structure**:
```javascript
{
  code: 'EXECUTION_ERROR',
  message: 'Template execution failed at node: Campaign_Plan',
  source: 'flows/execute',
  partialResults: [
    {
      nodeId: 'node-1',
      templateName: 'Brand_Positioning',
      inputVariables: { company: 'TechCorp', market: 'AI' },
      output: '... successful output ...',
      executionTimeMs: 1234,
      timestamp: '2025-10-07T10:30:00.000Z'
    }
  ],
  failedAt: {
    nodeId: 'node-2',
    templateName: 'Campaign_Plan',
    error: 'Template not found: Campaign_Plan'
  }
}
```

**Alternatives Considered**:
- **Continue on error**: Execute remaining nodes despite failures
  - Rejected: Downstream nodes depend on upstream outputs, would cascade failures
- **Retry with backoff**: Automatic retry for failed templates
  - Rejected: Not needed for initial version, can add later if GitHub API flakiness becomes issue

### 5. FlowyPrompt JSON Format Analysis

**Canonical Structure** (from user example):
```json
{
  "metadata": {
    "name": "Marketing_Strategy",
    "version": "1.0.0",
    "description": "Multi-step marketing strategy flow",
    "created": "2025-10-07T00:00:00.000Z",
    "updated": "2025-10-07T00:00:00.000Z"
  },
  "nodes": [
    {
      "id": "node-1",
      "type": "multi_input",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Initial Inputs",
        "variables": ["company_name", "market", "budget"]
      }
    },
    {
      "id": "node-2",
      "type": "template",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Brand Positioning",
        "template": "Analyze brand positioning for {company_name} in {market} market",
        "variables": ["company_name", "market"],
        "selectedTemplateId": "Brand_Positioning_Strategy"
      }
    },
    {
      "id": "node-3",
      "type": "template",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "Campaign Plan",
        "template": "Create campaign plan based on {positioning_result}",
        "variables": ["positioning_result", "budget"],
        "selectedTemplateId": "Campaign_Creation"
      }
    },
    {
      "id": "node-4",
      "type": "result",
      "position": { "x": 700, "y": 100 },
      "data": {
        "label": "Final Output"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "type": "data"
    },
    {
      "id": "edge-2",
      "source": "node-2",
      "target": "node-3",
      "type": "chain"
    },
    {
      "id": "edge-3",
      "source": "node-1",
      "target": "node-3",
      "type": "data"
    },
    {
      "id": "edge-4",
      "source": "node-3",
      "target": "node-4",
      "type": "chain"
    }
  ]
}
```

**Key Findings**:
- **Node Types**:
  - `multi_input`: Entry point, provides initial variables (no template execution)
  - `template`: Executes a saved template, references `selectedTemplateId`
  - `result`: Exit point, collects final output (no execution)

- **Edge Types**:
  - `data`: Pass variables without execution dependency
  - `chain`: Execution order dependency (source must complete before target)

- **Execution Logic**:
  1. Find all `multi_input` nodes → collect initial variables
  2. Build dependency graph from `chain` edges
  3. Execute template nodes in topological order
  4. For each node, collect variables from:
     - Initial inputs (from multi_input nodes)
     - Outputs from preceding nodes (connected by edges)
  4. Store output in `{nodeid}_result` variable for downstream consumption
  5. Final result is output from last node before `result` type

### 6. Template Output Handling

**Decision**: **Wrap output in standard structure**

**Problem**: Template execution returns string content, but we need to pass structured data between nodes.

**Solution**:
```javascript
// After template execution
const executionResult = {
  nodeId: 'node-2',
  templateName: 'Brand_Positioning_Strategy',
  inputVariables: { company_name: 'TechCorp', market: 'AI' },
  output: '... generated content string ...',
  executionTimeMs: 1234,
  timestamp: '2025-10-07T10:30:00.000Z'
};

// Make output available to downstream nodes as variables
const outputVariables = {
  [`${nodeId}_result`]: executionResult.output,
  [`${nodeId}_template`]: executionResult.templateName,
  // Future: Parse output for structured extraction
};
```

**Variable Naming Convention**:
- Template output → `{nodeid}_result` variable
- Template name → `{nodeid}_template` variable
- Downstream templates reference like: `{node2_result}` in their template text

**Rationale**:
- Unique naming prevents collisions
- Explicit node reference makes debugging easier
- Extensible for future structured output parsing

## Resolution of NEEDS CLARIFICATION Items

From spec.md, resolved with reasonable defaults:

1. **Real-time streaming vs batch return?** → **Batch return**
   - Simpler implementation, consistent with MCP request-response model
   - Future: Can add streaming via MCP progress notifications if needed

2. **Stop execution or continue with partial results?** → **Stop with partial results**
   - Documented in Error Handling Strategy above
   - Return all successful results before failure point

3. **Auto-map by name or require explicit mapping?** → **Auto-map by name**
   - Documented in Variable Mapping Strategy above
   - Using `{nodeid}_result` convention

4. **Parallel branch execution?** → **Sequential execution initially**
   - Topological sort naturally handles this
   - Execute nodes as dependencies allow
   - No explicit parallelization in first version (can add later)

5. **Include partial results in error responses?** → **Yes**
   - Documented in Error Handling Strategy above
   - Essential for debugging

6. **Flow cache TTL same as templates (15 min)?** → **Yes**
   - Consistency with existing cache behavior
   - Reuse cacheService with flow-specific keys

7. **Temporary vs permanent result storage?** → **Return-only, no persistence**
   - Execution results only returned in response
   - No database or file storage
   - Keeps system stateless and simple

## Dependencies Added

**New npm packages** (to be installed):
```json
{
  "dependencies": {
    "graphlib": "^2.1.8",
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1"
  }
}
```

**Rationale**:
- `graphlib`: Topological sort and cycle detection
- `ajv`: JSON Schema validation for flow structure
- `ajv-formats`: Date-time and other format validators for ajv

**Bundle Impact**: ~50KB total (acceptable for backend service)

## Best Practices Applied

### From Workflow Engine Research

**Temporal Patterns**:
- Activity isolation: Each template execution is independent unit
- Error boundaries: Fail-fast with clear error propagation
- Execution history: Track intermediate results for debugging

**n8n Patterns**:
- Node-based execution: Clear visual flow representation
- Variable passing: Explicit variable mapping between nodes
- Batch processing: Execute entire flow atomically

**Applied to MCP Context**:
- No persistence: Execution state only in memory during request
- No retry logic: Template execution is deterministic
- Synchronous: Complete entire flow before response (no webhooks/triggers)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Circular dependencies | Low | High | graphlib cycle detection, validation before execution |
| Variable mapping failures | Medium | Medium | Clear error messages, validate variables before execution |
| Template execution failures | Medium | High | Partial results, detailed error context |
| Performance degradation | Low | Medium | Cache flow definitions, reuse template cache, measure execution time |
| Invalid flow JSON | Medium | Low | ajv schema validation, clear error messages |

## Next Steps

Phase 0 research complete. Proceeding to Phase 1 design:
1. Create data-model.md with entity details
2. Generate contract JSON files
3. Write quickstart.md with example flows
4. Update CLAUDE.md with new technical context

---
*Research completed: 2025-10-07*
