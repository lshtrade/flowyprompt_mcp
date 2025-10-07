// Integration test for flow execution
// End-to-end test of Simple_Chain flow from quickstart.md Step 2

// Set test env variables before imports
process.env.GITHUB_REPO_URL = 'https://github.com/test/repo';
process.env.GITHUB_PAT = 'ghp_test';
process.env.GITHUB_REF = 'main';
process.env.MCP_SERVER_NAME = 'test';
process.env.MCP_SERVER_VERSION = '1.0.0';
process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';

// Create mock GitHub service
const mockGithubService = {
  fetchFlow: jest.fn(),
  fetchFile: jest.fn()
};

// Mock modules before importing
jest.unstable_mockModule('../../src/services/githubService.js', () => ({
  default: mockGithubService
}));

// Import modules after mocks
const flowsExecuteModule = await import('../../src/mcp/tools/flowsExecute.js');
const flowsExecute = flowsExecuteModule.default;

describe('Integration: Flow Execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute Simple_Chain flow end-to-end', async () => {
    // Mock flow definition from quickstart.md
    const simpleChainFlow = {
      metadata: {
        name: 'Simple_Chain',
        version: '1.0.0',
        description: 'Two-step flow: Analyze → Summarize'
      },
      nodes: [
        {
          id: 'input-1',
          type: 'multi_input',
          position: { x: 100, y: 100 },
          data: {
            label: 'Initial Input',
            variables: ['topic']
          }
        },
        {
          id: 'node-1',
          type: 'template',
          position: { x: 300, y: 100 },
          data: {
            label: 'Analyze Topic',
            template: 'Analyze the topic: {topic}',
            variables: ['topic'],
            selectedTemplateId: 'Topic_Analysis'
          }
        },
        {
          id: 'node-2',
          type: 'template',
          position: { x: 500, y: 100 },
          data: {
            label: 'Summarize Analysis',
            template: 'Summarize this analysis: {node1_result}',
            variables: ['node1_result'],
            selectedTemplateId: 'Content_Summarizer'
          }
        },
        {
          id: 'result-1',
          type: 'result',
          position: { x: 700, y: 100 },
          data: {
            label: 'Final Summary'
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'input-1',
          target: 'node-1',
          type: 'data'
        },
        {
          id: 'e2',
          source: 'node-1',
          target: 'node-2',
          type: 'chain'
        },
        {
          id: 'e3',
          source: 'node-2',
          target: 'result-1',
          type: 'chain'
        }
      ]
    };

    // Mock Topic_Analysis template
    const topicAnalysisTemplate = {
      metadata: {
        name: 'Topic_Analysis',
        description: 'Analyze a topic',
        version: '1.0.0'
      },
      variables: [
        { name: 'topic', required: true }
      ],
      results: [
        {
          name: 's1',
          content: 'AI in healthcare is transforming diagnostics through machine learning algorithms that can detect patterns in medical imaging with high accuracy. The technology enables faster and more accurate disease detection, improving patient outcomes.'
        }
      ]
    };

    // Mock Content_Summarizer template
    const contentSummarizerTemplate = {
      metadata: {
        name: 'Content_Summarizer',
        description: 'Summarize content',
        version: '1.0.0'
      },
      variables: [
        { name: 'node1_result', required: true }
      ],
      results: [
        {
          name: 's1',
          content: 'Summary: AI is revolutionizing healthcare diagnostics, enabling faster and more accurate disease detection.'
        }
      ]
    };

    // Setup mocks
    mockGithubService.fetchFlow.mockResolvedValue({
      content: simpleChainFlow,
      etag: 'flow-etag'
    });

    // Mock template fetches
    mockGithubService.fetchFile.mockImplementation((type, name, ref) => {
      if (name === 'Topic_Analysis') {
        return Promise.resolve({
          content: topicAnalysisTemplate,
          etag: 'template1-etag'
        });
      }
      if (name === 'Content_Summarizer') {
        return Promise.resolve({
          content: contentSummarizerTemplate,
          etag: 'template2-etag'
        });
      }
      return Promise.reject(new Error(`Template not found: ${name}`));
    });

    // Execute flow
    const result = await flowsExecute({
      flowName: 'Simple_Chain',
      initialVariables: {
        topic: 'Artificial Intelligence in Healthcare'
      }
    });

    // Validate results
    expect(result.flowName).toBe('Simple_Chain');
    expect(result.intermediateResults).toHaveLength(2);

    // Validate node-1 execution
    expect(result.intermediateResults[0]).toMatchObject({
      nodeId: 'node-1',
      templateName: 'Topic_Analysis',
      inputVariables: {
        topic: 'Artificial Intelligence in Healthcare'
      }
    });
    expect(result.intermediateResults[0].output).toContain('AI in healthcare');

    // Validate node-2 execution
    expect(result.intermediateResults[1]).toMatchObject({
      nodeId: 'node-2',
      templateName: 'Content_Summarizer'
    });
    // node-2 should have received node1_result variable
    expect(result.intermediateResults[1].inputVariables).toHaveProperty('node1_result');
    expect(result.intermediateResults[1].output).toContain('Summary');

    // Validate final result
    expect(result.finalResult).toBe(result.intermediateResults[1].output);
    expect(result.status).toBe('success');
    expect(result.totalExecutionTimeMs).toBeGreaterThan(0);

    // Verify execution order
    expect(result.intermediateResults[0].nodeId).toBe('node-1');
    expect(result.intermediateResults[1].nodeId).toBe('node-2');

    // Verify timestamps are sequential
    const time1 = new Date(result.intermediateResults[0].timestamp).getTime();
    const time2 = new Date(result.intermediateResults[1].timestamp).getTime();
    expect(time2).toBeGreaterThanOrEqual(time1);

    // Verify GitHub service calls
    expect(mockGithubService.fetchFlow).toHaveBeenCalledWith('Simple_Chain', 'main');
    expect(mockGithubService.fetchFile).toHaveBeenCalledWith('template', 'Topic_Analysis', 'main');
    expect(mockGithubService.fetchFile).toHaveBeenCalledWith('template', 'Content_Summarizer', 'main');
  });

  test('should handle flow with parallel data edges', async () => {
    // Flow where initial input goes to multiple nodes
    const parallelFlow = {
      metadata: { name: 'Parallel_Test', version: '1.0.0' },
      nodes: [
        {
          id: 'input-1',
          type: 'multi_input',
          data: { label: 'Input', variables: ['company', 'market'] }
        },
        {
          id: 'node-1',
          type: 'template',
          data: {
            label: 'Node 1',
            selectedTemplateId: 'Template_A',
            variables: ['company']
          }
        },
        {
          id: 'node-2',
          type: 'template',
          data: {
            label: 'Node 2',
            selectedTemplateId: 'Template_B',
            variables: ['node1_result', 'market']
          }
        }
      ],
      edges: [
        { id: 'e1', source: 'input-1', target: 'node-1', type: 'data' },
        { id: 'e2', source: 'input-1', target: 'node-2', type: 'data' },
        { id: 'e3', source: 'node-1', target: 'node-2', type: 'chain' }
      ]
    };

    const templateA = {
      metadata: { name: 'Template_A', version: '1.0.0' },
      variables: [{ name: 'company', required: true }],
      results: [{ name: 's1', content: 'Analysis of {company}' }]
    };

    const templateB = {
      metadata: { name: 'Template_B', version: '1.0.0' },
      variables: [
        { name: 'node1_result', required: true },
        { name: 'market', required: true }
      ],
      results: [{ name: 's1', content: 'Combined result' }]
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: parallelFlow });
    mockGithubService.fetchFile.mockImplementation((type, name) => {
      if (name === 'Template_A') return Promise.resolve({ content: templateA });
      if (name === 'Template_B') return Promise.resolve({ content: templateB });
      return Promise.reject(new Error('Not found'));
    });

    const result = await flowsExecute({
      flowName: 'Parallel_Test',
      initialVariables: {
        company: 'TechCorp',
        market: 'AI'
      }
    });

    expect(result.status).toBe('success');
    expect(result.intermediateResults).toHaveLength(2);

    // node-2 should receive both initial variable (market) and previous output (node1_result)
    expect(result.intermediateResults[1].inputVariables).toHaveProperty('market', 'AI');
    expect(result.intermediateResults[1].inputVariables).toHaveProperty('node1_result');
  });

  test('should measure execution time accurately', async () => {
    const simpleFlow = {
      metadata: { name: 'Timing_Test', version: '1.0.0' },
      nodes: [
        {
          id: 'node-1',
          type: 'template',
          data: { label: 'T1', selectedTemplateId: 'T1', variables: ['v'] }
        }
      ],
      edges: []
    };

    const template = {
      metadata: { name: 'T1', version: '1.0.0' },
      variables: [{ name: 'v', required: true }],
      results: [{ name: 's1', content: 'Output' }]
    };

    mockGithubService.fetchFlow.mockResolvedValue({ content: simpleFlow });
    mockGithubService.fetchFile.mockResolvedValue({ content: template });

    const startTime = Date.now();
    const result = await flowsExecute({
      flowName: 'Timing_Test',
      initialVariables: { v: 'value' }
    });
    const elapsed = Date.now() - startTime;

    expect(result.intermediateResults[0].executionTimeMs).toBeGreaterThan(0);
    expect(result.totalExecutionTimeMs).toBeGreaterThan(0);
    expect(result.totalExecutionTimeMs).toBeLessThanOrEqual(elapsed + 100); // Allow small margin
  });
});
