/**
 * Weekly Reflection Module
 * Provides weekly prompts for deeper reflection on spiritual growth
 */

const WeeklyReflection = (() => {
  const REFLECTION_FREQUENCY = 7; // Every 7 days

  const REFLECTION_QUESTIONS = [
    {
      week: 1,
      questions: [
        "What has God been teaching you this week?",
        "How have you experienced His presence?",
        "What scripture has spoken most deeply to you?"
      ]
    },
    {
      week: 2,
      questions: [
        "What spiritual growth have you noticed in yourself?",
        "Where have you struggled, and what did you learn?",
        "How has journaling helped your faith journey?"
      ]
    },
    {
      week: 3,
      questions: [
        "What patterns do you notice in your spiritual life?",
        "How has your prayer life deepened?",
        "What are you most grateful for this week?"
      ]
    },
    {
      week: 4,
      questions: [
        "How has God answered prayer in your life?",
        "What area of growth is God highlighting?",
        "How can you apply what you've learned?"
      ]
    },
    // Repeat pattern for remaining weeks
    {
      week: 5,
      questions: [
        "What has been the biggest challenge this week?",
        "How have you seen God's faithfulness?",
        "What truth do you need to hold onto?"
      ]
    },
    {
      week: 6,
      questions: [
        "In what ways have you grown spiritually?",
        "What has brought you the most joy?",
        "How are you trusting God more deeply?"
      ]
    },
    {
      week: 7,
      questions: [
        "What scriptures have encouraged you most?",
        "How has God's love become more real to you?",
        "What do you want to focus on moving forward?"
      ]
    },
    {
      week: 8,
      questions: [
        "Where have you experienced breakthrough?",
        "What old patterns are you leaving behind?",
        "How is God renewing your mind and heart?"
      ]
    },
    {
      week: 9,
      questions: [
        "What spiritual practices have been most meaningful?",
        "How has worship deepened your relationship with God?",
        "What are you learning about God's character?"
      ]
    },
    {
      week: 10,
      questions: [
        "How has God been speaking to you?",
        "What areas need more surrender?",
        "What promises are you claiming?"
      ]
    },
    {
      week: 11,
      questions: [
        "What transformation have you witnessed?",
        "How has hope grown in your heart?",
        "What legacy of faith are you building?"
      ]
    },
    {
      week: 12,
      questions: [
        "What has been the greatest blessing this week?",
        "How have you shared your faith with others?",
        "What are you carrying into the next season?"
      ]
    },
    {
      week: 13,
      questions: [
        "How has your understanding of God's grace deepened?",
        "What relationships has God been healing?",
        "Where do you see His hand at work?"
      ]
    },
    {
      week: 14,
      questions: [
        "What fears has God been addressing?",
        "How has faith replaced worry?",
        "What miracles have you witnessed?"
      ]
    },
    {
      week: 15,
      questions: [
        "How has this devotional journey changed you?",
        "What will you continue practicing?",
        "How will you keep growing spiritually?"
      ]
    },
    {
      week: 16,
      questions: [
        "What has God revealed about His plans for you?",
        "How has obedience led to blessing?",
        "What legacy are you leaving?"
      ]
    },
    {
      week: 17,
      questions: [
        "Looking back, how have you grown?",
        "What do you want to remember from this journey?",
        "How will you continue walking with God?"
      ]
    }
  ];

  /**
   * Initialize weekly reflections
   */
  async function init() {
    return true;
  }

  /**
   * Calculate which week a day belongs to
   */
  function getWeekNumber(day) {
    return Math.ceil(day / REFLECTION_FREQUENCY);
  }

  /**
   * Check if reflection is due for a given day
   */
  async function isReflectionDue(day) {
    // Reflection is due on days 7, 14, 21, 28, etc.
    if (day % REFLECTION_FREQUENCY !== 0) {
      return false;
    }

    const week = getWeekNumber(day);
    const existing = await Store.getWeeklyReflection(week);
    
    return !existing; // Due if doesn't exist yet
  }

  /**
   * Get reflection questions for a specific week
   */
  function getReflectionQuestions(week) {
    const reflection = REFLECTION_QUESTIONS.find(r => r.week === week);
    
    if (reflection) {
      return reflection.questions;
    }

    // If specific week not found, use a rotating pattern
    const index = (week - 1) % REFLECTION_QUESTIONS.length;
    return REFLECTION_QUESTIONS[index].questions;
  }

  /**
   * Save weekly reflection
   */
  async function saveReflection(week, responses) {
    try {
      const reflection = {
        week,
        questions: getReflectionQuestions(week),
        responses,
        createdAt: new Date().toISOString()
      };

      await Store.saveWeeklyReflection(reflection);
      Toast.success('Weekly reflection saved ✓');
      return true;
    } catch (error) {
      console.error('Error saving reflection:', error);
      Toast.error('Failed to save reflection');
      return false;
    }
  }

  /**
   * Get all reflections
   */
  async function getAllReflections() {
    try {
      return await Store.getAllWeeklyReflections();
    } catch (error) {
      console.error('Error getting reflections:', error);
      return [];
    }
  }

  /**
   * Render reflection prompt modal
   */
  async function promptReflection(day) {
    const week = getWeekNumber(day);
    const questions = getReflectionQuestions(week);

    const modalContent = document.createElement('div');
    modalContent.className = 'weekly-reflection-form';
    modalContent.innerHTML = `
      <div class="reflection-intro">
        <p>You've completed ${day} days! Take a moment to reflect on your spiritual journey this week.</p>
      </div>
      
      ${questions.map((question, index) => `
        <div class="reflection-question-group">
          <label class="reflection-question" for="reflection-${index}">
            ${question}
          </label>
          <textarea 
            id="reflection-${index}" 
            class="reflection-textarea"
            rows="4"
            placeholder="Reflect on this question..."
            aria-label="${question}"></textarea>
        </div>
      `).join('')}
    `;

    Modal.create({
      title: `Week ${week} Reflection`,
      content: modalContent,
      size: 'large',
      buttons: [
        {
          text: 'Save Reflection',
          className: 'btn-primary',
          onClick: async () => {
            const responses = questions.map((_, index) => {
              const textarea = document.getElementById(`reflection-${index}`);
              return textarea ? textarea.value : '';
            });

            // Check if at least one response is filled
            const hasContent = responses.some(r => r.trim().length > 0);
            
            if (!hasContent) {
              Toast.warning('Please answer at least one question');
              return false; // Don't close modal
            }

            await saveReflection(week, responses);
            return true; // Close modal
          }
        },
        {
          text: 'Skip for Now',
          className: 'btn-secondary',
          onClick: () => {
            return true; // Just close
          }
        }
      ],
      closeOnOverlay: false,
      closeOnEscape: false
    });
  }

  /**
   * Render all reflections view
   */
  async function renderReflectionsView(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading reflections...</div>';

    try {
      const reflections = await getAllReflections();
      
      if (reflections.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>No Reflections Yet</h3>
            <p>Weekly reflections will appear here as you complete each week of devotions.</p>
          </div>
        `;
        return;
      }

      // Sort by week
      reflections.sort((a, b) => b.week - a.week);

      container.innerHTML = `
        <div class="reflections-view">
          <h1 class="page-title">Weekly Reflections</h1>
          <p class="page-subtitle">Review your spiritual journey week by week</p>

          <div class="reflections-list">
            ${reflections.map(reflection => `
              <div class="reflection-card">
                <div class="reflection-header">
                  <h3>Week ${reflection.week} Reflection</h3>
                  <span class="reflection-date">
                    ${new Date(reflection.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div class="reflection-content">
                  ${reflection.questions.map((question, index) => `
                    ${reflection.responses[index] && reflection.responses[index].trim() ? `
                      <div class="reflection-qa">
                        <div class="reflection-q">${question}</div>
                        <div class="reflection-a">${escapeHtml(reflection.responses[index])}</div>
                      </div>
                    ` : ''}
                  `).join('')}
                </div>
                
                <div class="reflection-actions">
                  <button class="btn btn-link btn-sm" onclick="WeeklyReflection.editReflection(${reflection.week})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button class="btn btn-link btn-sm" onclick="WeeklyReflection.exportReflection(${reflection.week})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Error rendering reflections:', error);
      container.innerHTML = `
        <div class="error-message">
          <p>Unable to load reflections</p>
          <button class="btn btn-secondary" onclick="WeeklyReflection.renderReflectionsView('${containerId}')">
            Try Again
          </button>
        </div>
      `;
    }
  }

  /**
   * Edit an existing reflection
   */
  async function editReflection(week) {
    const existing = await Store.getWeeklyReflection(week);
    if (!existing) {
      Toast.error('Reflection not found');
      return;
    }

    const modalContent = document.createElement('div');
    modalContent.className = 'weekly-reflection-form';
    modalContent.innerHTML = `
      ${existing.questions.map((question, index) => `
        <div class="reflection-question-group">
          <label class="reflection-question" for="edit-reflection-${index}">
            ${question}
          </label>
          <textarea 
            id="edit-reflection-${index}" 
            class="reflection-textarea"
            rows="4"
            aria-label="${question}">${escapeHtml(existing.responses[index] || '')}</textarea>
        </div>
      `).join('')}
    `;

    Modal.create({
      title: `Edit Week ${week} Reflection`,
      content: modalContent,
      size: 'large',
      buttons: [
        {
          text: 'Save Changes',
          className: 'btn-primary',
          onClick: async () => {
            const responses = existing.questions.map((_, index) => {
              const textarea = document.getElementById(`edit-reflection-${index}`);
              return textarea ? textarea.value : '';
            });

            await saveReflection(week, responses);
            // Refresh the view
            renderReflectionsView('content');
            return true;
          }
        },
        {
          text: 'Cancel',
          className: 'btn-secondary',
          onClick: () => true
        }
      ]
    });
  }

  /**
   * Export reflection as text
   */
  async function exportReflection(week) {
    const reflection = await Store.getWeeklyReflection(week);
    if (!reflection) {
      Toast.error('Reflection not found');
      return;
    }

    const text = [
      `Week ${week} Reflection`,
      `Date: ${new Date(reflection.createdAt).toLocaleDateString()}`,
      '',
      ...reflection.questions.map((q, i) => 
        `Q: ${q}\nA: ${reflection.responses[i] || '(No response)'}\n`
      )
    ].join('\n');

    // Create download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `week-${week}-reflection.txt`;
    a.click();
    URL.revokeObjectURL(url);

    Toast.success('Reflection exported');
  }

  /**
   * Escape HTML for safe display
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    init,
    getWeekNumber,
    isReflectionDue,
    promptReflection,
    saveReflection,
    getAllReflections,
    renderReflectionsView,
    editReflection,
    exportReflection
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeeklyReflection;
}
