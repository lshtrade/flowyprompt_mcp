# Quickstart: MCP Flow Execution Tools

**Feature**: 003-add-mcp-tools
**Date**: 2025-10-07
**Purpose**: End-to-end validation of flow execution functionality

## Overview

This quickstart demonstrates the complete flow execution workflow from listing available flows to executing multi-step prompt chains. It serves as both user documentation and integration test specification.

## Prerequisites

- MCP server running and connected to Claude Desktop
- GitHub repository with flows/ directory containing flow JSON files
- Saved templates referenced by flows exist in templates/ directory
- Environment variables configured (GITHUB_REPO_URL, GITHUB_PAT, GITHUB_REF)

## Step 1: List Available Flows

**User Action**: Ask Claude Desktop to list available flows

**MCP Tool Call**:
```json
{
  "name": "flows/list",
  "arguments": {
    "includeMetadata": true
  }
}
```

**Expected Response**:
```json
{
  "flows": [
    {
      "name": "Marketing_Strategy",
      "description": "Multi-step marketing strategy generation flow",
      "version": "1.0.0",
      "nodeCount": 4,
      "created": "2025-10-07T00:00:00.000Z",
      "updated": "2025-10-07T10:30:00.000Z"
    },
    {
      "name": "Content_Pipeline",
      "description": "Research to draft to final content flow",
      "version": "1.2.0",
      "nodeCount": 5,
      "created": "2025-09-15T00:00:00.000Z",
      "updated": "2025-10-01T00:00:00.000Z"
    }
  ],
  "cached": false
}
```

**Validation**:
- ✅ Response contains array of flows
- ✅ Each flow has required fields: name, description, version, nodeCount
- ✅ Metadata fields (created, updated) present when includeMetadata=true
- ✅ Response time < 2s (cold) or < 300ms (cached)

---

## Step 2: Execute Simple 2-Node Flow

**User Action**: Execute "Simple_Chain" flow with initial variables

