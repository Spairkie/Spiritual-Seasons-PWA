/**
 * Spiritual Seasons PWA - Module Lifecycle Manager
 * Standardizes module initialization, rendering, and cleanup
 * Ensures proper resource management and prevents memory leaks
 */

const ModuleLifecycle = (() => {
  // Registry of all modules
  const modules = new Map();
  
  // Module states
  const STATE = {
    UNINITIALIZED: 'uninitialized',
    INITIALIZING: 'initializing',
    READY: 'ready',
    RENDERING: 'rendering',
    ACTIVE: 'active',
    CLEANING: 'cleaning',
    ERROR: 'error'
  };

  /**
   * Base Module class
   * All modules should extend this or follow this pattern
   */
  class Module {
    constructor(name, options = {}) {
      this.name = name;
      this.state = STATE.UNINITIALIZED;
      this.scope = name; // For EventManager
      this.options = options;
      this.dependencies = options.dependencies || [];
      this.initPromise = null;
      this.data = null;
    }

    /**
     * Initialize module - override in subclass
     * @returns {Promise<void>}
     */
    async init() {
      throw new Error(`Module ${this.name} must implement init()`);
    }

    /**
     * Render module - override in subclass
     * @param {string} containerId - Container element ID
     * @param {Object} params - Render parameters
     * @returns {Promise<void>}
     */
    async render(containerId, params = {}) {
      throw new Error(`Module ${this.name} must implement render()`);
    }

    /**
     * Cleanup module resources - override in subclass
     * @returns {Promise<void>}
     */
    async cleanup() {
      // Default cleanup - removes all event listeners
      EventManager.cleanup(this.scope);
    }

    /**
     * Get module state
     * @returns {string}
     */
    getState() {
      return this.state;
    }

    /**
     * Set module state
     * @param {string} newState
     */
    setState(newState) {
      const oldState = this.state;
      this.state = newState;
      Utils.debug.log(`[Module:${this.name}] ${oldState} → ${newState}`);
    }

    /**
     * Check if module is ready
     * @returns {boolean}
     */
    isReady() {
      return this.state === STATE.READY || this.state === STATE.ACTIVE;
    }

    /**
     * Check if module is active
     * @returns {boolean}
     */
    isActive() {
      return this.state === STATE.ACTIVE;
    }
  }

  /**
   * Register a module
   * @param {string} name - Module name
   * @param {Module|Object} module - Module instance or module object
   */
  function register(name, module) {
    if (modules.has(name)) {
      Utils.debug.warn(`[Lifecycle] Module ${name} already registered`);
      return;
    }

    modules.set(name, {
      module,
      state: STATE.UNINITIALIZED,
      dependencies: module.dependencies || [],
      initPromise: null
    });

    Utils.debug.log(`[Lifecycle] Registered module: ${name}`);
  }

  /**
   * Initialize a module
   * @param {string} name - Module name
   * @param {any} data - Initialization data
   * @returns {Promise<void>}
   */
  async function initialize(name, data = null) {
    if (!modules.has(name)) {
      throw new Error(`Module ${name} not registered`);
    }

    const entry = modules.get(name);
    
    // Already initialized or initializing
    if (entry.state === STATE.READY || entry.state === STATE.ACTIVE) {
      return;
    }
    
    if (entry.state === STATE.INITIALIZING) {
      return entry.initPromise;
    }

    entry.state = STATE.INITIALIZING;

    try {
      // Initialize dependencies first
      for (const depName of entry.dependencies) {
        await initialize(depName);
      }

      // Initialize module
      const initPromise = entry.module.init ? 
        entry.module.init(data) : 
        Promise.resolve();

      entry.initPromise = initPromise;
      await initPromise;

      entry.state = STATE.READY;
      
      if (entry.module.setState) {
        entry.module.setState(STATE.READY);
      }

      Utils.debug.log(`[Lifecycle] Initialized: ${name}`);
    } catch (error) {
      entry.state = STATE.ERROR;
      Utils.debug.error(`[Lifecycle] Failed to initialize ${name}:`, error);
      throw error;
    }
  }

  /**
   * Initialize multiple modules
   * @param {Array<{name: string, data?: any}>} moduleList
   * @returns {Promise<void>}
   */
  async function initializeAll(moduleList) {
    Utils.debug.log(`[Lifecycle] Initializing ${moduleList.length} modules`);
    
    for (const { name, data } of moduleList) {
      try {
        await initialize(name, data);
      } catch (error) {
        Utils.debug.error(`[Lifecycle] Failed to initialize ${name}:`, error);
        // Continue with other modules
      }
    }

    Utils.debug.log('[Lifecycle] All modules initialized');
  }

  /**
   * Render a module
   * @param {string} name - Module name
   * @param {string} containerId - Container element ID
   * @param {Object} params - Render parameters
   * @returns {Promise<void>}
   */
  async function render(name, containerId, params = {}) {
    if (!modules.has(name)) {
      throw new Error(`Module ${name} not registered`);
    }

    const entry = modules.get(name);

    // Initialize if not ready
    if (entry.state === STATE.UNINITIALIZED) {
      await initialize(name);
    }

    // Wait if initializing
    if (entry.state === STATE.INITIALIZING) {
      await entry.initPromise;
    }

    if (entry.state === STATE.ERROR) {
      throw new Error(`Module ${name} is in error state`);
    }

    try {
      entry.state = STATE.RENDERING;
      
      if (entry.module.setState) {
        entry.module.setState(STATE.RENDERING);
      }

      await entry.module.render(containerId, params);

      entry.state = STATE.ACTIVE;
      
      if (entry.module.setState) {
        entry.module.setState(STATE.ACTIVE);
      }

      Utils.debug.log(`[Lifecycle] Rendered: ${name}`);
    } catch (error) {
      entry.state = STATE.ERROR;
      Utils.debug.error(`[Lifecycle] Failed to render ${name}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup a module
   * @param {string} name - Module name
   * @returns {Promise<void>}
   */
  async function cleanup(name) {
    if (!modules.has(name)) {
      Utils.debug.warn(`[Lifecycle] Module ${name} not registered`);
      return;
    }

    const entry = modules.get(name);

    if (entry.state === STATE.UNINITIALIZED) {
      return;
    }

    try {
      entry.state = STATE.CLEANING;
      
      if (entry.module.setState) {
        entry.module.setState(STATE.CLEANING);
      }

      if (entry.module.cleanup) {
        await entry.module.cleanup();
      }

      // Also use EventManager cleanup
      if (entry.module.scope) {
        EventManager.cleanup(entry.module.scope);
      }

      entry.state = STATE.READY;
      
      if (entry.module.setState) {
        entry.module.setState(STATE.READY);
      }

      Utils.debug.log(`[Lifecycle] Cleaned up: ${name}`);
    } catch (error) {
      Utils.debug.error(`[Lifecycle] Failed to cleanup ${name}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup all modules
   * @returns {Promise<void>}
   */
  async function cleanupAll() {
    Utils.debug.log('[Lifecycle] Cleaning up all modules');

    for (const [name, entry] of modules) {
      try {
        await cleanup(name);
      } catch (error) {
        Utils.debug.error(`[Lifecycle] Failed to cleanup ${name}:`, error);
      }
    }

    Utils.debug.log('[Lifecycle] All modules cleaned up');
  }

  /**
   * Get module by name
   * @param {string} name - Module name
   * @returns {Module|Object}
   */
  function get(name) {
    const entry = modules.get(name);
    return entry ? entry.module : null;
  }

  /**
   * Get module state
   * @param {string} name - Module name
   * @returns {string}
   */
  function getState(name) {
    const entry = modules.get(name);
    return entry ? entry.state : STATE.UNINITIALIZED;
  }

  /**
   * Check if module is ready
   * @param {string} name - Module name
   * @returns {boolean}
   */
  function isReady(name) {
    const state = getState(name);
    return state === STATE.READY || state === STATE.ACTIVE;
  }

  /**
   * Get all registered modules
   * @returns {Array<string>}
   */
  function list() {
    return Array.from(modules.keys());
  }

  /**
   * Get statistics for debugging
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      total: modules.size,
      byState: {}
    };

    Object.values(STATE).forEach(state => {
      stats.byState[state] = 0;
    });

    modules.forEach(entry => {
      stats.byState[entry.state]++;
    });

    return stats;
  }

  /**
   * Debug - log all module states
   */
  function debug() {
    Utils.debug.group('[Lifecycle] Module States');
    modules.forEach((entry, name) => {
      Utils.debug.log(`${name}: ${entry.state}`);
    });
    Utils.debug.log('Stats:', getStats());
    Utils.debug.groupEnd();
  }

  // Public API
  return {
    Module,
    STATE,
    register,
    initialize,
    initializeAll,
    render,
    cleanup,
    cleanupAll,
    get,
    getState,
    isReady,
    list,
    getStats,
    debug
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModuleLifecycle;
}
