import { log } from '../utils/logger.js';

/**
 * Metrics tracking service
 * Tracks performance and usage metrics
 */
class MetricsService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byType: {
          template: 0,
          flow: 0,
        },
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      },
      errors: {
        byCode: {},
      },
      mcp: {
        promptGeneration: {
          count: 0,
          latencyMs: {
            min: Infinity,
            max: 0,
            avg: 0,
          },
        },
        tools: {
          prompts_list: {
            count: 0,
            errors: 0,
          },
          prompts_get: {
            count: 0,
            errors: 0,
          },
        },
      },
    };

    this.latencyHistory = []; // Store last 1000 latencies for percentile calculation
    this.maxHistorySize = 1000;

    log.info('Metrics service initialized', {}, 'MetricsService');
  }

  /**
   * Record a successful request
   * @param {string} type - Request type ('template' or 'flow')
   * @param {number} latencyMs - Request latency
   * @param {boolean} cached - Whether response was cached
   */
  recordRequest(type, latencyMs, cached = false) {
    this.metrics.requests.total++;
    this.metrics.requests.success++;

    if (this.metrics.requests.byType[type] !== undefined) {
      this.metrics.requests.byType[type]++;
    }

    // Record cache stats
    if (cached) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    this._updateCacheHitRate();

    // Record latency
    this._recordLatency(latencyMs);
  }

  /**
   * Record a failed request
   * @param {string} errorCode - Error code
   */
  recordError(errorCode) {
    this.metrics.requests.total++;
    this.metrics.requests.errors++;

    if (!this.metrics.errors.byCode[errorCode]) {
      this.metrics.errors.byCode[errorCode] = 0;
    }
    this.metrics.errors.byCode[errorCode]++;
  }

  /**
   * Record MCP tool invocation
   * @param {string} toolName - Tool name ('prompts_list' or 'prompts_get')
   * @param {boolean} success - Whether the tool call succeeded
   */
  recordMcpTool(toolName, success = true) {
    if (this.metrics.mcp.tools[toolName]) {
      this.metrics.mcp.tools[toolName].count++;
      if (!success) {
        this.metrics.mcp.tools[toolName].errors++;
      }
    }
  }

  /**
   * Record prompt generation metrics
   * @param {number} latencyMs - Generation latency in milliseconds
   */
  recordPromptGeneration(latencyMs) {
    const pg = this.metrics.mcp.promptGeneration;
    pg.count++;
    pg.latencyMs.min = Math.min(pg.latencyMs.min, latencyMs);
    pg.latencyMs.max = Math.max(pg.latencyMs.max, latencyMs);
    
    // Calculate running average
    pg.latencyMs.avg = Math.round(
      (pg.latencyMs.avg * (pg.count - 1) + latencyMs) / pg.count
    );
  }

  /**
   * Get current metrics snapshot
   * @returns {object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byType: {
          template: 0,
          flow: 0,
        },
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      },
      errors: {
        byCode: {},
      },
      mcp: {
        promptGeneration: {
          count: 0,
          latencyMs: {
            min: Infinity,
            max: 0,
            avg: 0,
          },
        },
        tools: {
          prompts_list: {
            count: 0,
            errors: 0,
          },
          prompts_get: {
            count: 0,
            errors: 0,
          },
        },
      },
    };

    this.latencyHistory = [];
    log.info('Metrics reset', {}, 'MetricsService');
  }

  // Private methods

  /**
   * Record latency and update statistics
   * @private
   */
  _recordLatency(latencyMs) {
    // Update min/max
    this.metrics.latency.min = Math.min(this.metrics.latency.min, latencyMs);
    this.metrics.latency.max = Math.max(this.metrics.latency.max, latencyMs);

    // Add to history
    this.latencyHistory.push(latencyMs);
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift(); // Remove oldest
    }

    // Calculate average
    const sum = this.latencyHistory.reduce((acc, val) => acc + val, 0);
    this.metrics.latency.avg = Math.round(sum / this.latencyHistory.length);

    // Calculate percentiles
    const sorted = [...this.latencyHistory].sort((a, b) => a - b);
    this.metrics.latency.p50 = this._percentile(sorted, 50);
    this.metrics.latency.p95 = this._percentile(sorted, 95);
    this.metrics.latency.p99 = this._percentile(sorted, 99);
  }

  /**
   * Calculate percentile from sorted array
   * @private
   */
  _percentile(sorted, p) {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  /**
   * Update cache hit rate
   * @private
   */
  _updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    if (total > 0) {
      this.metrics.cache.hitRate = Math.round((this.metrics.cache.hits / total) * 100);
    }
  }
}

// Export singleton instance
export default new MetricsService();
