/**
 * Progress Module
 * Handles streak tracking, milestones, and progress visualization
 */

const Progress = (() => {
  const MILESTONES = [7, 14, 30, 60, 90, 120];
  const GRACE_PERIOD_HOURS = 24;

  /**
   * Initialize progress tracking
   */
  async function init() {
    // Ensure streak data exists
    const streakData = await Store.getStreakData();
    if (!streakData.currentStreak) {
      await updateStreaks();
    }
    return true;
  }

  /**
   * Update streaks based on current progress
   */
  async function updateStreaks() {
    try {
      const calculated = await Store.calculateStreak();
      await Store.updateStreakData(calculated);
      return calculated;
    } catch (error) {
      Utils.debug.error('Error updating streaks:', error);
      return null;
    }
  }

  /**
   * Get current streak information
   */
  async function getCurrentStreak() {
    try {
      const streakData = await Store.getStreakData();
      return {
        current: streakData.currentStreak || 0,
        longest: streakData.longestStreak || 0,
        lastCompleted: streakData.lastCompletedDate,
        milestones: streakData.milestones || []
      };
    } catch (error) {
      Utils.debug.error('Error getting streak:', error);
      return { current: 0, longest: 0, lastCompleted: null, milestones: [] };
    }
  }

  /**
   * Check if a day was completed
   */
  async function isDayCompleted(day) {
    try {
      const progress = await Store.getDayProgress(day);
      return progress && progress.completed;
    } catch (error) {
      Utils.debug.error('Error checking day completion:', error);
      return false;
    }
  }

  /**
   * Mark a day as complete and update streaks
   */
  async function completeDayWithStreak(day) {
    try {
      // Mark the day as complete
      await Store.markDayComplete(day);

      // Update streak data
      const updated = await updateStreaks();

      // Check for new milestones
      if (updated) {
        await checkMilestones(updated.currentStreak);
      }
      
      // Check if weekly reflection is due (after marking complete)
      if (typeof WeeklyReflection !== 'undefined') {
        const isDue = await WeeklyReflection.isReflectionDue(day);
        if (isDue) {
          // Delay showing the reflection to let the completion animation finish
          setTimeout(() => {
            WeeklyReflection.promptReflection(day);
          }, 1500);
        }
      }

      return updated;
    } catch (error) {
      Utils.debug.error('Error completing day:', error);
      return null;
    }
  }

  /**
   * Check and award milestones
   */
  async function checkMilestones(currentStreak) {
    try {
      const streakData = await Store.getStreakData();
      const achievedMilestones = streakData.milestones || [];

      for (const milestone of MILESTONES) {
        if (currentStreak >= milestone && !achievedMilestones.includes(milestone)) {
          achievedMilestones.push(milestone);
          await awardMilestone(milestone);
        }
      }

      // Save updated milestones
      await Store.updateStreakData({
        ...streakData,
        milestones: achievedMilestones
      });

      return achievedMilestones;
    } catch (error) {
      Utils.debug.error('Error checking milestones:', error);
      return [];
    }
  }

  /**
   * Award a milestone with celebration
   */
  async function awardMilestone(milestone) {
    const messages = {
      7: { 
        title: '🎉 7-Day Streak!',
        message: 'You\'ve completed a full week of devotions. Keep growing!'
      },
      14: {
        title: '🌟 14-Day Streak!',
        message: 'Two weeks of faithful devotion. Your dedication is inspiring!'
      },
      30: {
        title: '🏆 30-Day Streak!',
        message: 'A full month of spiritual growth. You\'re building strong habits!'
      },
      60: {
        title: '💎 60-Day Streak!',
        message: 'Two months of devotion! Your commitment is extraordinary!'
      },
      90: {
        title: '👑 90-Day Streak!',
        message: 'Three months strong! You\'re nearing the complete journey!'
      },
      120: {
        title: '🎊 120-Day Journey Complete!',
        message: 'You\'ve completed the entire Spiritual Seasons journey. Congratulations!'
      }
    };

    const achievement = messages[milestone];
    
    if (achievement) {
      // Show celebration modal
      await Modal.alert({
        title: achievement.title,
        message: achievement.message,
        buttonText: 'Continue'
      });

      // Also show a toast
      Toast.success(`${milestone}-day milestone reached! 🎉`);
    }
  }

  /**
   * Get overall progress statistics
   */
  async function getProgressStats() {
    try {
      const completedDays = await Store.getCompletedDaysCount();
      const totalDays = 120;
      const percentage = Math.round((completedDays / totalDays) * 100);
      const streak = await getCurrentStreak();
      const journalEntries = await Store.getAllJournalEntries();
      const audioNotes = await Store.getAllAudioNotes();
      const favorites = await Store.getAllFavorites();

      return {
        completedDays,
        totalDays,
        percentage,
        remainingDays: totalDays - completedDays,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        milestones: streak.milestones,
        journalEntries: journalEntries.length,
        audioNotes: audioNotes.length,
        favorites: favorites.length
      };
    } catch (error) {
      Utils.debug.error('Error getting progress stats:', error);
      return {
        completedDays: 0,
        totalDays: 120,
        percentage: 0,
        remainingDays: 120,
        currentStreak: 0,
        longestStreak: 0,
        milestones: [],
        journalEntries: 0,
        audioNotes: 0,
        favorites: 0
      };
    }
  }

  /**
   * Get progress by season
   */
  async function getSeasonProgress() {
    try {
      const seasons = ['winter', 'spring', 'summer', 'autumn'];
      const seasonRanges = {
        winter: [1, 30],
        spring: [31, 60],
        summer: [61, 90],
        autumn: [91, 120]
      };

      const progress = {};

      for (const season of seasons) {
        const [start, end] = seasonRanges[season];
        let completed = 0;
        let total = end - start + 1;

        for (let day = start; day <= end; day++) {
          const isComplete = await isDayCompleted(day);
          if (isComplete) completed++;
        }

        progress[season] = {
          completed,
          total,
          percentage: Math.round((completed / total) * 100)
        };
      }

      return progress;
    } catch (error) {
      Utils.debug.error('Error getting season progress:', error);
      return null;
    }
  }

  /**
   * Render progress dashboard
   */
  async function renderDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading progress...</div>';

    try {
      const stats = await getProgressStats();
      const seasonProgress = await getSeasonProgress();

      container.innerHTML = `
        <div class="page-content">
          <div class="progress-dashboard">
            <h1 class="page-title">Your Progress</h1>

          <!-- Overall Progress Card -->
          <div class="progress-card featured">
            <h2 class="progress-card-title">Overall Journey</h2>
            <div class="progress-circle-container">
              <svg class="progress-circle" viewBox="0 0 200 200">
                <circle class="progress-circle-bg" cx="100" cy="100" r="90" />
                <circle class="progress-circle-fill" cx="100" cy="100" r="90" 
                        stroke-dasharray="${2 * Math.PI * 90}"
                        stroke-dashoffset="${2 * Math.PI * 90 * (1 - stats.percentage / 100)}" />
              </svg>
              <div class="progress-circle-text">
                <div class="progress-percentage">${stats.percentage}%</div>
                <div class="progress-label">Complete</div>
              </div>
            </div>
            <div class="progress-stats">
              <div class="stat-item">
                <div class="stat-value">${stats.completedDays}</div>
                <div class="stat-label">Days Completed</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.remainingDays}</div>
                <div class="stat-label">Days Remaining</div>
              </div>
            </div>
          </div>

          <!-- Streak Card -->
          <div class="progress-card">
            <h2 class="progress-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              Streak
            </h2>
            <div class="streak-display">
              <div class="streak-current">
                <div class="streak-number">${stats.currentStreak}</div>
                <div class="streak-label">Current Streak</div>
              </div>
              <div class="streak-divider"></div>
              <div class="streak-longest">
                <div class="streak-number">${stats.longestStreak}</div>
                <div class="streak-label">Longest Streak</div>
              </div>
            </div>
            ${stats.currentStreak > 0 ? `
              <div class="streak-message">
                ${getStreakEncouragement(stats.currentStreak)}
              </div>
            ` : `
              <div class="streak-message">
                Complete a devotion to start your streak!
              </div>
            `}
          </div>

          <!-- Milestones Card -->
          <div class="progress-card">
            <h2 class="progress-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Milestones
            </h2>
            <div class="milestones-grid">
              ${MILESTONES.map(milestone => `
                <div class="milestone-badge ${stats.milestones.includes(milestone) ? 'achieved' : ''}">
                  <div class="milestone-icon">
                    ${stats.milestones.includes(milestone) ? '✓' : milestone}
                  </div>
                  <div class="milestone-label">${milestone} Days</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Season Progress Cards -->
          <div class="season-progress-grid">
            ${seasonProgress ? Object.entries(seasonProgress).map(([season, data]) => `
              <div class="season-progress-card" data-season="${season}">
                <h3 class="season-progress-title">${capitalizeFirstLetter(season)}</h3>
                <div class="season-progress-bar">
                  <div class="season-progress-fill" style="width: ${data.percentage}%"></div>
                </div>
                <div class="season-progress-stats">
                  <span>${data.completed}/${data.total} days</span>
                  <span>${data.percentage}%</span>
                </div>
              </div>
            `).join('') : ''}
          </div>

          <!-- Activity Summary -->
          <div class="progress-card">
            <h2 class="progress-card-title">Activity Summary</h2>
            <div class="activity-grid">
              <div class="activity-item">
                <div class="activity-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-value">${stats.journalEntries}</div>
                  <div class="activity-label">Journal Entries</div>
                </div>
              </div>

              <div class="activity-item">
                <div class="activity-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-value">${stats.audioNotes}</div>
                  <div class="activity-label">Audio Notes</div>
                </div>
              </div>

              <div class="activity-item">
                <div class="activity-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div class="activity-content">
                  <div class="activity-value">${stats.favorites}</div>
                  <div class="activity-label">Favorites</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Share & Export Actions -->
          <div class="progress-card">
            <h2 class="progress-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share & Export
            </h2>
            <div id="share-button-container"></div>
          </div>
        </div>
        </div>
      `;

      // Render share button after DOM is ready
      setTimeout(() => {
        if (typeof Sharing !== 'undefined') {
          Sharing.renderShareButton('share-button-container');
        }
      }, 100);
    } catch (error) {
      Utils.debug.error('Error rendering progress dashboard:', error);
      container.innerHTML = `
        <div class="page-content">
          <div class="error-message">
            <p>Unable to load progress data</p>
            <button class="btn btn-secondary" onclick="Progress.renderDashboard('${containerId}')">
              Try Again
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Get encouraging message based on streak
   */
  function getStreakEncouragement(streak) {
    if (streak >= 120) return "🎊 Journey complete! Amazing dedication!";
    if (streak >= 90) return "👑 Incredible! You're almost there!";
    if (streak >= 60) return "💎 Outstanding commitment!";
    if (streak >= 30) return "🏆 One month strong! Keep it up!";
    if (streak >= 14) return "🌟 Two weeks! You're building a habit!";
    if (streak >= 7) return "🎉 One week! Great start!";
    if (streak >= 3) return "💪 Building momentum!";
    return "🌱 You're on a roll!";
  }

  /**
   * Helper function to capitalize first letter
   */
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Render streak widget (for home page)
   */
  async function renderStreakWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const streak = await getCurrentStreak();
      
      container.innerHTML = `
        <div class="streak-widget" onclick="Router.navigate('progress')">
          <div class="streak-widget-icon">🔥</div>
          <div class="streak-widget-content">
            <div class="streak-widget-number">${streak.current}</div>
            <div class="streak-widget-label">Day Streak</div>
          </div>
        </div>
      `;
    } catch (error) {
      Utils.debug.error('Error rendering streak widget:', error);
    }
  }

  return {
    init,
    updateStreaks,
    getCurrentStreak,
    isDayCompleted,
    completeDayWithStreak,
    getProgressStats,
    getSeasonProgress,
    renderDashboard,
    renderStreakWidget,
    checkMilestones
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Progress;
}
