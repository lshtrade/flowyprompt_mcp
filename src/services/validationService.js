import Ajv from 'ajv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createMcpError } from '../utils/errorHandler.js';
import { log } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validation Service using AJV with JSON Schema
 */
class ValidationService {
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow additional properties
    });

    // Load and compile schemas
    this.schemas = this._loadSchemas();
    log.info('Validation service initialized', {
      schemas: Object.keys(this.schemas),
    }, 'ValidationService');
  }

  /**
   * Validate template JSON against schema
   * @param {object} data - Template data to validate
   * @returns {object} Validation result {valid: boolean, errors: array}
   */
  validateTemplate(data) {
    return this._validate('template', data);
  }

  /**
   * Validate flow JSON against schema
   * @param {object} data - Flow data to validate
   * @returns {object} Validation result {valid: boolean, errors: array}
   */
  validateFlow(data) {
    return this._validate('flow', data);
  }

  /**
   * Validate data against schema and throw error if invalid
   * @param {string} type - Schema type ('template' or 'flow')
   * @param {object} data - Data to validate
   * @throws {Error} If validation fails
   */
  validateOrThrow(type, data) {
    const result = this._validate(type, data);

    if (!result.valid) {
      log.warn('Schema validation failed', {
        type,
        errors: result.errors,
      }, 'ValidationService');

      throw createMcpError(
        'VALIDATION_ERROR',
        `${type} validation failed: ${this._formatErrors(result.errors)}`,
        'validation',
        { validationErrors: result.errors }
      );
    }

    log.info('Schema validation passed', { type }, 'ValidationService');
    return result;
  }

  /**
   * Internal validation method
   * @private
   */
  _validate(type, data) {
    const validator = this.schemas[type];

    if (!validator) {
      throw createMcpError(
        'INTERNAL_ERROR',
        `Unknown schema type: ${type}`,
        'validation'
      );
    }

    const valid = validator(data);

    if (!valid) {
      return {
        valid: false,
        errors: validator.errors.map((err) => ({
          path: err.instancePath || '/',
          message: err.message,
          keyword: err.keyword,
          params: err.params,
        })),
      };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Load and compile JSON schemas
   * @private
   */
  _loadSchemas() {
    const schemasDir = join(__dirname, '../schemas');
    const schemas = {};

    try {
      // Load template schema
      const templateSchemaPath = join(schemasDir, 'templateSchema.json');
      const templateSchema = JSON.parse(readFileSync(templateSchemaPath, 'utf-8'));
      schemas.template = this.ajv.compile(templateSchema);

      // Load flow schema
      const flowSchemaPath = join(schemasDir, 'flowSchema.json');
      const flowSchema = JSON.parse(readFileSync(flowSchemaPath, 'utf-8'));
      schemas.flow = this.ajv.compile(flowSchema);

      log.info('Schemas loaded successfully', {
        schemas: Object.keys(schemas),
      }, 'ValidationService');

      return schemas;
    } catch (error) {
      log.error('Failed to load schemas', error, {}, 'ValidationService');
      throw createMcpError(
        'INTERNAL_ERROR',
        `Failed to load validation schemas: ${error.message}`,
        'validation'
      );
    }
  }

  /**
   * Format validation errors into a readable message
   * @private
   */
  _formatErrors(errors) {
    if (!errors || errors.length === 0) {
      return 'Unknown validation error';
    }

    if (errors.length === 1) {
      const err = errors[0];
      return `${err.path}: ${err.message}`;
    }

    return errors
      .map((err) => `${err.path}: ${err.message}`)
      .join('; ');
  }
}

// Export singleton instance
export default new ValidationService();
