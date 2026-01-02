/**
 * Intro Pages Module 
 * Displays front matter content with proper routing and dedicated pages
 */

const IntroPages = (() => {
  let bookData = null;

  /**
   * Normalize page names for consistent routing
   */
  function normalizePageName(title) {
    const normalizeMap = {
      'how to use this devotional': 'how-to-use',
      'acknowledgements': 'acknowledgements',
      'about the author': 'author',
      'introduction': 'introduction',
      'winter – a season of stillness & trust (days 1-30)': 'winter',
      'spring – a season of renewal & planting (days 31-60)': 'spring',
      'summer – a season of abundance & joy (days 61-90)': 'summer',
      'fall – a season of harvest & letting go (days 91-120)': 'autumn'
    };
    
    const lowerTitle = title.toLowerCase();
    return normalizeMap[lowerTitle] || lowerTitle.replace(/\s+/g, '-');
  }

  async function init() {
    try {
      // Load book data which contains all content including intro pages
      const bookResponse = await fetch('content/book.json');
      if (!bookResponse.ok) {
        throw new Error(`Failed to load book data: ${bookResponse.status}`);
      }
      bookData = await bookResponse.json();

      return true;
    } catch (error) {
      console.error('Failed to load book data:', error);
      return false;
    }
  }

  function renderTableOfContents(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) {
      console.error('Container not found or data not loaded');
      return;
    }

    const tocHtml = `
      <div class="intro-page intro-toc-page">
        <div class="intro-book-cover" style="cursor: pointer;" id="book-cover-click">
          <img src="assets/images/book-cover.webp" alt="Spiritual Seasons Book Cover" class="book-cover-image" onerror="this.style.display='none'">
        </div>
        
        <div class="intro-header" style="cursor: pointer;" id="intro-header-click">
          <h1 class="intro-title">${Utils.escapeHtml(bookData.title)}</h1>
          <h2 class="intro-subtitle">${Utils.escapeHtml(bookData.subtitle)}</h2>
          <p class="intro-author">by ${Utils.escapeHtml(bookData.author)}</p>
        </div>
      </div>
    `;

    container.innerHTML = tocHtml;
    
    // Make book cover and header clickable to continue to quiz
    const bookCover = document.getElementById('book-cover-click');
    const introHeader = document.getElementById('intro-header-click');
    
    if (bookCover) {
      bookCover.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('quiz');
      });
    }
    
    if (introHeader) {
      introHeader.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('quiz');
      });
    }
  }

  function renderHowToUse(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) return;

    const frontMatter = bookData.frontMatter || {};
    const howToUse = frontMatter.howToUse || { steps: [] };
    const introduction = frontMatter.introduction || { text: '', scripture: { reference: '', text: '' } };

    container.innerHTML = `
      <div class="intro-page">
        <button class="btn-back" data-route="contents">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Contents
        </button>

        <h2 class="intro-heading">How to Use This Devotional</h2>
        
        <div class="intro-content">
          <div class="scripture-callout">
            <cite class="scripture-reference">${Utils.escapeHtml(introduction.scripture.reference || '')}</cite>
            <p class="scripture-text">"${Utils.escapeHtml(introduction.scripture.text || introduction.text || '')}"</p>
          </div>
          
          <p class="intro-lead">This devotional is designed to guide you through 120 days of spiritual growth, organized into four seasons. Each season offers unique insights and opportunities for reflection.</p>
          
          <h3>Steps to Get Started:</h3>
          <ol class="intro-list">
            ${howToUse.steps.map(step => `<li>${Utils.escapeHtml(step)}</li>`).join('')}
          </ol>
          
          <div class="how-to-tips">
            <h3>Daily Practice Tips:</h3>
            <ul class="intro-list">
              <li>Set aside a consistent time each day for your devotional</li>
              <li>Find a quiet, comfortable space free from distractions</li>
              <li>Read the scripture slowly and prayerfully</li>
              <li>Reflect on how the prompt applies to your life</li>
              <li>Write freely in your journal - there are no wrong answers</li>
              <li>Use the audio features to listen and meditate</li>
            </ul>
          </div>
          
          <div class="season-overview-item">
            <strong>Remember:</strong> Growth happens in every season. Whether you're in a time of stillness, renewal, abundance, or harvest, God is working in your life. Trust the process and embrace where you are.
          </div>
        </div>
        
        <div class="intro-navigation">
          <button class="btn btn-secondary" data-route="contents">
            ← Back to Contents
          </button>
          <button class="btn btn-primary" data-route="quiz">
            Take the Season Quiz →
          </button>
        </div>
      </div>
    `;

    // Attach navigation listeners
    container.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        if (route) {
          Router.navigate(route);
        }
      });
    });
  }

  function renderAcknowledgements(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) return;

    container.innerHTML = `
      <div class="intro-page">
        <button class="btn-back" data-route="contents">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Contents
        </button>

        <h2 class="intro-heading">Acknowledgements</h2>
        <div class="intro-content">
          ${bookData.acknowledgements.split('\n\n').map(p => `<p>${Utils.escapeHtml(p)}</p>`).join('')}
        </div>
        
        <div class="intro-navigation">
          <button class="btn btn-secondary" data-route="intro" data-page="author">
            Next: About the Author →
          </button>
        </div>
      </div>
    `;

    attachNavigationListeners(container);
  }

  function renderAboutAuthor(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) return;

    container.innerHTML = `
      <div class="intro-page">
        <button class="btn-back" data-route="contents">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Contents
        </button>

        <h2 class="intro-heading">About the Author</h2>
        <div class="intro-content">
          ${bookData.aboutAuthor.split('\n\n').map(p => `<p>${Utils.escapeHtml(p)}</p>`).join('')}
        </div>
        
        <div class="intro-navigation">
          <button class="btn btn-secondary" data-route="intro" data-page="acknowledgements">
            ← Previous: Acknowledgements
          </button>
          <button class="btn btn-secondary" data-route="intro" data-page="introduction">
            Next: Introduction →
          </button>
        </div>
      </div>
    `;

    attachNavigationListeners(container);
  }

  function renderIntroduction(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) return;

    const intro = bookData.frontMatter.introduction;
    
    container.innerHTML = `
      <div class="intro-page">
        <button class="btn-back" data-route="contents">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Contents
        </button>

        <h2 class="intro-heading">Introduction</h2>
        
        <div class="intro-content">
          <p class="intro-lead">${Utils.escapeHtml(intro.text)}</p>
          
          <div class="scripture-callout">
            <cite class="scripture-reference">${Utils.escapeHtml(intro.scripture.reference)}</cite>
            <p class="scripture-text">"${Utils.escapeHtml(intro.scripture.text)}"</p>
          </div>
          
          <p>${Utils.escapeHtml(intro.purpose)}</p>
          
          <h3>${Utils.escapeHtml(intro.structure.intro)}</h3>
          
          <div class="seasons-overview">
            ${intro.structure.seasons.map(season => `
              <div class="season-overview-item">
                <strong>${Utils.escapeHtml(season.title)}:</strong> ${Utils.escapeHtml(season.description)}
              </div>
            `).join('')}
          </div>
          
          <h3>${Utils.escapeHtml(intro.dailyFormat.intro)}</h3>
          <ul class="intro-list">
            ${intro.dailyFormat.elements.map(el => `<li>${Utils.escapeHtml(el)}</li>`).join('')}
          </ul>
          
          ${intro.closing.split('\n\n').map(p => `<p>${Utils.escapeHtml(p)}</p>`).join('')}
        </div>
        
        <div class="intro-navigation">
          <button class="btn btn-secondary" data-route="intro" data-page="author">
            ← Previous: About the Author
          </button>
          <button class="btn btn-primary btn-lg" data-route="quiz">
            Start Your Journey →
          </button>
        </div>
      </div>
    `;

    attachNavigationListeners(container);
  }

  function renderSeasonOverview(containerId, seasonId) {
    const container = document.getElementById(containerId);
    if (!container || !bookData) return;

    const season = bookData.seasonalOverviews[seasonId];
    if (!season) {
      console.error('Season not found:', seasonId);
      renderError(container, `Season "${seasonId}" not found`);
      return;
    }
    
    // Update the season theme when viewing a season overview
    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.setSeason(seasonId);
    } else {
      document.documentElement.setAttribute('data-season', seasonId);
    }
    
    // Also save the current season to store
    Store.setCurrentSeason(seasonId).catch(err => {
      console.error('Failed to save current season:', err);
    });
    
    container.innerHTML = `
      <div class="season-overview-page" data-season="${seasonId}">
        <button class="btn-back" data-route="contents">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Contents
        </button>

        <div class="season-overview-header">
          <h1 class="season-title">${Utils.escapeHtml(season.title)}</h1>
          <p class="season-intro">${Utils.escapeHtml(season.introduction)}</p>
        </div>
        
        <section class="characteristics-section">
          <h2>${Utils.escapeHtml(season.characteristics.title)}</h2>
          <div class="characteristics-grid">
            ${season.characteristics.items.map(item => `
              <div class="characteristic-card">
                <h3>${Utils.escapeHtml(item.name)}</h3>
                <p>${Utils.escapeHtml(item.description)}</p>
              </div>
            `).join('')}
          </div>
        </section>
        
        <section class="practices-section">
          <h2>${Utils.escapeHtml(season.practices.title)}</h2>
          <div class="practices-grid">
            ${season.practices.items.map(item => `
              <div class="practice-card">
                <h3>${Utils.escapeHtml(item.practice)}</h3>
                <p>${Utils.escapeHtml(item.description)}</p>
              </div>
            `).join('')}
          </div>
        </section>
        
        <section class="scripture-section">
          <h2>${Utils.escapeHtml(season.scripturalInspiration.title)}</h2>
          <div class="scripture-verses">
            ${season.scripturalInspiration.verses.map(verse => `
              <div class="scripture-card">
                <cite>${Utils.escapeHtml(verse.reference)}</cite>
                <p>"${Utils.escapeHtml(verse.text)}"</p>
              </div>
            `).join('')}
          </div>
        </section>
        
        <div class="season-closing">
          <p>${Utils.escapeHtml(season.closing)}</p>
        </div>
        
        <div class="season-actions">
          <button class="btn btn-primary btn-lg" data-route="devotional" data-day="${getSeasonStartDay(seasonId)}">
            Begin ${season.title.split('–')[0].trim()} Devotions
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    attachNavigationListeners(container);
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          ${Utils.getIcon('warning', 80)}
        </div>
        <h3 class="empty-state-title">Page Not Found</h3>
        <p class="empty-state-description">${Utils.escapeHtml(message)}</p>
        <button class="btn btn-primary" data-route="intro">
          Back to Contents
        </button>
      </div>
    `;

    attachNavigationListeners(container);
  }

  function getSeasonStartDay(seasonId) {
    const startDays = {
      winter: 1,
      spring: 31,
      summer: 61,
      autumn: 91,
      fall: 91
    };
    return startDays[seasonId] || 1;
  }

  /**
   * Attach navigation listeners to buttons with data-route attributes
   */
  function attachNavigationListeners(container) {
    if (!container) return;
    
    container.querySelectorAll('[data-route]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const route = btn.getAttribute('data-route');
        const page = btn.getAttribute('data-page');
        const day = btn.getAttribute('data-day');
        
        if (route) {
          const params = {};
          if (page) params.page = page;
          if (day) params.day = parseInt(day, 10);
          
          Router.navigate(route, params);
        }
      });
    });
  }

  function render(containerId, page = 'toc') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return;
    }

    if (!bookData) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            ${Utils.getIcon('warning', 80)}
          </div>
          <h3 class="empty-state-title">Loading Error</h3>
          <p class="empty-state-description">Failed to load book data. Please refresh the page.</p>
        </div>
      `;
      return;
    }

    // Normalize the page parameter
    const normalizedPage = page.toLowerCase().replace(/\s+/g, '-');

    // Clear container first to prevent duplicate content
    Utils.clearElement(container);

    switch(normalizedPage) {
      case 'toc':
      case 'contents':
      case '':
        renderTableOfContents(containerId);
        break;
      case 'how-to-use':
      case 'how-to-use-this-devotional':
        renderHowToUse(containerId);
        break;
      case 'acknowledgements':
        renderAcknowledgements(containerId);
        break;
      case 'about-the-author':
      case 'author':
        renderAboutAuthor(containerId);
        break;
      case 'introduction':
        renderIntroduction(containerId);
        break;
      case 'winter':
      case 'winter-–-a-season-of-stillness-&-trust-(days-1-30)':
        renderSeasonOverview(containerId, 'winter');
        break;
      case 'spring':
      case 'spring-–-a-season-of-renewal-&-planting-(days-31-60)':
        renderSeasonOverview(containerId, 'spring');
        break;
      case 'summer':
      case 'summer-–-a-season-of-abundance-&-joy-(days-61-90)':
        renderSeasonOverview(containerId, 'summer');
        break;
      case 'fall':
      case 'autumn':
      case 'fall-–-a-season-of-harvest-&-letting-go-(days-91-120)':
        renderSeasonOverview(containerId, 'autumn');
        break;
      default:
        console.warn('Unknown page:', page);
        renderError(container, `Page "${page}" not found`);
    }
  }

  return {
    init,
    render,
    renderTableOfContents,
    renderHowToUse,
    renderAcknowledgements,
    renderAboutAuthor,
    renderIntroduction,
    renderSeasonOverview
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntroPages;
}
