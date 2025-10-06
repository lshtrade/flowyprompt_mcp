// tests/unit/promptService.test.js
// Unit tests for promptService

import promptService from '../../src/services/promptService.js';

describe('promptService', () => {
  describe('extractVariablesFromContent()', () => {
    test('extracts valid variable names from content', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const result = promptService.extractVariablesFromContent(content);

      expect(result).toEqual(expect.arrayContaining(['name', 'company']));
      expect(result).toHaveLength(2);
    });

    test('returns unique variable names (no duplicates)', () => {
      const content = '{{user}} logged in. Welcome {{user}}!';
      const result = promptService.extractVariablesFromContent(content);

      expect(result).toEqual(['user']);
      expect(result).toHaveLength(1);
    });

    test('handles empty content', () => {
      const result = promptService.extractVariablesFromContent('');
      expect(result).toEqual([]);
    });

    test('returns empty array when no variables found', () => {
      const content = 'No variables here!';
      const result = promptService.extractVariablesFromContent(content);
      expect(result).toEqual([]);
    });

    test('extracts variables with underscores and numbers', () => {
      const content = '{{user_name}} {{item123}} {{_private}}';
      const result = promptService.extractVariablesFromContent(content);

      expect(result).toEqual(expect.arrayContaining(['user_name', 'item123', '_private']));
    });

    test('ignores invalid variable patterns', () => {
      const content = '{{with-dash}} {{with space}} {{with.dot}}';
      const result = promptService.extractVariablesFromContent(content);

      // These should NOT be extracted (invalid characters)
      expect(result).toEqual([]);
    });

    test('extracts variables from multiline content', () => {
      const content = `
        Line 1: {{var1}}
        Line 2: {{var2}}
        Line 3: {{var1}} again
      `;
      const result = promptService.extractVariablesFromContent(content);

      expect(result).toEqual(expect.arrayContaining(['var1', 'var2']));
      expect(result).toHaveLength(2);
    });
  });

  describe('validateVariables()', () => {
    test('returns valid=true when all variables match', () => {
      const template = {
        variables: [
          { name: 'company', required: true },
          { name: 'industry', required: true },
        ],
        results: [
          { content: 'Welcome to {{company}} in the {{industry}} sector' },
        ],
      };

      const result = promptService.validateVariables(template);

      expect(result.valid).toBe(true);
      expect(result.undefinedVars).toEqual([]);
      expect(result.unusedVars).toEqual([]);
    });

    test('detects undefined variables (used but not defined)', () => {
      const template = {
        variables: [
          { name: 'company', required: true },
        ],
        results: [
          { content: 'Welcome to {{company}} in {{industry}}' },
        ],
      };

      const result = promptService.validateVariables(template);

      expect(result.valid).toBe(false);
      expect(result.undefinedVars).toEqual(['industry']);
      expect(result.unusedVars).toEqual([]);
    });

    test('detects unused variables (defined but not used)', () => {
      const template = {
        variables: [
          { name: 'company', required: true },
          { name: 'unused_var', required: false },
        ],
        results: [
          { content: 'Welcome to {{company}}' },
        ],
      };

      const result = promptService.validateVariables(template);

      expect(result.valid).toBe(true); // Still valid (unused is OK)
      expect(result.undefinedVars).toEqual([]);
      expect(result.unusedVars).toEqual(['unused_var']);
    });

    test('validates across multiple result sections', () => {
      const template = {
        variables: [
          { name: 'var1', required: true },
          { name: 'var2', required: true },
        ],
        results: [
          { content: 'Section 1: {{var1}}' },
          { content: 'Section 2: {{var2}}' },
          { content: 'Section 3: {{var1}} and {{var2}}' },
        ],
      };

      const result = promptService.validateVariables(template);

      expect(result.valid).toBe(true);
      expect(result.undefinedVars).toEqual([]);
      expect(result.unusedVars).toEqual([]);
    });

    test('handles templates with no variables defined', () => {
      const template = {
        variables: [],
        results: [
          { content: 'Static content with {{unexpected}}' },
        ],
      };

      const result = promptService.validateVariables(template);

      expect(result.valid).toBe(false);
      expect(result.undefinedVars).toEqual(['unexpected']);
      expect(result.unusedVars).toEqual([]);
    });
  });

  describe('validateOrWarn()', () => {
    test('returns validation result for undefined variables', () => {
      const template = {
        metadata: { name: 'test-template' },
        variables: [],
        results: [
          { content: 'Uses {{undefined_var}}' },
        ],
      };

      const result = promptService.validateOrWarn(template);

      expect(result).toEqual({
        valid: false,
        undefinedVars: ['undefined_var'],
        unusedVars: [],
      });
    });

    test('returns validation result for unused variables', () => {
      const template = {
        metadata: { name: 'test-template' },
        variables: [
          { name: 'unused', required: false },
        ],
        results: [
          { content: 'No variables used' },
        ],
      };

      const result = promptService.validateOrWarn(template);

      expect(result).toEqual({
        valid: true,
        undefinedVars: [],
        unusedVars: ['unused'],
      });
    });

    test('returns valid result when variables match', () => {
      const template = {
        metadata: { name: 'test-template' },
        variables: [
          { name: 'var1', required: true },
        ],
        results: [
          { content: 'Uses {{var1}}' },
        ],
      };

      const result = promptService.validateOrWarn(template);

      expect(result).toEqual({
        valid: true,
        undefinedVars: [],
        unusedVars: [],
      });
    });

    test('returns validation result with both issues', () => {
      const template = {
        metadata: { name: 'test-template' },
        variables: [
          { name: 'defined', required: true },
        ],
        results: [
          { content: 'Uses {{undefined}}' },
        ],
      };

      const result = promptService.validateOrWarn(template);

      expect(result).toEqual({
        valid: false,
        undefinedVars: ['undefined'],
        unusedVars: ['defined'],
      });
    });
  });

  describe('substituteVariables()', () => {
    test('substitutes all variables in content', () => {
      const content = 'Hello {{name}}, you work at {{company}}';
      const values = { name: 'Alice', company: 'Acme Corp' };

      const result = promptService.substituteVariables(content, values);

      expect(result).toBe('Hello Alice, you work at Acme Corp');
    });

    test('handles missing variable values with empty string', () => {
      const content = 'Hello {{name}}, you work at {{company}}';
      const values = { name: 'Alice' }; // company is missing

      const result = promptService.substituteVariables(content, values);

      expect(result).toBe('Hello Alice, you work at ');
    });

    test('substitutes same variable multiple times', () => {
      const content = '{{name}} is {{name}}';
      const values = { name: 'Bob' };

      const result = promptService.substituteVariables(content, values);

      expect(result).toBe('Bob is Bob');
    });

    test('leaves content unchanged when no variables present', () => {
      const content = 'Static content';
      const values = { unused: 'value' };

      const result = promptService.substituteVariables(content, values);

      expect(result).toBe('Static content');
    });

    test('handles empty values object', () => {
      const content = 'Hello {{name}}';
      const values = {};

      const result = promptService.substituteVariables(content, values);

      expect(result).toBe('Hello ');
    });

    test('preserves formatting and whitespace', () => {
      const content = `
        Name: {{name}}
        Company: {{company}}
      `;
      const values = { name: 'Alice', company: 'Acme' };

      const result = promptService.substituteVariables(content, values);

      expect(result).toContain('Name: Alice');
      expect(result).toContain('Company: Acme');
    });
  });

  describe('generatePrompt()', () => {
    test('generates complete prompt with metadata and substituted content', () => {
      const template = {
        metadata: {
          name: 'Test Template',
          description: 'A test template',
          version: '1.0.0',
          tags: ['test', 'example'],
        },
        results: [
          { content: 'Hello {{name}}' },
          { content: 'Welcome to {{company}}' },
        ],
      };
      const variableValues = { name: 'Alice', company: 'Acme Corp' };

      const result = promptService.generatePrompt(template, variableValues);

      expect(result).toContain('# Test Template');
      expect(result).toContain('A test template');
      expect(result).toContain('**Version**: 1.0.0');
      expect(result).toContain('**Tags**: test, example');
      expect(result).toContain('Hello Alice');
      expect(result).toContain('Welcome to Acme Corp');
      expect(result).toContain('---');
    });

    test('handles template without tags', () => {
      const template = {
        metadata: {
          name: 'Simple Template',
          description: 'No tags',
          version: '1.0.0',
        },
        results: [
          { content: 'Content here' },
        ],
      };

      const result = promptService.generatePrompt(template, {});

      expect(result).toContain('# Simple Template');
      expect(result).toContain('**Version**: 1.0.0');
      expect(result).not.toContain('**Tags**:');
    });

    test('handles empty tags array', () => {
      const template = {
        metadata: {
          name: 'Template',
          description: 'Desc',
          version: '1.0.0',
          tags: [],
        },
        results: [
          { content: 'Content' },
        ],
      };

      const result = promptService.generatePrompt(template, {});

      expect(result).not.toContain('**Tags**:');
    });

    test('properly formats multiple result sections with separators', () => {
      const template = {
        metadata: {
          name: 'Multi-Section',
          description: 'Multiple sections',
          version: '1.0.0',
        },
        results: [
          { content: 'Section 1' },
          { content: 'Section 2' },
          { content: 'Section 3' },
        ],
      };

      const result = promptService.generatePrompt(template, {});

      const sections = result.split('---');
      expect(sections.length).toBeGreaterThan(3); // Header + 3 sections
      expect(result).toContain('Section 1');
      expect(result).toContain('Section 2');
      expect(result).toContain('Section 3');
    });

    test('trims final output', () => {
      const template = {
        metadata: {
          name: 'Template',
          description: 'Desc',
          version: '1.0.0',
        },
        results: [
          { content: 'Content' },
        ],
      };

      const result = promptService.generatePrompt(template, {});

      expect(result).toBe(result.trim());
      expect(result[0]).not.toBe(' ');
      expect(result[0]).not.toBe('\n');
      expect(result[result.length - 1]).not.toBe(' ');
      expect(result[result.length - 1]).not.toBe('\n');
    });

    test('substitutes variables in all result sections', () => {
      const template = {
        metadata: {
          name: 'Template',
          description: 'Desc',
          version: '1.0.0',
        },
        results: [
          { content: '{{var}} in section 1' },
          { content: '{{var}} in section 2' },
        ],
      };

      const result = promptService.generatePrompt(template, { var: 'VALUE' });

      expect(result).toContain('VALUE in section 1');
      expect(result).toContain('VALUE in section 2');
      expect(result).not.toContain('{{var}}');
    });
  });
});
