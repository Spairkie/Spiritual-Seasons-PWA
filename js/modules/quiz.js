/**
 * Spiritual Seasons PWA - Quiz Module
 * Handles the spiritual season identification quiz
 */

const Quiz = (() => {
  let quizData = null;
  let currentQuestionIndex = 0;
  let answers = {};
  let flatQuestions = [];

  /**
   * Initialize the quiz with data
   */
  function init(data) {
    quizData = data;
    flattenQuestions();
  }

  /**
   * Flatten questions into a single array with season info
   */
  function flattenQuestions() {
    flatQuestions = [];
    quizData.seasons.forEach(season => {
      season.questions.forEach((question, index) => {
        flatQuestions.push({
          id: `${season.id}-${index}`,
          seasonId: season.id,
          text: question
        });
      });
    });
  }

  /**
   * Reset the quiz
   */
  function reset() {
    currentQuestionIndex = 0;
    answers = {};
  }

  /**
   * Get current question
   */
  function getCurrentQuestion() {
    return flatQuestions[currentQuestionIndex];
  }

  /**
   * Get total questions count
   */
  function getTotalQuestions() {
    return flatQuestions.length;
  }

  /**
   * Get current progress percentage
   */
  function getProgress() {
    return ((currentQuestionIndex + 1) / flatQuestions.length) * 100;
  }

  /**
   * Answer current question
   */
  function answerQuestion(value) {
    const question = getCurrentQuestion();
    if (question) {
      answers[question.id] = {
        seasonId: question.seasonId,
        value: value
      };
    }
  }

  /**
   * Check if current question is answered
   */
  function isCurrentAnswered() {
    const question = getCurrentQuestion();
    return question && answers[question.id] !== undefined;
  }

  /**
   * Get current answer
   */
  function getCurrentAnswer() {
    const question = getCurrentQuestion();
    return question ? answers[question.id]?.value : null;
  }

  /**
   * Navigate to next question
   */
  function next() {
    if (currentQuestionIndex < flatQuestions.length - 1) {
      currentQuestionIndex++;
      return true;
    }
    return false;
  }

  /**
   * Navigate to previous question
   */
  function previous() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      return true;
    }
    return false;
  }

  /**
   * Check if quiz is complete
   */
  function isComplete() {
    return currentQuestionIndex === flatQuestions.length - 1 && isCurrentAnswered();
  }

  /**
   * Check if on first question
   */
  function isFirst() {
    return currentQuestionIndex === 0;
  }

  /**
   * Check if on last question
   */
  function isLast() {
    return currentQuestionIndex === flatQuestions.length - 1;
  }

  /**
   * Calculate results
   */
  function calculateResults() {
    const scores = {
      winter: 0,
      spring: 0,
      summer: 0,
      autumn: 0
    };

    // Sum scores by season
    Object.values(answers).forEach(answer => {
      scores[answer.seasonId] += answer.value;
    });

    // Find winning season
    let maxScore = 0;
    let winningSeason = 'winter';
    const ties = [];

    Object.entries(scores).forEach(([season, score]) => {
      if (score > maxScore) {
        maxScore = score;
        winningSeason = season;
        ties.length = 0;
        ties.push(season);
      } else if (score === maxScore) {
        ties.push(season);
      }
    });

    // Get result message
    const resultData = quizData.results[winningSeason];
    const seasonInfo = quizData.seasons.find(s => s.id === winningSeason);

    return {
      scores,
      winningSeason,
      hasTie: ties.length > 1,
      ties,
      maxScore,
      result: resultData,
      seasonInfo: seasonInfo || { id: winningSeason, title: winningSeason, emoji: '🌟' }
    };
  }

  /**
   * Get scale labels
   */
  function getScaleLabels() {
    return quizData.scale.labels;
  }

  /**
   * Get scale range
   */
  function getScaleRange() {
    return {
      min: quizData.scale.min,
      max: quizData.scale.max
    };
  }

  /**
   * Render the quiz UI
   */
  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const question = getCurrentQuestion();
    const scaleLabels = getScaleLabels();
    const progress = getProgress();
    const currentAnswer = getCurrentAnswer();

    container.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-progress">
          <div class="quiz-progress-bar">
            <div class="quiz-progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="quiz-progress-text">
            <span>Question ${currentQuestionIndex + 1} of ${getTotalQuestions()}</span>
            <span>${Math.round(progress)}% complete</span>
          </div>
        </div>

        <div class="quiz-question">
          <p class="quiz-question-text">"${question.text}"</p>
          
          <div class="quiz-options">
            ${Object.entries(scaleLabels).map(([value, label]) => `
              <div class="quiz-option ${currentAnswer === parseInt(value) ? 'selected' : ''}" 
                   data-value="${value}">
                <div class="quiz-option-radio"></div>
                <span class="quiz-option-label">${label}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="quiz-navigation">
          <button class="btn btn-secondary" id="quiz-prev" ${isFirst() ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Previous
          </button>
          
          ${isLast() ? `
            <button class="btn btn-primary" id="quiz-submit" ${!isCurrentAnswered() ? 'disabled' : ''}>
              See Results
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          ` : `
            <button class="btn btn-primary" id="quiz-next" ${!isCurrentAnswered() ? 'disabled' : ''}>
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          `}
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
    // Option selection
    container.querySelectorAll('.quiz-option').forEach(option => {
      option.addEventListener('click', () => {
        const value = parseInt(option.getAttribute('data-value'));
        answerQuestion(value);
        render(container.id);
      });
    });

    // Previous button
    const prevBtn = container.querySelector('#quiz-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        previous();
        render(container.id);
      });
    }

    // Next button
    const nextBtn = container.querySelector('#quiz-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (next()) {
          render(container.id);
        }
      });
    }

    // Submit button
    const submitBtn = container.querySelector('#quiz-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const results = calculateResults();
        await renderResults(container.id, results);
      });
    }
  }

  /**
   * Render quiz results
   */
  async function renderResults(containerId, results) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check for ties - CRITICAL FIX
    if (results.hasTie && results.ties.length > 1) {
      renderTieScreen(containerId, results);
      return;
    }

    // Continue with normal results
    await saveResultsAndSetSeason(results);
    displayFinalResults(containerId, results);
  }

  /**
   * Save results and set season
   */
  async function saveResultsAndSetSeason(results) {
    await Store.saveQuizResults({
      scores: results.scores,
      winningSeason: results.winningSeason,
      tieResolution: results.tieResolution || 'no_tie',
      answers: answers
    });

    // Set season in store
    await Store.setCurrentSeason(results.winningSeason);
    
    // Set starting day based on season
    const seasonStartDays = {
      winter: 1,
      spring: 31,
      summer: 61,
      autumn: 91
    };
    
    const startDay = seasonStartDays[results.winningSeason] || 1;
    await Store.setCurrentDay(startDay);
    
    Utils.debug.log(`[Quiz] Set season to ${results.winningSeason}, starting at day ${startDay}`);
    
    // Update theme
    if (typeof ThemeManager !== 'undefined') {
      ThemeManager.setSeason(results.winningSeason);
    } else {
      document.documentElement.setAttribute('data-season', results.winningSeason);
    }
  }

  /**
   * Render tie screen when multiple seasons have equal scores
   */
  function renderTieScreen(containerId, results) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const seasonNames = {
      winter: 'Winter — Stillness & Trust',
      spring: 'Spring — Renewal & Planting',
      summer: 'Summer — Abundance & Joy',
      autumn: 'Autumn — Harvest & Letting Go'
    };

    const seasonDescriptions = {
      winter: 'A time of quiet reflection, rest, and deep spiritual grounding.',
      spring: 'A season of new beginnings, fresh hope, and spiritual renewal.',
      summer: 'A time of abundance, productivity, and visible spiritual growth.',
      autumn: 'A season of harvest, reflection, and graceful release.'
    };

    container.innerHTML = `
      <div class="quiz-tie-screen">
        <div class="tie-icon">
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M24 4v40M4 24h40M12 12l24 24M12 36l24-24"/>
          </svg>
        </div>
        
        <h2 class="tie-title">You're Between Seasons</h2>
        
        <p class="tie-message">
          Your responses indicate you're experiencing characteristics of multiple seasons. 
          This is completely normal—spiritual life doesn't always fit neatly into one category!
        </p>
        
        <div class="tied-seasons">
          <p class="tie-subtitle">You scored equally for:</p>
          ${results.ties.map(seasonId => `
            <div class="tied-season-card" data-season="${seasonId}">
              <div class="season-header">
                <h3>${seasonNames[seasonId]}</h3>
                <div class="season-score">Score: ${results.scores[seasonId]}</div>
              </div>
              <p class="season-description">
                ${seasonDescriptions[seasonId]}
              </p>
              <button class="btn btn-primary choose-season-btn" data-season="${seasonId}">
                Choose This Season
              </button>
            </div>
          `).join('')}
        </div>
        
        <div class="tie-alternative">
          <p class="text-secondary">Not sure which to choose?</p>
          <button class="btn btn-secondary" id="take-tiebreaker">
            Answer a Few More Questions
          </button>
        </div>
        
        <button class="btn btn-link" id="retake-full-quiz">Retake Full Quiz</button>
      </div>
    `;

    // Attach event listeners
    container.querySelectorAll('.choose-season-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const selectedSeason = btn.getAttribute('data-season');
        const seasonInfo = quizData.seasons.find(s => s.id === selectedSeason);
        const customResults = {
          ...results,
          winningSeason: selectedSeason,
          result: quizData.results[selectedSeason],
          seasonInfo: seasonInfo || { id: selectedSeason, title: selectedSeason, emoji: '🌟' },
          tieResolution: 'user_choice'
        };
        await saveResultsAndSetSeason(customResults);
        displayFinalResults(containerId, customResults);
      });
    });

    document.getElementById('take-tiebreaker')?.addEventListener('click', () => {
      renderTieBreaker(containerId, results);
    });

    document.getElementById('retake-full-quiz')?.addEventListener('click', () => {
      reset();
      render(containerId);
    });
  }

  /**
   * Render tie-breaker questions
   */
  function renderTieBreaker(containerId, results) {
    const tieBreakerQuestions = [
      {
        text: "Right now, I most need...",
        options: {
          winter: "Deep rest and time for quiet reflection",
          spring: "Fresh hope and a sense of new beginnings",
          summer: "Energy to celebrate and share my blessings",
          autumn: "Space to reflect and let go of the past"
        }
      },
      {
        text: "When I think about my spiritual life, I feel...",
        options: {
          winter: "Called to stillness and patient waiting",
          spring: "Excited about new possibilities ahead",
          summer: "Energized to actively serve and grow",
          autumn: "Ready to harvest lessons and release burdens"
        }
      },
      {
        text: "The practice that resonates most deeply is...",
        options: {
          winter: "Quiet meditation and trusting God's timing",
          spring: "Planting new seeds of faith and hope",
          summer: "Active worship and generous sharing",
          autumn: "Grateful reflection and graceful release"
        }
      }
    ];

    // Filter to only show tied seasons
    const filteredQuestions = tieBreakerQuestions.map(q => ({
      ...q,
      options: Object.fromEntries(
        Object.entries(q.options).filter(([season]) => results.ties.includes(season))
      )
    }));

    let tieBreakerAnswers = [];
    let currentQ = 0;

    function renderTieBreakerQuestion() {
      const q = filteredQuestions[currentQ];
      
      container.innerHTML = `
        <div class="tiebreaker-screen">
          <div class="tiebreaker-progress">
            <div class="progress-text">Tie-Breaker Question ${currentQ + 1} of ${filteredQuestions.length}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${((currentQ + 1) / filteredQuestions.length) * 100}%"></div>
            </div>
          </div>
          
          <h3 class="tiebreaker-question">${q.text}</h3>
          
          <div class="tiebreaker-options">
            ${Object.entries(q.options).map(([season, text]) => `
              <button class="tiebreaker-option" data-season="${season}">
                <div class="option-text">${text}</div>
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelectorAll('.tiebreaker-option').forEach(btn => {
        btn.addEventListener('click', () => {
          tieBreakerAnswers.push(btn.getAttribute('data-season'));
          currentQ++;
          
          if (currentQ < filteredQuestions.length) {
            renderTieBreakerQuestion();
          } else {
            // Calculate tie-breaker winner
            const counts = {};
            tieBreakerAnswers.forEach(season => {
              counts[season] = (counts[season] || 0) + 1;
            });
            
            const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            const seasonInfo = quizData.seasons.find(s => s.id === winner);
            
            const finalResults = {
              ...results,
              winningSeason: winner,
              result: quizData.results[winner],
              seasonInfo: seasonInfo || { id: winner, title: winner, emoji: '🌟' },
              tieResolution: 'tiebreaker'
            };
            
            saveResultsAndSetSeason(finalResults);
            displayFinalResults(containerId, finalResults);
          }
        });
      });
    }

    renderTieBreakerQuestion();
  }

  /**
   * Display final results screen
   */
  function displayFinalResults(containerId, results) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get season icon
    const seasonIcons = {
      winter: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="24" cy="24" r="8"/>
        <path d="M24 4v8M24 36v8M4 24h8M36 24h8M8.93 8.93l5.66 5.66M33.41 33.41l5.66 5.66M8.93 39.07l5.66-5.66M33.41 14.59l5.66-5.66"/>
      </svg>`,
      spring: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M24 44V24"/>
        <path d="M24 24c-8-8-16-4-16 4 0 4 4 8 8 8"/>
        <path d="M24 24c8-8 16-4 16 4 0 4-4 8-8 8"/>
        <circle cx="24" cy="12" r="8"/>
      </svg>`,
      summer: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="24" cy="24" r="10"/>
        <path d="M24 4v6M24 38v6M4 24h6M38 24h6M10.1 10.1l4.24 4.24M33.66 33.66l4.24 4.24M10.1 37.9l4.24-4.24M33.66 14.34l4.24-4.24"/>
      </svg>`,
      autumn: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M24 4C12 16 12 32 24 44"/>
        <path d="M24 4c12 12 12 28 0 40"/>
        <path d="M24 4v40"/>
        <path d="M12 20h24"/>
        <path d="M16 28h16"/>
      </svg>`
    };

    container.innerHTML = `
      <div class="quiz-results season-transition">
        <div class="quiz-results-icon" style="color: var(--${results.winningSeason}-primary)">
          ${seasonIcons[results.winningSeason]}
        </div>
        
        <h2 class="quiz-results-title">${results.result.title}</h2>
        
        <p class="quiz-results-message">${results.result.message}</p>
        
        <div class="quiz-results-encouragement">
          "${results.result.encouragement}"
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); max-width: 300px; margin: 0 auto;">
          <button class="btn btn-primary btn-lg btn-block" id="start-journey">
            Begin Your Journey
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          
          <button class="btn btn-secondary" id="retake-quiz">
            Retake Quiz
          </button>
        </div>

        <div style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--border-color);">
          <p style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--space-4);">
            Your scores by season:
          </p>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); text-align: center;">
            ${Object.entries(results.scores).map(([season, score]) => `
              <div style="padding: var(--space-2); background: var(--${season}-light); border-radius: var(--radius-md);">
                <div style="font-weight: 700; color: var(--${season}-dark);">${score}</div>
                <div style="font-size: var(--text-xs); color: var(--text-secondary); text-transform: capitalize;">${season}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Attach result listeners
    document.getElementById('start-journey').addEventListener('click', () => {
      // Navigate to the intro page for the winning season
      Router.navigate('intro', { page: results.winningSeason });
    });

    document.getElementById('retake-quiz').addEventListener('click', () => {
      reset();
      render(containerId);
    });
  }

  /**
   * Render welcome screen before quiz
   */
  function renderWelcome(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="welcome-screen">
        <img src="assets/icons/icon.svg" alt="Spiritual Seasons" class="welcome-logo">
        <h1 class="welcome-title">Spiritual Seasons</h1>
        <p class="welcome-subtitle">Daily Devotional Workbook</p>
        <p class="welcome-author">by Dr. Jacqueline Ghee</p>
        
        <p class="welcome-description">
          ${quizData.description}
        </p>

        <button class="btn btn-primary btn-lg" id="start-quiz">
          Discover Your Season
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    `;

    document.getElementById('start-quiz').addEventListener('click', () => {
      render(containerId);
    });
  }

  // Public API
  return {
    init,
    reset,
    render,
    renderWelcome,
    renderResults,
    getCurrentQuestion,
    getTotalQuestions,
    getProgress,
    answerQuestion,
    isCurrentAnswered,
    getCurrentAnswer,
    next,
    previous,
    isComplete,
    isFirst,
    isLast,
    calculateResults,
    getScaleLabels,
    getScaleRange
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quiz;
}
