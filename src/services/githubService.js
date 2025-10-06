import { createMcpError } from '../utils/errorHandler.js';
import { log } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * GitHub API Service with retry logic and exponential backoff
 */
class GitHubService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.inFlightRequests = new Map(); // Request deduplication cache
  }

  /**
   * Fetch file content from GitHub repository
   * @param {string} type - Resource type ('template' or 'flow')
   * @param {string} name - Resource name
   * @param {string} ref - Git reference (branch/tag/commit)
   * @param {string|null} etag - Optional ETag for conditional request
   * @returns {Promise<object>} Response with {content, etag, cached}
   */
  async fetchFile(type, name, ref = 'main', etag = null) {
    const path = this._buildFilePath(type, name);
    const cacheKey = `${type}:${name}:${ref}`;

    // Request deduplication: Check if request is already in-flight
    if (this.inFlightRequests.has(cacheKey)) {
      log.info('Deduplicating in-flight request', { cacheKey }, 'GitHubService');
      return this.inFlightRequests.get(cacheKey);
    }

    // Create promise for this request
    const requestPromise = this._fetchWithRetry(path, ref, etag)
      .finally(() => {
        // Clean up in-flight cache when request completes
        this.inFlightRequests.delete(cacheKey);
      });

    // Cache the in-flight promise
    this.inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  /**
   * List all template files from GitHub repository
   * @param {string} ref - Git reference (branch/tag/commit)
   * @returns {Promise<Array>} Array of template metadata {name, sha, size, download_url}
   */
  async listTemplates(ref = 'main') {
    const cacheKey = `template-list:${ref}`;

    // Request deduplication: Check if request is already in-flight
    if (this.inFlightRequests.has(cacheKey)) {
      log.info('Deduplicating in-flight list request', { cacheKey }, 'GitHubService');
      return this.inFlightRequests.get(cacheKey);
    }

    // Create promise for this request
    const requestPromise = this._listTemplatesWithRetry(ref)
      .finally(() => {
        // Clean up in-flight cache when request completes
        this.inFlightRequests.delete(cacheKey);
      });

    // Cache the in-flight promise
    this.inFlightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  /**
   * List templates with retry logic
   * @private
   */
  async _listTemplatesWithRetry(ref, attempt = 1) {
    try {
      return await this._listTemplatesFromGitHub(ref);
    } catch (error) {
      // Don't retry on client errors (4xx) or rate limit errors
      if (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED' || error.code === 'INVALID_REQUEST' || error.code === 'RATE_LIMITED') {
        throw error;
      }

      // Retry on network errors and server errors (5xx)
      if (attempt < config.retryAttempts) {
        const delay = this._calculateBackoff(attempt);
        log.warn(`GitHub API error listing templates, retrying in ${delay}ms`, {
          attempt,
          maxAttempts: config.retryAttempts,
          error: error.message,
        }, 'GitHubService');

        await this._sleep(delay);
        return this._listTemplatesWithRetry(ref, attempt + 1);
      }

      // Max retries exceeded
      log.error('GitHub API max retries exceeded for list templates', error, { ref }, 'GitHubService');
      throw createMcpError(
        'GITHUB_ERROR',
        `Failed to list templates from GitHub after ${config.retryAttempts} attempts: ${error.message}`,
        'github'
      );
    }
  }

  /**
   * List templates from GitHub API
   * @private
   */
  async _listTemplatesFromGitHub(ref) {
    const repoPath = this._extractRepoPath(config.githubRepoUrl);
    const url = `${this.baseUrl}/repos/${repoPath}/contents/templates?ref=${ref}`;

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${config.githubPat}`,
      'User-Agent': 'FlowyPrompt-MCP-Server',
    };

    log.info('Listing templates from GitHub', { url, ref }, 'GitHubService');

    const startTime = Date.now();
    const response = await fetch(url, { headers });
    const latencyMs = Date.now() - startTime;

    // Handle errors
    if (!response.ok) {
      return this._handleGitHubError(response, 'templates/');
    }

    // Parse response
    const items = await response.json();

    // Filter to .json files only
    const templates = items
      .filter((item) => item.type === 'file' && item.name.endsWith('.json'))
      .map((item) => ({
        name: item.name.replace(/\.json$/, ''), // Remove .json extension
        sha: item.sha,
        size: item.size,
        download_url: item.download_url,
      }));

    log.info('Successfully listed templates from GitHub', {
      count: templates.length,
      latencyMs,
    }, 'GitHubService');

    return templates;
  }

  /**
   * Fetch with retry logic (3 attempts with exponential backoff)
   * @private
   */
  async _fetchWithRetry(path, ref, etag, attempt = 1) {
    try {
      return await this._fetchFromGitHub(path, ref, etag);
    } catch (error) {
      // Don't retry on client errors (4xx) or rate limit errors
      if (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED' || error.code === 'INVALID_REQUEST' || error.code === 'RATE_LIMITED') {
        throw error;
      }

      // Retry on network errors and server errors (5xx)
      if (attempt < config.retryAttempts) {
        const delay = this._calculateBackoff(attempt);
        log.warn(`GitHub API error, retrying in ${delay}ms`, {
          attempt,
          maxAttempts: config.retryAttempts,
          error: error.message,
        }, 'GitHubService');

        await this._sleep(delay);
        return this._fetchWithRetry(path, ref, etag, attempt + 1);
      }

      // Max retries exceeded
      log.error('GitHub API max retries exceeded', error, { path, ref }, 'GitHubService');
      throw createMcpError(
        'GITHUB_ERROR',
        `Failed to fetch from GitHub after ${config.retryAttempts} attempts: ${error.message}`,
        'github'
      );
    }
  }

  /**
   * Fetch file content from GitHub API
   * @private
   */
  async _fetchFromGitHub(path, ref, etag) {
    const repoPath = this._extractRepoPath(config.githubRepoUrl);
    const url = `${this.baseUrl}/repos/${repoPath}/contents/${path}?ref=${ref}`;

    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      'Authorization': `token ${config.githubPat}`,
      'User-Agent': 'FlowyPrompt-MCP-Server',
    };

    // Add If-None-Match header for conditional request
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    log.info('Fetching from GitHub', { url, ref, hasEtag: !!etag }, 'GitHubService');

    const startTime = Date.now();
    const response = await fetch(url, { headers });
    const latencyMs = Date.now() - startTime;

    // Handle 304 Not Modified (cache hit)
    if (response.status === 304) {
      log.info('GitHub responded with 304 Not Modified', { latencyMs }, 'GitHubService');
      return {
        content: null,
        etag,
        cached: true,
        latencyMs,
      };
    }

    // Handle errors
    if (!response.ok) {
      return this._handleGitHubError(response, path);
    }

    // Parse response
    const content = await response.text();
    const newEtag = response.headers.get('ETag');

    // Validate file size
    if (content.length > config.maxFileSize) {
      throw createMcpError(
        'FILE_TOO_LARGE',
        `File size (${content.length} bytes) exceeds maximum allowed size (${config.maxFileSize} bytes)`,
        'github'
      );
    }

    log.info('Successfully fetched from GitHub', {
      path,
      size: content.length,
      latencyMs,
      etag: newEtag,
    }, 'GitHubService');

    return {
      content: JSON.parse(content),
      etag: newEtag,
      cached: false,
      latencyMs,
    };
  }

  /**
   * Handle GitHub API errors
   * @private
   */
  async _handleGitHubError(response, path) {
    const errorBody = await response.text();
    let errorMessage;

    try {
      const errorData = JSON.parse(errorBody);
      errorMessage = errorData.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }

    log.error('GitHub API error', null, {
      status: response.status,
      message: errorMessage,
      path,
    }, 'GitHubService');

    switch (response.status) {
      case 404:
        throw createMcpError('NOT_FOUND', `Resource not found: ${path}`, 'github');
      case 401:
      case 403:
        throw createMcpError('UNAUTHORIZED', 'GitHub authentication failed. Check credentials.', 'github');
      case 429:
        throw createMcpError('RATE_LIMITED', 'GitHub API rate limit exceeded', 'github');
      default:
        throw createMcpError('GITHUB_ERROR', `GitHub API error: ${errorMessage}`, 'github');
    }
  }

  /**
   * Build file path based on type and name
   * @private
   */
  _buildFilePath(type, name) {
    const folder = type === 'template' ? 'templates' : 'flows';
    return `${folder}/${name}.json`;
  }

  /**
   * Extract owner/repo from GitHub URL
   * @private
   */
  _extractRepoPath(url) {
    // https://github.com/owner/repo -> owner/repo
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) {
      throw createMcpError('INVALID_CONFIG', 'Invalid GitHub repository URL', 'config');
    }
    return match[1].replace(/\.git$/, '');
  }

  /**
   * Calculate exponential backoff with jitter
   * @private
   */
  _calculateBackoff(attempt) {
    // Base delay: 1s, 2s, 4s for attempts 1, 2, 3
    const baseDelay = 1000 * Math.pow(2, attempt - 1);
    // Add ±20% jitter
    const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(baseDelay + jitter);
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export default new GitHubService();
