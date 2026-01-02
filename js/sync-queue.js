/**
 * Spiritual Seasons PWA - Sync Queue
 * Queues operations while offline and syncs when connection restored
 * Enables optimistic UI updates with rollback on failure
 */

const SyncQueue = (() => {
  // Queue: Array<{id, operation, data, timestamp, retries, status}>
  let queue = [];
  
  // Operation handlers: Map<operationType, handler>
  const handlers = new Map();
  
  // Configuration
  const config = {
    maxRetries: 3,
    retryDelay: 2000,
    batchSize: 5,
    storageKey: 'sync-queue'
  };
  
  // Status
  const STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUCCESS: 'success',
    FAILED: 'failed'
  };
  
  // State
  let isProcessing = false;
  let isOnline = navigator.onLine;

  /**
   * Initialize sync queue
   */
  function init() {
    // Load persisted queue
    loadQueue();

    // Setup online/offline listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Try to process queue on init if online
    if (isOnline) {
      processQueue();
    }

    console.log('[SyncQueue] Initialized (queue size: ' + queue.length + ')');
  }

  /**
   * Register an operation handler
   * @param {string} type - Operation type
   * @param {Function} handler - Handler function (data) => Promise
   */
  function registerHandler(type, handler) {
    handlers.set(type, handler);
    console.log(`[SyncQueue] Registered handler: ${type}`);
  }

  /**
   * Add operation to queue
   * @param {string} type - Operation type
   * @param {Object} data - Operation data
   * @param {Object} options
   * @returns {string} Operation ID
   */
  function enqueue(type, data, options = {}) {
    const operation = {
      id: generateId(),
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: STATUS.PENDING,
      optimistic: options.optimistic || false,
      rollback: options.rollback || null
    };

    queue.push(operation);
    persistQueue();

    console.log(`[SyncQueue] Enqueued ${type} (ID: ${operation.id})`);

    // Try to process if online
    if (isOnline && !isProcessing) {
      processQueue();
    }

    return operation.id;
  }

  /**
   * Process queue
   * @returns {Promise<void>}
   */
  async function processQueue() {
    if (!isOnline || isProcessing || queue.length === 0) {
      return;
    }

    isProcessing = true;
    console.log(`[SyncQueue] Processing ${queue.length} operations`);

    // Get pending operations (batch size)
    const pending = queue
      .filter(op => op.status === STATUS.PENDING)
      .slice(0, config.batchSize);

    for (const operation of pending) {
      try {
        await processOperation(operation);
      } catch (error) {
        console.error(`[SyncQueue] Failed to process ${operation.id}:`, error);
      }
    }

    // Remove successful operations
    queue = queue.filter(op => op.status !== STATUS.SUCCESS);
    persistQueue();

    isProcessing = false;

    // Continue processing if more items
    if (queue.length > 0 && isOnline) {
      setTimeout(() => processQueue(), 1000);
    }
  }

  /**
   * Process single operation
   * @param {Object} operation
   * @returns {Promise<void>}
   * @private
   */
  async function processOperation(operation) {
    operation.status = STATUS.PROCESSING;

    const handler = handlers.get(operation.type);
    
    if (!handler) {
      console.error(`[SyncQueue] No handler for ${operation.type}`);
      operation.status = STATUS.FAILED;
      return;
    }

    try {
      // Execute handler
      await handler(operation.data);
      
      operation.status = STATUS.SUCCESS;
      console.log(`[SyncQueue] Success: ${operation.id}`);
      
      // Notify listeners
      notifyListeners('success', operation);
      
    } catch (error) {
      operation.retries++;
      
      if (operation.retries >= config.maxRetries) {
        operation.status = STATUS.FAILED;
        console.error(`[SyncQueue] Failed after ${config.maxRetries} retries: ${operation.id}`, error);
        
        // Rollback optimistic update if applicable
        if (operation.optimistic && operation.rollback) {
          try {
            await operation.rollback();
            console.log(`[SyncQueue] Rolled back: ${operation.id}`);
          } catch (rollbackError) {
            console.error(`[SyncQueue] Rollback failed: ${operation.id}`, rollbackError);
          }
        }
        
        // Notify listeners
        notifyListeners('failed', operation);
        
      } else {
        operation.status = STATUS.PENDING;
        console.log(`[SyncQueue] Retry ${operation.retries}/${config.maxRetries}: ${operation.id}`);
        
        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, config.retryDelay * operation.retries)
        );
      }
    }
  }

  /**
   * Handle online event
   * @private
   */
  function handleOnline() {
    isOnline = true;
    console.log('[SyncQueue] Connection restored');
    
    notifyListeners('online');
    
    // Process queue
    processQueue();
  }

  /**
   * Handle offline event
   * @private
   */
  function handleOffline() {
    isOnline = false;
    console.log('[SyncQueue] Connection lost');
    
    notifyListeners('offline');
  }

  /**
   * Generate unique ID
   * @returns {string}
   * @private
   */
  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Persist queue to localStorage
   * @private
   */
  function persistQueue() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(queue));
    } catch (error) {
      console.error('[SyncQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   * @private
   */
  function loadQueue() {
    try {
      const stored = localStorage.getItem(config.storageKey);
      if (stored) {
        queue = JSON.parse(stored);
        console.log(`[SyncQueue] Loaded ${queue.length} operations from storage`);
      }
    } catch (error) {
      console.error('[SyncQueue] Failed to load queue:', error);
      queue = [];
    }
  }

  /**
   * Get queue status
   * @returns {Object}
   */
  function getStatus() {
    const stats = {
      total: queue.length,
      pending: 0,
      processing: 0,
      failed: 0,
      isOnline,
      isProcessing
    };

    queue.forEach(op => {
      if (op.status === STATUS.PENDING) stats.pending++;
      if (op.status === STATUS.PROCESSING) stats.processing++;
      if (op.status === STATUS.FAILED) stats.failed++;
    });

    return stats;
  }

  /**
   * Get queue items
   * @param {string} status - Filter by status
   * @returns {Array}
   */
  function getItems(status = null) {
    if (status) {
      return queue.filter(op => op.status === status);
    }
    return [...queue];
  }

  /**
   * Clear queue
   * @param {string} status - Clear only specific status
   */
  function clear(status = null) {
    if (status) {
      const before = queue.length;
      queue = queue.filter(op => op.status !== status);
      const removed = before - queue.length;
      console.log(`[SyncQueue] Cleared ${removed} ${status} operations`);
    } else {
      queue = [];
      console.log('[SyncQueue] Cleared all operations');
    }
    
    persistQueue();
  }

  /**
   * Retry failed operations
   * @returns {Promise<void>}
   */
  async function retryFailed() {
    const failed = queue.filter(op => op.status === STATUS.FAILED);
    
    console.log(`[SyncQueue] Retrying ${failed.length} failed operations`);
    
    // Reset status and retries
    failed.forEach(op => {
      op.status = STATUS.PENDING;
      op.retries = 0;
    });
    
    persistQueue();
    
    // Process queue
    if (isOnline) {
      await processQueue();
    }
  }

  // Event listeners
  const listeners = new Set();

  /**
   * Add event listener
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  function on(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  /**
   * Notify listeners
   * @param {string} event
   * @param {Object} data
   * @private
   */
  function notifyListeners(event, data = null) {
    listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('[SyncQueue] Listener error:', error);
      }
    });
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  function getStats() {
    const stats = getStatus();
    
    // Add age info
    stats.oldestPending = null;
    stats.newestPending = null;
    
    const pending = queue.filter(op => op.status === STATUS.PENDING);
    if (pending.length > 0) {
      const timestamps = pending.map(op => op.timestamp);
      stats.oldestPending = Math.min(...timestamps);
      stats.newestPending = Math.max(...timestamps);
      stats.oldestAge = Date.now() - stats.oldestPending;
    }
    
    return stats;
  }

  /**
   * Debug - log queue info
   */
  function debug() {
    console.group('[SyncQueue] Debug Info');
    console.log('Status:', getStatus());
    console.log('Stats:', getStats());
    console.log('Handlers:', Array.from(handlers.keys()));
    console.log('Queue:', queue);
    console.groupEnd();
  }

  // Public API
  return {
    init,
    registerHandler,
    enqueue,
    processQueue,
    getStatus,
    getItems,
    clear,
    retryFailed,
    on,
    getStats,
    debug
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncQueue;
}
