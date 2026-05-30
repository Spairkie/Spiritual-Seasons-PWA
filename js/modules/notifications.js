/**
 * Spiritual Seasons PWA - Enhanced Notifications Module
 * Handles daily reminders with quiet hours, snooze, and customization
 */

const Notifications = (() => {
  let scheduledTimeout = null;
  let snoozeTimeout = null;
  const DEFAULT_REMINDER_TIME = '09:00';
  const DEFAULT_QUIET_START = '22:00';
  const DEFAULT_QUIET_END = '07:00';
  const SNOOZE_OPTIONS = [5, 15, 30, 60]; // minutes

  /**
   * Initialize notification system
   */
  async function init() {
    const settings = await Store.getSettings();
    
    // Set defaults if not configured
    if (!settings.reminderTime) {
      await Store.saveSetting('reminderTime', DEFAULT_REMINDER_TIME);
    }
    if (settings.notificationsEnabled === undefined) {
      await Store.saveSetting('notificationsEnabled', false);
    }
    if (settings.quietHoursEnabled === undefined) {
      await Store.saveSetting('quietHoursEnabled', false);
    }
    if (!settings.quietHoursStart) {
      await Store.saveSetting('quietHoursStart', DEFAULT_QUIET_START);
    }
    if (!settings.quietHoursEnd) {
      await Store.saveSetting('quietHoursEnd', DEFAULT_QUIET_END);
    }

    // Schedule if enabled
    if (settings.notificationsEnabled && isPermitted()) {
      await scheduleReminder();
    }

    return true;
  }

  /**
   * Check if notifications are supported
   */
  function isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Request notification permission
   */
  async function requestPermission() {
    if (!isSupported()) {
      Toast.error('Notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        Toast.success('Notifications enabled ✓');
        await Store.saveSetting('notificationsEnabled', true);
        await scheduleReminder();
        return true;
      } else if (permission === 'denied') {
        Toast.error('Notification permission denied');
        await Store.saveSetting('notificationsEnabled', false);
        return false;
      }
      
      return false;
    } catch (error) {
      Utils.debug.error('Error requesting notification permission:', error);
      Toast.error('Failed to request notification permission');
      return false;
    }
  }

  /**
   * Check if notifications are permitted
   */
  function isPermitted() {
    return isSupported() && Notification.permission === 'granted';
  }

  /**
   * Check if currently in quiet hours
   */
  async function isQuietHours() {
    const settings = await Store.getSettings();
    
    if (!settings.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime < quietEnd;
    } else {
      return currentTime >= quietStart && currentTime < quietEnd;
    }
  }

  /**
   * Schedule daily reminder
   */
  async function scheduleReminder() {
    const settings = await Store.getSettings();
    
    if (!settings.notificationsEnabled || !isPermitted()) {
      cancelReminder();
      return;
    }

    // Cancel any existing scheduled notification
    cancelReminder();

    // Parse reminder time
    const [hours, minutes] = settings.reminderTime.split(':').map(Number);
    
    // Calculate next notification time
    const now = new Date();
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next.getTime() - now.getTime();

    // Schedule the notification
    scheduledTimeout = setTimeout(async () => {
      await showReminder();
      // Schedule the next one for tomorrow
      await scheduleReminder();
    }, delay);

    Utils.debug.log(`✓ Reminder scheduled for ${next.toLocaleString()}`);
  }

  /**
   * Cancel scheduled reminder
   */
  function cancelReminder() {
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      scheduledTimeout = null;
    }
  }

  /**
   * Show the daily reminder notification
   */
  async function showReminder() {
    if (!isPermitted()) return;

    // Check quiet hours
    if (await isQuietHours()) {
      Utils.debug.log('Skipping notification - quiet hours active');
      return;
    }

    const currentDay = await Store.getCurrentDay() || 1;
    const dayData = Devotional.getDay(currentDay);
    const season = Devotional.getSeasonForDay(currentDay);
    const progress = await Store.getDayProgress(currentDay);

    if (!dayData) return;

    const isCompleted = progress && progress.completed;
    const title = isCompleted 
      ? `✓ Day ${currentDay} Complete`
      : `Day ${currentDay} - ${season?.title || 'Devotional'}`;

    const body = isCompleted
      ? 'Great job! Ready for tomorrow\'s devotion?'
      : dayData.prompt.substring(0, 100) + (dayData.prompt.length > 100 ? '...' : '');

    try {
      const notification = new Notification(title, {
        body: body,
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-72.png',
        tag: 'daily-devotional',
        requireInteraction: false,
        data: { day: currentDay },
        actions: !isCompleted ? [
          { action: 'open', title: 'Read Now' },
          { action: 'snooze', title: 'Snooze' }
        ] : [
          { action: 'open', title: 'View' }
        ]
      });

      notification.onclick = () => {
        window.focus();
        Router.navigate('devotional', { day: currentDay });
        notification.close();
      };

      // Store notification for snooze functionality
      await Store.saveSetting('lastNotificationTime', new Date().toISOString());
      
    } catch (error) {
      Utils.debug.error('Error showing notification:', error);
    }
  }

  /**
   * Snooze notification
   */
  async function snooze(minutes = 15) {
    if (snoozeTimeout) {
      clearTimeout(snoozeTimeout);
    }

    const delay = minutes * 60 * 1000;

    snoozeTimeout = setTimeout(async () => {
      await showReminder();
      snoozeTimeout = null;
    }, delay);

    Toast.success(`Reminder snoozed for ${minutes} minutes`);
    Utils.debug.log(`Reminder snoozed for ${minutes} minutes`);
  }

  /**
   * Test notification (for settings)
   */
  async function sendTestNotification() {
    if (!isPermitted()) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification('Test Notification', {
        body: 'Notifications are working! You\'ll receive daily reminders at your chosen time.',
        icon: 'assets/icons/icon-192.png',
        badge: 'assets/icons/icon-72.png',
        tag: 'test-notification'
      });

      notification.onclick = () => {
        notification.close();
      };

      Toast.success('Test notification sent');
    } catch (error) {
      Utils.debug.error('Error sending test notification:', error);
      Toast.error('Failed to send test notification');
    }
  }

  /**
   * Enable notifications
   */
  async function enable() {
    const granted = await requestPermission();
    if (granted) {
      await Store.saveSetting('notificationsEnabled', true);
      await scheduleReminder();
    }
    return granted;
  }

  /**
   * Disable notifications
   */
  async function disable() {
    await Store.saveSetting('notificationsEnabled', false);
    cancelReminder();
    if (snoozeTimeout) {
      clearTimeout(snoozeTimeout);
      snoozeTimeout = null;
    }
    Toast.info('Notifications disabled');
  }

  /**
   * Update reminder time
   */
  async function setReminderTime(time) {
    await Store.saveSetting('reminderTime', time);
    const settings = await Store.getSettings();
    
    if (settings.notificationsEnabled) {
      await scheduleReminder();
      Toast.success('Reminder time updated');
    }
  }

  /**
   * Enable/disable quiet hours
   */
  async function setQuietHours(enabled, startTime, endTime) {
    await Store.saveSetting('quietHoursEnabled', enabled);
    
    if (startTime) {
      await Store.saveSetting('quietHoursStart', startTime);
    }
    if (endTime) {
      await Store.saveSetting('quietHoursEnd', endTime);
    }

    Toast.success(enabled ? 'Quiet hours enabled' : 'Quiet hours disabled');
  }

  /**
   * Render notification settings UI
   */
  async function renderSettings(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const settings = await Store.getSettings();
    const permitted = isPermitted();
    const supported = isSupported();

    if (!supported) {
      container.innerHTML = `
        <div class="settings-section">
          <h3 class="settings-section-title">Notifications</h3>
          <p class="text-secondary">Notifications are not supported in this browser.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="settings-section">
        <h3 class="settings-section-title">Daily Reminders</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">Enable Daily Reminders</div>
            <div class="setting-description">
              Get a notification each day to complete your devotion
            </div>
          </div>
          <label class="toggle">
            <input 
              type="checkbox" 
              id="notifications-toggle" 
              ${settings.notificationsEnabled ? 'checked' : ''}
              ${!permitted ? 'disabled' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        ${!permitted && !settings.notificationsEnabled ? `
          <div class="setting-item">
            <button class="btn btn-primary" id="request-permission-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>Enable Notifications</span>
            </button>
          </div>
        ` : ''}

        ${permitted && settings.notificationsEnabled ? `
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">Reminder Time</div>
              <div class="setting-description">
                When should we remind you?
              </div>
            </div>
            <input 
              type="time" 
              id="reminder-time-input" 
              class="time-input"
              value="${settings.reminderTime || DEFAULT_REMINDER_TIME}">
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">Quiet Hours</div>
              <div class="setting-description">
                Silence notifications during certain hours
              </div>
            </div>
            <label class="toggle">
              <input 
                type="checkbox" 
                id="quiet-hours-toggle" 
                ${settings.quietHoursEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          ${settings.quietHoursEnabled ? `
            <div class="setting-item quiet-hours-settings">
              <div class="time-range-inputs">
                <div class="time-input-group">
                  <label for="quiet-start">From</label>
                  <input 
                    type="time" 
                    id="quiet-start-input" 
                    class="time-input"
                    value="${settings.quietHoursStart || DEFAULT_QUIET_START}">
                </div>
                <span class="time-range-separator">to</span>
                <div class="time-input-group">
                  <label for="quiet-end">Until</label>
                  <input 
                    type="time" 
                    id="quiet-end-input" 
                    class="time-input"
                    value="${settings.quietHoursEnd || DEFAULT_QUIET_END}">
                </div>
              </div>
            </div>
          ` : ''}

          <div class="setting-item">
            <button class="btn btn-secondary btn-sm" id="test-notification-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span>Send Test Notification</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    attachSettingsListeners();
  }

  /**
   * Attach event listeners to settings UI
   */
  function attachSettingsListeners() {
    // Request permission button
    document.getElementById('request-permission-btn')?.addEventListener('click', async () => {
      await enable();
      renderSettings('notifications-settings-container');
    });

    // Enable/disable toggle
    document.getElementById('notifications-toggle')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        await enable();
      } else {
        await disable();
      }
      renderSettings('notifications-settings-container');
    });

    // Reminder time
    document.getElementById('reminder-time-input')?.addEventListener('change', async (e) => {
      await setReminderTime(e.target.value);
    });

    // Quiet hours toggle
    document.getElementById('quiet-hours-toggle')?.addEventListener('change', async (e) => {
      const startTime = document.getElementById('quiet-start-input')?.value;
      const endTime = document.getElementById('quiet-end-input')?.value;
      await setQuietHours(e.target.checked, startTime, endTime);
      renderSettings('notifications-settings-container');
    });

    // Quiet hours time inputs
    document.getElementById('quiet-start-input')?.addEventListener('change', async (e) => {
      const settings = await Store.getSettings();
      const endTime = document.getElementById('quiet-end-input')?.value;
      await setQuietHours(settings.quietHoursEnabled, e.target.value, endTime);
    });

    document.getElementById('quiet-end-input')?.addEventListener('change', async (e) => {
      const settings = await Store.getSettings();
      const startTime = document.getElementById('quiet-start-input')?.value;
      await setQuietHours(settings.quietHoursEnabled, startTime, e.target.value);
    });

    // Test notification
    document.getElementById('test-notification-btn')?.addEventListener('click', () => {
      sendTestNotification();
    });
  }

  return {
    init,
    isSupported,
    isPermitted,
    requestPermission,
    enable,
    disable,
    scheduleReminder,
    cancelReminder,
    showReminder,
    snooze,
    sendTestNotification,
    setReminderTime,
    setQuietHours,
    renderSettings,
    isQuietHours,
    SNOOZE_OPTIONS
  };
})();
