/**
 * Spiritual Seasons PWA - Table of Contents Module
 * Handles navigation through seasons and days
 */

const TOC = (() => {
  let expandedSections = new Set();

  /**
   * Toggle section expansion
   */
  function toggleSection(seasonId) {
    if (expandedSections.has(seasonId)) {
      expandedSections.delete(seasonId);
    } else {
      expandedSections.add(seasonId);
    }
  }

  /**
   * Check if section is expanded
   */
  function isExpanded(seasonId) {
    return expandedSections.has(seasonId);
  }

  /**
   * Expand all sections
   */
  function expandAll() {
    const seasons = Devotional.getSeasons();
    seasons.forEach(s => expandedSections.add(s.id));
  }

  /**
   * Collapse all sections
   */
  function collapseAll() {
    expandedSections.clear();
  }

  /**
   * Render table of contents
   */
  async function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const seasons = Devotional.getSeasons();
    const completedDays = await Store.getCompletedDays();
    const currentDay = await Store.getCurrentDay();
    const currentSeason = await Store.getCurrentSeason();

    // Get completion counts per season
    const seasonProgress = {};
    for (const season of seasons) {
      const completed = completedDays.filter(d => {
        const s = Devotional.getSeasonForDay(d);
        return s && s.id === season.id;
      });
      seasonProgress[season.id] = completed.length;
    }

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Table of Contents</h1>
        <p class="page-subtitle">Navigate your devotional journey</p>
      </div>

      <div class="page-content">
        <!-- Front Matter Section -->
        <div class="toc-section">
          <div class="toc-section-header" data-section="front-matter">
            <div>
              <span class="toc-section-title">Introduction</span>
            </div>
            <svg class="toc-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div class="toc-days-list" style="display: ${expandedSections.has('front-matter') ? 'block' : 'none'};">
            <div style="padding: var(--space-2);">
              <button class="btn btn-ghost btn-block" style="justify-content: flex-start; text-align: left;" data-route="intro" data-page="acknowledgements">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Acknowledgements
              </button>
              <button class="btn btn-ghost btn-block" style="justify-content: flex-start; text-align: left; margin-top: var(--space-2);" data-route="intro" data-page="author">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                About the Author
              </button>
              <button class="btn btn-ghost btn-block" style="justify-content: flex-start; text-align: left; margin-top: var(--space-2);" data-route="intro" data-page="introduction">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Introduction
              </button>
              <button class="btn btn-ghost btn-block" style="justify-content: flex-start; text-align: left; margin-top: var(--space-2);" data-route="intro" data-page="how-to-use">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                How to Use This Devotional
              </button>
            </div>
          </div>
        </div>

        <!-- Season Sections -->
        ${(await Promise.all(seasons.map(async season => {
          const isOpen = expandedSections.has(season.id);
          const completed = seasonProgress[season.id];
          const days = Devotional.getDaysInSeason(season.id);
          
          // Pre-fetch all async data for this season's days
          const dayData = await Promise.all(days.map(async day => {
            const isCompleted = completedDays.includes(day.day);
            const isCurrent = day.day === currentDay;
            const hasJournal = await Store.getJournalEntry(day.day);
            const hasAudio = await Store.hasAudioNote(day.day);
            const isFavorite = await Store.isFavorite(day.day);
            
            return {
              day,
              isCompleted,
              isCurrent,
              hasJournal,
              hasAudio,
              isFavorite
            };
          }));
          
          return `
            <div class="toc-section ${isOpen ? 'expanded' : ''}">
              <div class="toc-section-header" data-season="${season.id}" data-section="${season.id}">
                <div>
                  <span class="toc-section-title">${season.title}</span>
                  <span class="toc-section-progress">${completed}/30 complete</span>
                </div>
                <div style="display: flex; align-items: center; gap: var(--space-2);">
                  <button class="btn btn-ghost btn-sm season-info-btn" 
                          data-route="intro" 
                          data-page="${season.id}"
                          style="padding: var(--space-1) var(--space-2); min-height: auto;"
                          title="View ${season.title.split(' — ')[0]} overview">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                  </button>
                  <svg class="toc-section-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>
              <div class="toc-days-list" style="display: ${isOpen ? 'block' : 'none'};">
                <div class="toc-days-grid">
                  ${dayData.map(({ day, isCompleted, isCurrent, hasJournal, hasAudio, isFavorite }) => `
                    <button class="toc-day-btn ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}" 
                            data-route="devotional" 
                            data-day="${day.day}"
                            title="${day.scriptureRef}">
                      <span class="day-number">${day.day}</span>
                      <div class="day-indicators">
                        ${isCompleted ? `<span class="indicator check" title="Completed">✓</span>` : ''}
                        ${hasJournal && hasJournal.content ? `<span class="indicator journal" title="Has journal entry">📝</span>` : ''}
                        ${hasAudio ? `<span class="indicator audio" title="Has audio note">🎤</span>` : ''}
                        ${isFavorite ? `<span class="indicator favorite" title="Favorite">❤️</span>` : ''}
                      </div>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }))).join('')}

        <!-- Progress Summary -->
        <div class="card" style="margin-top: var(--space-6);">
          <div class="card-header">
            <span class="card-title">Your Progress</span>
            <span style="font-size: var(--text-sm); color: var(--text-secondary);">
              ${completedDays.length}/120 days
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(completedDays.length / 120) * 100}%"></div>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    attachListeners(container);
  }

  /**
   * Attach event listeners
   */
  function attachListeners(container) {
    // Season info buttons - handle before header clicks to prevent propagation
    container.querySelectorAll('.season-info-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header toggle
        const route = btn.getAttribute('data-route');
        const page = btn.getAttribute('data-page');
        if (route && page) {
          Router.navigate(route, { page });
        }
      });
    });

    // Section toggle
    container.querySelectorAll('.toc-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.getAttribute('data-section');
        toggleSection(section);
        
        // Update UI
        const parent = header.closest('.toc-section');
        const daysList = parent.querySelector('.toc-days-list');
        const isNowExpanded = isExpanded(section);
        
        parent.classList.toggle('expanded', isNowExpanded);
        daysList.style.display = isNowExpanded ? 'block' : 'none';
      });
    });
  }

  /**
   * Render season overview
   */
  async function renderSeasonOverview(containerId, seasonId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const season = Devotional.getSeason(seasonId);
    if (!season) return;

    const completedDays = await Store.getCompletedDays();
    const seasonDays = Devotional.getDaysInSeason(seasonId);
    const completedInSeason = completedDays.filter(d => {
      const s = Devotional.getSeasonForDay(d);
      return s && s.id === seasonId;
    });

    container.innerHTML = `
      <div class="season-bg" style="min-height: 100vh;">
        <div class="page-header">
          <div class="season-badge">${season.title.split(' — ')[0]}</div>
          <h1 class="page-title" style="font-size: var(--text-2xl);">${season.title}</h1>
        </div>

        <div class="page-content">
          <div class="scripture-box" style="margin-bottom: var(--space-6);">
            <p class="scripture-text">${season.overview.description}</p>
          </div>

          <div class="card" style="margin-bottom: var(--space-6);">
            <h3 class="card-title" style="margin-bottom: var(--space-4);">Season Characteristics</h3>
            <ul style="color: var(--text-secondary);">
              ${season.overview.characteristics.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>

          <div class="card" style="margin-bottom: var(--space-6);">
            <h3 class="card-title" style="margin-bottom: var(--space-4);">Spiritual Practices</h3>
            <ul style="color: var(--text-secondary);">
              ${season.overview.practices.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Season Progress</span>
              <span style="font-size: var(--text-sm); color: var(--text-secondary);">
                ${completedInSeason.length}/30 days
              </span>
            </div>
            <div class="progress-bar" style="margin-bottom: var(--space-4);">
              <div class="progress-bar-fill" style="width: ${(completedInSeason.length / 30) * 100}%"></div>
            </div>
            
            <div class="toc-days-grid">
              ${seasonDays.map(day => {
                const isCompleted = completedDays.includes(day.day);
                return `
                  <button class="toc-day-btn ${isCompleted ? 'completed' : ''}" 
                          data-route="devotional" 
                          data-day="${day.day}">
                    ${day.day}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Public API
  return {
    render,
    renderSeasonOverview,
    toggleSection,
    isExpanded,
    expandAll,
    collapseAll
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TOC;
}