**Flow Definition** (flows/Simple_Chain.json):
```json
{
  "metadata": {
    "name": "Simple_Chain",
    "version": "1.0.0",
    "description": "Two-step flow: Analyze → Summarize"
  },
  "nodes": [
    {
      "id": "input-1",
      "type": "multi_input",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Initial Input",
        "variables": ["topic"]
      }
    },
    {
      "id": "node-1",
      "type": "template",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Analyze Topic",
        "template": "Analyze the topic: {topic}",
        "variables": ["topic"],
        "selectedTemplateId": "Topic_Analysis"
      }
    },
    {
      "id": "node-2",
      "type": "template",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "Summarize Analysis",
        "template": "Summarize this analysis: {node1_result}",
        "variables": ["node1_result"],
        "selectedTemplateId": "Content_Summarizer"
      }
    },
    {
      "id": "result-1",
      "type": "result",
      "position": { "x": 700, "y": 100 },
      "data": {
        "label": "Final Summary"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "input-1",
      "target": "node-1",
      "type": "data"
    },
    {
      "id": "e2",
      "source": "node-1",
      "target": "node-2",
      "type": "chain"
    },
    {
      "id": "e3",
      "source": "node-2",
      "target": "result-1",
      "type": "chain"
    }
  ]
}
```

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Simple_Chain",
    "initialVariables": {
      "topic": "Artificial Intelligence in Healthcare"
    }
  }
}
```

**Expected Response**:
```json
{
  "flowName": "Simple_Chain",
  "executionId": "Simple_Chain_1696680000000",
  "intermediateResults": [
    {
      "nodeId": "node-1",
      "templateName": "Topic_Analysis",
      "inputVariables": {
        "topic": "Artificial Intelligence in Healthcare"
      },
      "output": "AI in healthcare is transforming diagnostics through machine learning algorithms that can detect patterns in medical imaging...",
      "executionTimeMs": 1200,
      "timestamp": "2025-10-07T10:30:00.000Z"
    },
    {
      "nodeId": "node-2",
      "templateName": "Content_Summarizer",
      "inputVariables": {
        "node1_result": "AI in healthcare is transforming diagnostics..."
      },
      "output": "Summary: AI is revolutionizing healthcare diagnostics, enabling faster and more accurate disease detection.",
      "executionTimeMs": 800,
      "timestamp": "2025-10-07T10:30:01.200Z"
    }
  ],
  "finalResult": "Summary: AI is revolutionizing healthcare diagnostics, enabling faster and more accurate disease detection.",
  "totalExecutionTimeMs": 2000,
  "status": "success"
}
```

**Validation**:
- ✅ intermediateResults contains 2 items (node-1 and node-2)
- ✅ Each result has required fields: nodeId, templateName, inputVariables, output, executionTimeMs, timestamp
- ✅ node-2 received node1_result variable with node-1's output
- ✅ finalResult matches node-2's output
- ✅ status = "success"
- ✅ totalExecutionTimeMs < 5000ms

---

## Step 3: Execute Complex Flow with Variable Mapping

**User Action**: Execute "Marketing_Strategy" flow with multiple variables

**Flow Definition** (flows/Marketing_Strategy.json):
```json
{
  "metadata": {
    "name": "Marketing_Strategy",
    "version": "1.0.0",
    "description": "Brand positioning → Campaign planning flow"
  },
  "nodes": [
    {
      "id": "input-1",
      "type": "multi_input",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Company Info",
        "variables": ["company_name", "market", "budget"]
      }
    },
    {
      "id": "node-1",
      "type": "template",
      "position": { "x": 300, "y": 100 },
      "data": {
        "label": "Brand Positioning",
        "template": "Develop brand positioning for {company_name} in {market} market",
        "variables": ["company_name", "market"],
        "selectedTemplateId": "Brand_Positioning_Strategy"
      }
    },
    {
      "id": "node-2",
      "type": "template",
      "position": { "x": 500, "y": 100 },
      "data": {
        "label": "Campaign Plan",
        "template": "Create campaign plan based on positioning: {node1_result}, budget: {budget}",
        "variables": ["node1_result", "budget"],
        "selectedTemplateId": "Campaign_Creation"
      }
    },
    {
      "id": "result-1",
      "type": "result",
      "position": { "x": 700, "y": 100 },
      "data": {
        "label": "Campaign Output"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "input-1",
      "target": "node-1",
      "type": "data"
    },
    {
      "id": "e2",
      "source": "node-1",
      "target": "node-2",
      "type": "chain"
    },
    {
      "id": "e3",
      "source": "input-1",
      "target": "node-2",
      "type": "data"
    },
    {
      "id": "e4",
      "source": "node-2",
      "target": "result-1",
      "type": "chain"
    }
  ]
}
```

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Marketing_Strategy",
    "initialVariables": {
      "company_name": "TechCorp",
      "market": "AI",
      "budget": "100K"
    }
  }
}
```

**Expected Response**:
```json
{
  "flowName": "Marketing_Strategy",
  "executionId": "Marketing_Strategy_1696680000000",
  "intermediateResults": [
    {
      "nodeId": "node-1",
      "templateName": "Brand_Positioning_Strategy",
      "inputVariables": {
        "company_name": "TechCorp",
        "market": "AI"
      },
      "output": "TechCorp should position as an AI-first enterprise solution provider focusing on scalable automation and intelligent decision-making tools...",
      "executionTimeMs": 1500,
      "timestamp": "2025-10-07T10:30:00.000Z"
    },
    {
      "nodeId": "node-2",
      "templateName": "Campaign_Creation",
      "inputVariables": {
        "node1_result": "TechCorp should position as an AI-first enterprise solution provider...",
        "budget": "100K"
      },
      "output": "Q1 2025 Campaign Plan:\n1. Thought Leadership Series ($30K)\n2. Conference Sponsorships ($40K)\n3. Digital Advertising ($30K)\n...",
      "executionTimeMs": 1800,
      "timestamp": "2025-10-07T10:30:01.500Z"
    }
  ],
  "finalResult": "Q1 2025 Campaign Plan:\n1. Thought Leadership Series ($30K)...",
  "totalExecutionTimeMs": 3300,
  "status": "success"
}
```

