/**
 * Advanced Search Module
 * Search across devotions, journal entries, and reflections
 */

const Search = (() => {
  let searchIndex = null;
  let searchResults = [];
  let currentFilters = {
    type: 'all', // all, devotions, journal, reflections
    season: 'all', // all, winter, spring, summer, autumn
    hasJournal: false,
    hasAudio: false,
    isFavorite: false,
    isComplete: false
  };

  /**
   * Initialize search index
   */
  async function init() {
    await buildSearchIndex();
    return true;
  }

  /**
   * Build searchable index from all content
   */
  async function buildSearchIndex() {
    searchIndex = {
      devotions: [],
      journal: [],
      reflections: []
    };

    // Index devotional content
    const seasons = Devotional.getSeasons();
    for (const season of seasons) {
      const days = Devotional.getDaysInSeason(season.id);
      for (const day of days) {
        searchIndex.devotions.push({
          type: 'devotion',
          day: day.day,
          season: season.id,
          seasonTitle: season.title,
          title: `Day ${day.day}`,
          scriptureRef: day.scriptureRef,
          scriptureText: day.scriptureText,
          prompt: day.prompt,
          content: `${day.scriptureRef} ${day.scriptureText} ${day.prompt}`.toLowerCase()
        });
      }
    }

    // Index journal entries
    const journalEntries = await Store.getAllJournalEntries();
    for (const entry of journalEntries) {
      const dayData = Devotional.getDay(entry.day);
      const season = Devotional.getSeasonForDay(entry.day);
      
      searchIndex.journal.push({
        type: 'journal',
        day: entry.day,
        season: season?.id,
        seasonTitle: season?.title,
        title: `Day ${entry.day} Journal`,
        scriptureRef: dayData?.scriptureRef,
        content: entry.content.toLowerCase(),
        date: entry.createdAt
      });
    }

    // Index weekly reflections
    const reflections = await WeeklyReflection.getAllReflections();
    for (const reflection of reflections) {
      // Safety check for responses property
      if (!reflection || !reflection.responses || !Array.isArray(reflection.responses)) {
        continue;
      }
      
      const content = reflection.responses.join(' ').toLowerCase();
      
      searchIndex.reflections.push({
        type: 'reflection',
        week: reflection.week,
        title: `Week ${reflection.week} Reflection`,
        content: content,
        date: reflection.createdAt
      });
    }
  }

  /**
   * Perform search with fuzzy matching
   */
  async function performSearch(query, filters = currentFilters) {
    if (!searchIndex) {
      await buildSearchIndex();
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    // Search devotions
    if (filters.type === 'all' || filters.type === 'devotions') {
      for (const item of searchIndex.devotions) {
        const matches = await matchesFilters(item, filters); 
        if (matches) {
          const score = calculateRelevanceScore(item.content, searchTerm);
          if (score > 0) {
            results.push({ ...item, score, query: searchTerm });
          }
        }
      }
    }

    // Search journal entries
    if (filters.type === 'all' || filters.type === 'journal') {
      for (const item of searchIndex.journal) {
        const matches = await matchesFilters(item, filters); 
        if (matches) {
          const score = calculateRelevanceScore(item.content, searchTerm);
          if (score > 0) {
            results.push({ ...item, score, query: searchTerm });
          }
        }
      }
    }

    // Search reflections
    if (filters.type === 'all' || filters.type === 'reflections') {
      for (const item of searchIndex.reflections) {
        const matches = await matchesFilters(item, filters);  
        if (matches) {
          const score = calculateRelevanceScore(item.content, searchTerm);
          if (score > 0) {
            results.push({ ...item, score, query: searchTerm });
          }
        }
      }
    }

    // Sort by relevance score (highest first)
    results.sort((a, b) => b.score - a.score);

    searchResults = results;
    return results;
  }

  /**
   * Calculate relevance score for search matching
   */
  function calculateRelevanceScore(content, searchTerm) {
    let score = 0;
    const words = searchTerm.split(/\s+/);

    for (const word of words) {
      // Exact match
      if (content.includes(word)) {
        score += 10;
        
        // Bonus for word boundary match
        const wordBoundary = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
        if (wordBoundary.test(content)) {
          score += 5;
        }
      }
      
      // Fuzzy match (allow 1-2 character difference)
      else if (word.length >= 4) {
        const fuzzyMatch = fuzzySearch(content, word);
        if (fuzzyMatch) {
          score += 3;
        }
      }
    }

    // Bonus for multiple word matches
    if (words.length > 1) {
      const allWordsPresent = words.every(word => content.includes(word));
      if (allWordsPresent) {
        score += 15;
      }
    }

    return score;
  }

  /**
   * Simple fuzzy matching (allows 1-2 character difference)
   */
  function fuzzySearch(text, pattern) {
    const maxDistance = pattern.length <= 5 ? 1 : 2;
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (levenshteinDistance(word, pattern) <= maxDistance) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if item matches current filters
   * This function is async and must be awaited
   */
  async function matchesFilters(item, filters) {
    // Season filter
    if (filters.season !== 'all' && item.season !== filters.season) {
      return false;
    }

    // Day-based filters (only for devotions/journal)
    if (item.day) {
      if (filters.hasJournal) {
        const journal = await Store.getJournalEntry(item.day);
        if (!journal || !journal.content) return false;
      }

      if (filters.hasAudio) {
        const hasAudio = await Store.hasAudioNote(item.day);
        if (!hasAudio) return false;
      }

      if (filters.isFavorite) {
        const isFav = await Store.isFavorite(item.day);
        if (!isFav) return false;
      }

      if (filters.isComplete) {
        const progress = await Store.getDayProgress(item.day);
        if (!progress || !progress.completed) return false;
      }
    }

    return true;
  }

  /**
   * Escape special regex characters
   */
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Highlight search terms in text
   */
  function highlightMatches(text, query) {
    if (!query) return escapeHtml(text);
    
    const words = query.toLowerCase().split(/\s+/);
    let highlighted = escapeHtml(text);
    
    for (const word of words) {
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
    
    return highlighted;
  }

  /**
   * Get excerpt from content with search term
   */
  function getExcerpt(content, query, maxLength = 150) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);
    
    // Find first occurrence of any search word
    let index = -1;
    for (const word of words) {
      const pos = lowerContent.indexOf(word);
      if (pos !== -1 && (index === -1 || pos < index)) {
        index = pos;
      }
    }
    
    if (index === -1) {
      // No match found, return start of content
      return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    // Get excerpt around the match
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + maxLength);
    
    let excerpt = content.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';
    
    return excerpt;
  }

  /**
   * Escape HTML for safe display
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Update filters
   */
  function setFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
  }

  /**
   * Get current filters
   */
  function getFilters() {
    return { ...currentFilters };
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    currentFilters = {
      type: 'all',
      season: 'all',
      hasJournal: false,
      hasAudio: false,
      isFavorite: false,
      isComplete: false
    };
  }

  /**
   * Render search interface
   */
  async function renderSearchInterface(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    Utils.clearElement(container);

    const pageHeader = Utils.createElement('div', { className: 'page-header' },
      Utils.createElement('h1', { className: 'page-title' }, 'Search'),
      Utils.createElement('p', { className: 'page-subtitle' }, 'Find devotions, journal entries, and reflections')
    );

    const searchContainer = document.createElement('div');
    searchContainer.className = 'page-content';
    searchContainer.innerHTML = `
      <div class="search-bar" style="margin-bottom: var(--space-4);">
        <input 
          type="text" 
          class="search-input" 
          id="search-query" 
          placeholder="Search for scripture, topics, or keywords..."
          autocomplete="off">
      </div>

      <div class="search-filters" style="margin-bottom: var(--space-4);">
        <div class="select-wrapper">
          <select class="select" id="filter-type">
            <option value="all">All Types</option>
            <option value="devotions">Devotions</option>
            <option value="journal">Journal</option>
            <option value="reflections">Reflections</option>
          </select>
        </div>
        <div class="select-wrapper">
          <select class="select" id="filter-season">
            <option value="all">All Seasons</option>
            <option value="winter">Winter</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="autumn">Autumn</option>
          </select>
        </div>
      </div>

      <div class="search-quick-filters" style="margin-bottom: var(--space-6); display: flex; gap: var(--space-2); flex-wrap: wrap;">
        <button class="btn btn-sm btn-ghost" id="filter-journal">
          ${Utils.getIcon('book', 16)} Has Journal
        </button>
        <button class="btn btn-sm btn-ghost" id="filter-audio">
          ${Utils.getIcon('mic', 16)} Has Audio
        </button>
        <button class="btn btn-sm btn-ghost" id="filter-favorite">
          ${Utils.getIcon('heart', 16)} Favorites
        </button>
        <button class="btn btn-sm btn-ghost" id="filter-complete">
          ${Utils.getIcon('check', 16)} Completed
        </button>
      </div>

      <div id="search-results"></div>
    `;

    container.appendChild(pageHeader);
    container.appendChild(searchContainer);

    attachSearchListeners(container);
  }

  /**
   * Attach event listeners for search interface
   */
  function attachSearchListeners(container) {
    const searchInput = container.querySelector('#search-query');
    const filterType = container.querySelector('#filter-type');
    const filterSeason = container.querySelector('#filter-season');
    const resultsContainer = container.querySelector('#search-results');

    let debounceTimer;

    // Search input handler
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const query = e.target.value;
        if (query.length >= 2) {
          const results = await performSearch(query);
          renderSearchResults(resultsContainer, results);
        } else {
          resultsContainer.innerHTML = '';
        }
      }, 300);
    });

    // Type filter
    filterType?.addEventListener('change', (e) => {
      setFilters({ type: e.target.value });
      if (searchInput.value.length >= 2) {
        performSearch(searchInput.value).then(results => {
          renderSearchResults(resultsContainer, results);
        });
      }
    });

    // Season filter
    filterSeason?.addEventListener('change', (e) => {
      setFilters({ season: e.target.value });
      if (searchInput.value.length >= 2) {
        performSearch(searchInput.value).then(results => {
          renderSearchResults(resultsContainer, results);
        });
      }
    });

    // Quick filters
    const setupQuickFilter = (id, filterKey) => {
      const btn = container.querySelector(`#${id}`);
      btn?.addEventListener('click', () => {
        currentFilters[filterKey] = !currentFilters[filterKey];
        btn.classList.toggle('active', currentFilters[filterKey]);
        if (searchInput.value.length >= 2) {
          performSearch(searchInput.value).then(results => {
            renderSearchResults(resultsContainer, results);
          });
        }
      });
    };

    setupQuickFilter('filter-journal', 'hasJournal');
    setupQuickFilter('filter-audio', 'hasAudio');
    setupQuickFilter('filter-favorite', 'isFavorite');
    setupQuickFilter('filter-complete', 'isComplete');
  }

  /**
   * Render search results
   */
  function renderSearchResults(container, results) {
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Utils.getIcon('search', 64)}</div>
          <h3 class="empty-state-title">No Results Found</h3>
          <p class="empty-state-description">Try different keywords or adjust your filters</p>
        </div>
      `;
      return;
    }

    const resultsList = document.createElement('div');
    resultsList.className = 'card-list';

    results.forEach(result => {
      const card = document.createElement('div');
      card.className = 'card card-interactive';
      
      const excerpt = getExcerpt(result.content, result.query);
      const highlighted = highlightMatches(excerpt, result.query);

      if (result.type === 'devotion') {
        card.innerHTML = `
          <div class="card-header">
            <span class="season-badge" style="font-size: var(--text-xs);">
              ${result.seasonTitle.split(' — ')[0]} • Day ${result.day}
            </span>
            <span class="badge">Devotion</span>
          </div>
          <h3 class="card-title">${Utils.escapeHtml(result.scriptureRef)}</h3>
          <p class="card-description">${highlighted}</p>
          <button class="btn btn-ghost btn-sm" data-route="devotional" data-day="${result.day}">
            View Devotional
            ${Utils.getIcon('arrowRight', 16)}
          </button>
        `;
      } else if (result.type === 'journal') {
        card.innerHTML = `
          <div class="card-header">
            <span class="season-badge" style="font-size: var(--text-xs);">
              Day ${result.day}
            </span>
            <span class="badge">Journal</span>
          </div>
          <h3 class="card-title">${Utils.escapeHtml(result.scriptureRef || 'Journal Entry')}</h3>
          <p class="card-description">${highlighted}</p>
          <button class="btn btn-ghost btn-sm" data-route="devotional" data-day="${result.day}">
            View Entry
            ${Utils.getIcon('arrowRight', 16)}
          </button>
        `;
      } else if (result.type === 'reflection') {
        card.innerHTML = `
          <div class="card-header">
            <span class="badge">Reflection</span>
          </div>
          <h3 class="card-title">${Utils.escapeHtml(result.title)}</h3>
          <p class="card-description">${highlighted}</p>
          <button class="btn btn-ghost btn-sm" data-route="reflections">
            View Reflection
            ${Utils.getIcon('arrowRight', 16)}
          </button>
        `;
      }

      resultsList.appendChild(card);
    });

    container.innerHTML = `
      <div style="margin-bottom: var(--space-4); color: var(--text-secondary);">
        Found ${results.length} ${results.length === 1 ? 'result' : 'results'}
      </div>
    `;
    container.appendChild(resultsList);
  }

  return {
    init,
    performSearch,
    setFilters,
    getFilters,
    clearFilters,
    renderSearchInterface,
    highlightMatches,
    getExcerpt,
    rebuildIndex: buildSearchIndex  // Expose for manual rebuilds
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Search;
}
