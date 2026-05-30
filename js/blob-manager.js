/**
 * Spiritual Seasons PWA - Blob Manager
 * Centralized blob URL management to prevent memory leaks
 */

const BlobManager = (() => {
  // Track all active blob URLs: Map<url, {blob, scope, createdAt}>
  const activeBlobUrls = new Map();
  
  // Statistics
  let totalCreated = 0;
  let totalRevoked = 0;

  /**
   * Create a blob URL and track it
   * @param {Blob} blob - Blob object
   * @param {string} scope - Scope identifier (module name)
   * @param {string} mimeType - Optional MIME type
   * @returns {string} Blob URL
   */
  function create(blob, scope = 'global', mimeType = null) {
    // Create blob with proper MIME type if specified
    const finalBlob = mimeType ? 
      new Blob([blob], { type: mimeType }) : 
      blob;

    const url = URL.createObjectURL(finalBlob);

    // Track the blob URL
    activeBlobUrls.set(url, {
      blob: finalBlob,
      scope,
      createdAt: Date.now(),
      size: finalBlob.size,
      type: finalBlob.type
    });

    totalCreated++;

    Utils.debug.log(`[BlobManager] Created: ${url.substring(0, 50)}... (Scope: ${scope}, Total: ${activeBlobUrls.size})`);

    return url;
  }

  /**
   * Revoke a blob URL
   * @param {string} url - Blob URL to revoke
   * @returns {boolean} Success
   */
  function revoke(url) {
    if (!activeBlobUrls.has(url)) {
      Utils.debug.warn(`[BlobManager] URL not tracked: ${url.substring(0, 50)}...`);
      return false;
    }

    const data = activeBlobUrls.get(url);

    try {
      URL.revokeObjectURL(url);
      activeBlobUrls.delete(url);
      totalRevoked++;

      Utils.debug.log(`[BlobManager] Revoked: ${url.substring(0, 50)}... (Scope: ${data.scope}, Total: ${activeBlobUrls.size})`);
      return true;
    } catch (error) {
      Utils.debug.error(`[BlobManager] Failed to revoke URL:`, error);
      return false;
    }
  }

  /**
   * Revoke all blob URLs for a specific scope
   * @param {string} scope - Scope identifier
   * @returns {number} Number of URLs revoked
   */
  function revokeByScope(scope) {
    let count = 0;

    activeBlobUrls.forEach((data, url) => {
      if (data.scope === scope) {
        if (revoke(url)) {
          count++;
        }
      }
    });

    if (count > 0) {
      Utils.debug.log(`[BlobManager] Revoked ${count} URLs for scope: ${scope}`);
    }

    return count;
  }

  /**
   * Revoke all blob URLs
   * @returns {number} Number of URLs revoked
   */
  function revokeAll() {
    const count = activeBlobUrls.size;

    activeBlobUrls.forEach((data, url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        Utils.debug.error(`[BlobManager] Failed to revoke URL:`, error);
      }
    });

    activeBlobUrls.clear();
    totalRevoked += count;

    Utils.debug.log(`[BlobManager] Revoked all ${count} blob URLs`);

    return count;
  }

  /**
   * Revoke old blob URLs (older than specified age)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {number} Number of URLs revoked
   */
  function revokeOld(maxAgeMs = 5 * 60 * 1000) {
    const now = Date.now();
    let count = 0;

    activeBlobUrls.forEach((data, url) => {
      if (now - data.createdAt > maxAgeMs) {
        if (revoke(url)) {
          count++;
        }
      }
    });

    if (count > 0) {
      Utils.debug.log(`[BlobManager] Revoked ${count} old URLs (older than ${maxAgeMs}ms)`);
    }

    return count;
  }

  /**
   * Get number of active blob URLs
   * @returns {number}
   */
  function getActiveCount() {
    return activeBlobUrls.size;
  }

  /**
   * Get blob URLs for a specific scope
   * @param {string} scope - Scope identifier
   * @returns {string[]}
   */
  function getByScope(scope) {
    const urls = [];

    activeBlobUrls.forEach((data, url) => {
      if (data.scope === scope) {
        urls.push(url);
      }
    });

    return urls;
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      active: activeBlobUrls.size,
      totalCreated,
      totalRevoked,
      byScope: {},
      totalSize: 0
    };

    activeBlobUrls.forEach((data) => {
      if (!stats.byScope[data.scope]) {
        stats.byScope[data.scope] = { count: 0, size: 0 };
      }
      stats.byScope[data.scope].count++;
      stats.byScope[data.scope].size += data.size;
      stats.totalSize += data.size;
    });

    return stats;
  }

  /**
   * Debug - log all blob URLs
   */
  function debug() {
    Utils.debug.group('[BlobManager] Debug Info');
    Utils.debug.log('Active URLs:', activeBlobUrls.size);
    Utils.debug.log('Total created:', totalCreated);
    Utils.debug.log('Total revoked:', totalRevoked);
    Utils.debug.log('Stats:', getStats());
    
    activeBlobUrls.forEach((data, url) => {
      const age = ((Date.now() - data.createdAt) / 1000).toFixed(1);
      Utils.debug.log(`- ${url.substring(0, 50)}... (${data.scope}, ${(data.size / 1024).toFixed(2)}KB, ${age}s old)`);
    });
    
    Utils.debug.groupEnd();
  }

  /**
   * Setup automatic cleanup
   * Revokes old blob URLs periodically
   */
  function setupAutoCleanup() {
    // Cleanup old blobs every 5 minutes
    const intervalId = setInterval(() => {
      const count = revokeOld(5 * 60 * 1000); // 5 minutes
      if (count > 0) {
        Utils.debug.log(`[BlobManager] Auto-cleanup: revoked ${count} old URLs`);
      }

      // Warn if too many active
      if (activeBlobUrls.size > 20) {
        Utils.debug.warn(`[BlobManager] ${activeBlobUrls.size} active blob URLs - consider cleanup`);
      }
    }, 5 * 60 * 1000);

    // Store interval ID for cleanup
    return intervalId;
  }

  // Public API
  return {
    create,
    revoke,
    revokeByScope,
    revokeAll,
    revokeOld,
    getActiveCount,
    getByScope,
    getStats,
    debug,
    setupAutoCleanup
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlobManager;
}
