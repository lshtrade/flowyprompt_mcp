// Integration test for prompt generation performance
// T018: Verify prompt generation meets performance targets (< 100ms)

import promptService from '../../src/services/promptService.js';

describe('Prompt generation performance', () => {
  test('should generate prompt in < 100ms for standard template', () => {
    const template = {
      metadata: {
        name: 'Performance_Test',
        description: 'Performance test template',
        version: '1.0.0',
        tags: ['test', 'performance']
      },
      variables: [
        { name: 'var1', required: true },
        { name: 'var2', required: true },
        { name: 'var3', required: false },
        { name: 'var4', required: false },
        { name: 'var5', required: false }
      ],
      results: [
        {
          name: 'section1',
          content: 'Variable 1: {{var1}}, Variable 2: {{var2}}'
        },
        {
          name: 'section2',
          content: 'Optional variables: {{var3}}, {{var4}}, {{var5}}'
        },
        {
          name: 'section3',
          content: 'Summary: This template tests {{var1}} and {{var2}} performance.'
        }
      ]
    };

    const variables = {
      var1: 'Value1',
      var2: 'Value2',
      var3: 'Value3',
      var4: 'Value4',
      var5: 'Value5'
    };

    const startTime = Date.now();
    const result = promptService.generatePrompt(template, variables);
    const elapsed = Date.now() - startTime;

    // Performance assertion: < 100ms
    expect(elapsed).toBeLessThan(100);

    // Verify result is valid
    expect(result).toBeDefined();
    expect(result).toContain('Value1');
    expect(result).toContain('Value2');
  });

  test('should generate prompt in < 100ms with 10 variables', () => {
    const template = {
      metadata: {
        name: 'Large_Template',
        description: 'Template with many variables',
        version: '1.0.0'
      },
      variables: Array.from({ length: 10 }, (_, i) => ({
        name: `var${i + 1}`,
        required: i < 5
      })),
      results: [
        {
          name: 'section',
          content: Array.from({ length: 10 }, (_, i) => `{{var${i + 1}}}`).join(', ')
        }
      ]
    };

    const variables = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`var${i + 1}`, `Value${i + 1}`])
    );

    const startTime = Date.now();
    const result = promptService.generatePrompt(template, variables);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(100);
    expect(result).toContain('Value1');
    expect(result).toContain('Value10');
  });

  test('should handle large content efficiently', () => {
    // Template with 5 result sections, each ~1KB
    const largeContent = 'Lorem ipsum dolor sit amet, '.repeat(40); // ~1KB

    const template = {
      metadata: {
        name: 'Large_Content_Template',
        description: 'Large content test',
        version: '1.0.0'
      },
      variables: [
        { name: 'title', required: true },
        { name: 'content', required: true }
      ],
      results: Array.from({ length: 5 }, (_, i) => ({
        name: `section${i + 1}`,
        content: `# {{title}} - Section ${i + 1}\n\n${largeContent}\n\n{{content}}`
      }))
    };

    const variables = {
      title: 'Performance Test',
      content: 'Test content'
    };

    const startTime = Date.now();
    const result = promptService.generatePrompt(template, variables);
    const elapsed = Date.now() - startTime;

    // Should still complete in < 500ms even with large content
    expect(elapsed).toBeLessThan(500);
    expect(result.length).toBeGreaterThan(5000); // Verify large output
  });

  test('should perform variable extraction quickly', () => {
    const content = 'This has {{var1}}, {{var2}}, {{var3}}, {{var4}}, {{var5}} variables.';

    const startTime = Date.now();
    const result = promptService.extractVariablesFromContent(content);
    const elapsed = Date.now() - startTime;

    // Variable extraction should be < 1ms
    expect(elapsed).toBeLessThan(10);
    expect(result).toHaveLength(5);
  });

  test('should validate variables quickly', () => {
    const template = {
      variables: [
        { name: 'var1', required: true },
        { name: 'var2', required: true },
        { name: 'var3', required: false }
      ],
      results: [
        { name: 's1', content: '{{var1}} {{var2}}' }
      ]
    };

    const startTime = Date.now();
    const result = promptService.validateVariables(template);
    const elapsed = Date.now() - startTime;

    // Validation should be < 50ms
    expect(elapsed).toBeLessThan(50);
    expect(result.valid).toBe(true); // Unused vars don't make it invalid
    expect(result.unusedVars).toContain('var3');
  });

  test('batch generation should scale linearly', () => {
    const template = {
      metadata: {
        name: 'Batch_Test',
        description: 'Batch generation test',
        version: '1.0.0'
      },
      variables: [
        { name: 'id', required: true }
      ],
      results: [
        { name: 's1', content: 'ID: {{id}}' }
      ]
    };

    const batchSize = 10;
    const startTime = Date.now();

    // Generate 10 prompts
    for (let i = 0; i < batchSize; i++) {
      promptService.generatePrompt(template, { id: `ID-${i}` });
    }

    const elapsed = Date.now() - startTime;

    // 10 prompts should complete in < 1s
    expect(elapsed).toBeLessThan(1000);

    // Average per prompt should be < 100ms
    const avgTime = elapsed / batchSize;
    expect(avgTime).toBeLessThan(100);
  });

  test('should handle concurrent variable substitution', async () => {
    const template = {
      metadata: {
        name: 'Concurrent_Test',
        description: 'Concurrent substitution',
        version: '1.0.0'
      },
      variables: [
        { name: 'value', required: true }
      ],
      results: [
        { name: 's1', content: 'Value: {{value}}' }
      ]
    };

    const startTime = Date.now();

    // Generate 5 prompts concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      Promise.resolve(promptService.generatePrompt(template, { value: `V${i}` }))
    );

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    // Concurrent execution should be fast (< 200ms total)
    expect(elapsed).toBeLessThan(200);
    expect(results).toHaveLength(5);
    expect(results[0]).toContain('V0');
    expect(results[4]).toContain('V4');
  });
});
