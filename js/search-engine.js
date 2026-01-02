/**
 * Spiritual Seasons PWA - Enhanced Search Engine
 * Full-text search with fuzzy matching, highlighting, and relevance scoring
 */

const SearchEngine = (() => {
  // Search index: Map<field, Map<term, Set<docId>>>
  const indexes = new Map();
  
  // Documents: Map<docId, document>
  const documents = new Map();
  
  // Configuration
  const config = {
    minTermLength: 2,
    maxTermLength: 50,
    fuzzyThreshold: 0.7,
    stopWords: new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'it', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
      'when', 'where', 'why', 'how'
    ])
  };

  /**
   * Normalize text for indexing
   * @param {string} text - Text to normalize
   * @returns {string}
   * @private
   */
  function normalizeText(text) {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  /**
   * Tokenize text into terms
   * @param {string} text - Text to tokenize
   * @returns {string[]}
   * @private
   */
  function tokenize(text) {
    const normalized = normalizeText(text);
    
    return normalized
      .split(/\s+/)
      .filter(term => 
        term.length >= config.minTermLength &&
        term.length <= config.maxTermLength &&
        !config.stopWords.has(term)
      );
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   * @param {string} a
   * @param {string} b
   * @returns {number}
   * @private
   */
  function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Calculate similarity score (0-1)
   * @param {string} a
   * @param {string} b
   * @returns {number}
   * @private
   */
  function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    
    const distance = levenshteinDistance(a, b);
    return 1.0 - (distance / maxLen);
  }

  /**
   * Add document to index
   * @param {string} id - Document ID
   * @param {Object} doc - Document object
   * @param {string[]} fields - Fields to index
   */
  function addDocument(id, doc, fields = ['content']) {
    // Store document
    documents.set(id, { ...doc, _id: id });

    // Index each field
    fields.forEach(field => {
      const text = doc[field];
      if (!text) return;

      // Get or create field index
      if (!indexes.has(field)) {
        indexes.set(field, new Map());
      }
      const fieldIndex = indexes.get(field);

      // Tokenize and index terms
      const terms = tokenize(text);
      
      terms.forEach(term => {
        if (!fieldIndex.has(term)) {
          fieldIndex.set(term, new Set());
        }
        fieldIndex.get(term).add(id);
      });
    });

    console.log(`[Search] Indexed document ${id} (fields: ${fields.join(', ')})`);
  }

  /**
   * Remove document from index
   * @param {string} id - Document ID
   */
  function removeDocument(id) {
    if (!documents.has(id)) return;

    // Remove from all field indexes
    indexes.forEach((fieldIndex) => {
      fieldIndex.forEach((docIds, term) => {
        docIds.delete(id);
        
        // Clean up empty term entries
        if (docIds.size === 0) {
          fieldIndex.delete(term);
        }
      });
    });

    // Remove document
    documents.delete(id);

    console.log(`[Search] Removed document ${id}`);
  }

  /**
   * Search with fuzzy matching
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Search results
   */
  function search(query, options = {}) {
    const {
      fields = ['content'],
      fuzzy = true,
      limit = 50,
      offset = 0
    } = options;

    if (!query || query.trim().length < config.minTermLength) {
      return [];
    }

    // Tokenize query
    const queryTerms = tokenize(query);
    
    if (queryTerms.length === 0) {
      return [];
    }

    // Score documents
    const scores = new Map(); // docId -> score

    fields.forEach(field => {
      if (!indexes.has(field)) return;
      
      const fieldIndex = indexes.get(field);

      queryTerms.forEach(queryTerm => {
        // Exact match
        if (fieldIndex.has(queryTerm)) {
          fieldIndex.get(queryTerm).forEach(docId => {
            const currentScore = scores.get(docId) || 0;
            scores.set(docId, currentScore + 10); // Exact match = high score
          });
        }

        // Fuzzy match
        if (fuzzy) {
          fieldIndex.forEach((docIds, indexTerm) => {
            const score = similarity(queryTerm, indexTerm);
            
            if (score >= config.fuzzyThreshold) {
              docIds.forEach(docId => {
                const currentScore = scores.get(docId) || 0;
                scores.set(docId, currentScore + (score * 5)); // Fuzzy match = lower score
              });
            }
          });
        }
      });
    });

    // Convert to results array
    const results = Array.from(scores.entries())
      .map(([docId, score]) => ({
        id: docId,
        score,
        document: documents.get(docId)
      }))
      .sort((a, b) => b.score - a.score);

    // Apply pagination
    const paginated = results.slice(offset, offset + limit);

    console.log(`[Search] Query "${query}" found ${results.length} results`);

    return paginated;
  }

  /**
   * Highlight search matches in text
   * @param {string} text - Text to highlight
   * @param {string} query - Search query
   * @param {string} className - CSS class for highlights
   * @returns {string} HTML with highlights
   */
  function highlight(text, query, className = 'search-highlight') {
    if (!text || !query) return text;

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return text;

    let highlighted = text;

    queryTerms.forEach(term => {
      // Create case-insensitive regex
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="${className}">$1</span>`);
    });

    return highlighted;
  }

  /**
   * Get search suggestions/autocomplete
   * @param {string} prefix - Partial query
   * @param {Object} options
   * @returns {string[]}
   */
  function suggest(prefix, options = {}) {
    const {
      field = 'content',
      limit = 10
    } = options;

    if (!prefix || prefix.length < 2) return [];

    const normalizedPrefix = normalizeText(prefix);
    const suggestions = new Set();

    if (indexes.has(field)) {
      const fieldIndex = indexes.get(field);

      fieldIndex.forEach((docIds, term) => {
        if (term.startsWith(normalizedPrefix)) {
          suggestions.add(term);
        }
      });
    }

    return Array.from(suggestions)
      .sort()
      .slice(0, limit);
  }

  /**
   * Clear all indexes
   */
  function clear() {
    indexes.clear();
    documents.clear();
    console.log('[Search] Cleared all indexes');
  }

  /**
   * Rebuild index from documents
   * @param {Array} docs - Array of documents
   * @param {string} idField - Field to use as ID
   * @param {string[]} indexFields - Fields to index
   */
  function rebuildIndex(docs, idField = 'id', indexFields = ['content']) {
    clear();

    docs.forEach(doc => {
      const id = doc[idField];
      if (id) {
        addDocument(id, doc, indexFields);
      }
    });

    console.log(`[Search] Rebuilt index with ${docs.length} documents`);
  }

  /**
   * Get index statistics
   * @returns {Object}
   */
  function getStats() {
    const stats = {
      documents: documents.size,
      indexes: indexes.size,
      terms: 0,
      byField: {}
    };

    indexes.forEach((fieldIndex, field) => {
      stats.byField[field] = {
        terms: fieldIndex.size,
        documents: new Set()
      };

      fieldIndex.forEach((docIds) => {
        docIds.forEach(docId => {
          stats.byField[field].documents.add(docId);
        });
      });

      stats.byField[field].documents = stats.byField[field].documents.size;
      stats.terms += fieldIndex.size;
    });

    return stats;
  }

  /**
   * Debug - log index info
   */
  function debug() {
    console.group('[Search] Index Info');
    console.log('Stats:', getStats());
    console.log('Fields:', Array.from(indexes.keys()));
    console.log('Sample terms per field:');
    
    indexes.forEach((fieldIndex, field) => {
      const sampleTerms = Array.from(fieldIndex.keys()).slice(0, 10);
      console.log(`  ${field}:`, sampleTerms.join(', '));
    });
    
    console.groupEnd();
  }

  /**
   * Export index for persistence
   * @returns {Object}
   */
  function exportIndex() {
    const exported = {
      documents: Array.from(documents.entries()),
      indexes: {}
    };

    indexes.forEach((fieldIndex, field) => {
      exported.indexes[field] = {};
      
      fieldIndex.forEach((docIds, term) => {
        exported.indexes[field][term] = Array.from(docIds);
      });
    });

    return exported;
  }

  /**
   * Import index from persistence
   * @param {Object} data - Exported index data
   */
  function importIndex(data) {
    clear();

    // Import documents
    data.documents.forEach(([id, doc]) => {
      documents.set(id, doc);
    });

    // Import indexes
    Object.entries(data.indexes).forEach(([field, fieldData]) => {
      const fieldIndex = new Map();
      
      Object.entries(fieldData).forEach(([term, docIds]) => {
        fieldIndex.set(term, new Set(docIds));
      });

      indexes.set(field, fieldIndex);
    });

    console.log('[Search] Imported index');
  }

  // Public API
  return {
    addDocument,
    removeDocument,
    search,
    highlight,
    suggest,
    clear,
    rebuildIndex,
    getStats,
    debug,
    exportIndex,
    importIndex
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchEngine;
}
