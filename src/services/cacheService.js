import { log } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Cache Service with ETag support
 * Supports both in-memory and Redis caching
 */
class CacheService {
  constructor() {
    this.type = config.cacheType || 'memory';
    this.ttl = config.cacheTtlMs || 300000; // 5 minutes default

    if (this.type === 'memory') {
      this.cache = new Map();
      log.info('Initialized in-memory cache', { ttl: this.ttl }, 'CacheService');
    } else if (this.type === 'redis') {
      // Redis implementation placeholder
      // this.client = redis.createClient({ url: config.redisUrl });
      log.info('Redis cache not yet implemented, falling back to memory', {}, 'CacheService');
      this.type = 'memory';
      this.cache = new Map();
    }
  }

  /**
   * Get cached entry by key
   * @param {string} key - Cache key
   * @returns {Promise<object|null>} Cached entry or null if not found/expired
   */
  async get(key) {
    if (this.type === 'memory') {
      return this._getFromMemory(key);
    }
    // Add Redis implementation here
    return null;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {object} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = this.ttl) {
    if (this.type === 'memory') {
      return this._setToMemory(key, value, ttl);
    }
    // Add Redis implementation here
  }

  /**
   * Delete cache entry
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (this.type === 'memory') {
      this.cache.delete(key);
      log.info('Cache entry deleted', { key }, 'CacheService');
    }
    // Add Redis implementation here
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    if (this.type === 'memory') {
      this.cache.clear();
      log.info('Cache cleared', {}, 'CacheService');
    }
    // Add Redis implementation here
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>} Cache stats
   */
  async getStats() {
    if (this.type === 'memory') {
      const entries = Array.from(this.cache.values());
      const now = Date.now();
      const validEntries = entries.filter((entry) => entry.expiresAt > now);

      return {
        type: 'memory',
        totalEntries: this.cache.size,
        validEntries: validEntries.length,
        expiredEntries: this.cache.size - validEntries.length,
        ttl: this.ttl,
      };
    }
    return { type: this.type };
  }

  /**
   * Build cache key from request parameters
   * @param {string} type - Resource type
   * @param {string} name - Resource name
   * @param {string} ref - Git reference
   * @returns {string} Cache key
   */
  buildKey(type, name, ref) {
    return `${type}:${name}:${ref}`;
  }

  // Private methods for in-memory cache

  /**
   * Get from memory cache
   * @private
   */
  _getFromMemory(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      log.info('Cache miss', { key }, 'CacheService');
      return null;
    }

    const now = Date.now();

    // Check if entry is expired
    if (entry.expiresAt <= now) {
      log.info('Cache entry expired', { key, age: now - entry.cachedAt }, 'CacheService');
      this.cache.delete(key);
      return null;
    }

    log.info('Cache hit', {
      key,
      age: now - entry.cachedAt,
      ttl: entry.expiresAt - now,
    }, 'CacheService');

    // Return only the value, not the metadata
    return entry.value;
  }

  /**
   * Set to memory cache
   * @private
   */
  _setToMemory(key, value, ttl) {
    const now = Date.now();
    const entry = {
      value: value, // Store value separately to preserve arrays
      cachedAt: now,
      expiresAt: now + ttl,
    };

    this.cache.set(key, entry);

    log.info('Cache entry set', {
      key,
      ttl,
      size: this.cache.size,
    }, 'CacheService');

    // Cleanup expired entries periodically
    this._scheduleCleanup();
  }

  /**
   * Schedule cleanup of expired entries
   * @private
   */
  _scheduleCleanup() {
    if (this._cleanupScheduled) return;

    this._cleanupScheduled = true;

    setTimeout(() => {
      this._cleanupScheduled = false;
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt <= now) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        log.info('Cleaned up expired cache entries', { cleaned }, 'CacheService');
      }
    }, 60000); // Cleanup every 60 seconds
  }
}

// Export singleton instance
export default new CacheService();