**Validation**:
- ✅ node-1 executed with initialVariables: company_name, market
- ✅ node-2 executed with mixed variables: node1_result (from node-1) + budget (from initialVariables)
- ✅ Variable mapping correctly resolved from multiple sources
- ✅ Execution order: node-1 then node-2 (topological order respected)
- ✅ totalExecutionTimeMs < 5000ms

---

## Step 4: Handle Missing Variables Error

**User Action**: Execute flow without providing required variables

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Marketing_Strategy",
    "initialVariables": {
      "company_name": "TechCorp"
    }
  }
}
```

**Expected Error Response**:
```json
{
  "code": "MISSING_VARIABLES",
  "message": "Missing required initial variables: market, budget",
  "source": "flows/execute",
  "details": {
    "flowName": "Marketing_Strategy",
    "provided": ["company_name"],
    "required": ["company_name", "market", "budget"],
    "missing": ["market", "budget"]
  }
}
```

**Validation**:
- ✅ Error code = "MISSING_VARIABLES"
- ✅ Error message lists missing variables: market, budget
- ✅ No partial execution (flow validation happens before any template execution)
- ✅ Clear error details for debugging

---

## Step 5: Handle Template Not Found (Partial Results)

**User Action**: Execute flow where second template doesn't exist

**Test Flow Definition** (flows/Broken_Flow.json):
```json
{
  "metadata": {
    "name": "Broken_Flow",
    "version": "1.0.0",
    "description": "Test flow with missing template"
  },
  "nodes": [
    {
      "id": "input-1",
      "type": "multi_input",
      "data": { "label": "Input", "variables": ["input"] }
    },
    {
      "id": "node-1",
      "type": "template",
      "data": {
        "label": "Step 1",
        "template": "{input}",
        "variables": ["input"],
        "selectedTemplateId": "Existing_Template"
      }
    },
    {
      "id": "node-2",
      "type": "template",
      "data": {
        "label": "Step 2",
        "template": "{node1_result}",
        "variables": ["node1_result"],
        "selectedTemplateId": "Nonexistent_Template"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "input-1", "target": "node-1", "type": "data" },
    { "id": "e2", "source": "node-1", "target": "node-2", "type": "chain" }
  ]
}
```

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Broken_Flow",
    "initialVariables": {
      "input": "test input"
    }
  }
}
```

**Expected Error Response**:
```json
{
  "code": "TEMPLATE_NOT_FOUND",
  "message": "Template execution failed at node: node-2",
  "source": "flows/execute",
  "partialResults": [
    {
      "nodeId": "node-1",
      "templateName": "Existing_Template",
      "inputVariables": {
        "input": "test input"
      },
      "output": "Processed: test input",
      "executionTimeMs": 1000,
      "timestamp": "2025-10-07T10:30:00.000Z"
    }
  ],
  "failedAt": {
    "nodeId": "node-2",
    "templateName": "Nonexistent_Template",
    "error": "Template not found in repository: Nonexistent_Template"
  }
}
```

**Validation**:
- ✅ Error code = "TEMPLATE_NOT_FOUND"
- ✅ partialResults contains result from node-1 (successful execution before failure)
- ✅ failedAt specifies exact node and error
- ✅ User can see what succeeded before failure for debugging

---

## Step 6: Detect Circular Dependencies

**User Action**: Execute flow with circular dependency

**Test Flow Definition** (flows/Circular_Flow.json):
```json
{
  "metadata": {
    "name": "Circular_Flow",
    "version": "1.0.0",
    "description": "Test flow with circular dependency"
  },
  "nodes": [
    {
      "id": "node-1",
      "type": "template",
      "data": { "label": "A", "selectedTemplateId": "Template_A" }
    },
    {
      "id": "node-2",
      "type": "template",
      "data": { "label": "B", "selectedTemplateId": "Template_B" }
    },
    {
      "id": "node-3",
      "type": "template",
      "data": { "label": "C", "selectedTemplateId": "Template_C" }
    }
  ],
  "edges": [
    { "id": "e1", "source": "node-1", "target": "node-2", "type": "chain" },
    { "id": "e2", "source": "node-2", "target": "node-3", "type": "chain" },
    { "id": "e3", "source": "node-3", "target": "node-1", "type": "chain" }
  ]
}
```

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Circular_Flow",
    "initialVariables": {}
  }
}
```

**Expected Error Response**:
```json
{
  "code": "CIRCULAR_DEPENDENCY",
  "message": "Flow contains circular dependency: node-1 → node-2 → node-3 → node-1",
  "source": "flows/execute",
  "details": {
    "cycle": ["node-1", "node-2", "node-3", "node-1"]
  }
}
```

**Validation**:
- ✅ Error code = "CIRCULAR_DEPENDENCY"
- ✅ Error detected during validation (before any template execution)
- ✅ Error message shows the cycle path
- ✅ No partial results (failed validation gate)

---

## Step 7: Performance Validation

**User Action**: Execute 3-node flow and verify performance target

**MCP Tool Call**:
```json
{
  "name": "flows/execute",
  "arguments": {
    "flowName": "Three_Node_Flow",
    "initialVariables": {
      "input": "test"
    }
  }
}
```

**Performance Assertions**:
- ✅ Individual node execution times: node-1 (~1.5s), node-2 (~1.5s), node-3 (~1.5s)
- ✅ Total execution time: totalExecutionTimeMs < 5000ms (target: < 5s for 3 nodes)
- ✅ Cached template fetches add negligible overhead (< 50ms per template)
- ✅ Variable mapping and orchestration overhead < 200ms total

---

## Step 8: Cache Validation

**User Action**: Execute flows/list twice to verify caching

**First Call** (Cold):
```json
{
  "name": "flows/list",
  "arguments": {}
}
```

**Expected**: Response time < 2s, cached=false

**Second Call** (Warm, within 15 min):
```json
{
  "name": "flows/list",
  "arguments": {}
}
```

**Expected**: Response time < 300ms, cached=true

**Validation**:
- ✅ First call fetches from GitHub: cached=false, slower
- ✅ Second call uses cache: cached=true, < 300ms
- ✅ Cache TTL = 15 minutes (same as templates)
- ✅ ETag revalidation on cache expiry

---

## Success Criteria

All quickstart steps must pass with:

1. **Functional Requirements**:
   - ✅ flows/list returns all flows from GitHub flows/ directory
   - ✅ flows/execute successfully executes multi-node chains
   - ✅ Variable mapping works correctly (initial + previous outputs)
   - ✅ Error handling returns partial results on failure
   - ✅ Circular dependency detection prevents execution
   - ✅ Missing variable validation before execution

2. **Performance Requirements**:
   - ✅ Flow list: < 300ms (cached), < 2s (cold)
   - ✅ Flow execution: < 5s for 3-node chain
   - ✅ Cache hit rate > 80% for repeated requests

3. **Quality Requirements**:
   - ✅ All test cases pass (TC-FLOW-LIST-001 through TC-FLOW-EXEC-007)
   - ✅ Code coverage ≥ 85% for new modules
   - ✅ No regressions in existing prompts/list and prompts/get functionality

---

## Cleanup

After quickstart validation:
- Test flow files (Broken_Flow.json, Circular_Flow.json) can be removed
- Production flows (Marketing_Strategy.json, etc.) remain in repository
- Cache is automatically cleared after 15 minutes

---

*Quickstart created: 2025-10-07*
*Last updated: 2025-10-07*
