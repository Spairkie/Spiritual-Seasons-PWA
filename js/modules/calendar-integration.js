/**
 * Calendar Integration Module
 * Export devotional schedule as iCal (.ics) file
 */

const CalendarIntegration = (() => {
  /**
   * Generate iCal file content
   */
  function generateICS(startDate, includeCompleted = false) {
    const now = new Date();
    const uid = `spiritual-seasons-${now.getTime()}`;
    
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:1.0',
      'PRODID:-//Spiritual Seasons//Devotional Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Spiritual Seasons Devotional',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:120-day devotional journey through the spiritual seasons'
    ].join('\r\n');
    
    // Get all days from the devotional
    const seasons = Devotional.getSeasons();
    let dayNumber = 1;
    
    for (const season of seasons) {
      const days = Devotional.getDaysInSeason(season.id);
      
      for (const day of days) {
        const eventDate = new Date(startDate);
        eventDate.setDate(eventDate.getDate() + (dayNumber - 1));
        
        const event = createEvent({
          uid: `${uid}-day-${dayNumber}`,
          summary: `Day ${dayNumber}: ${day.scriptureRef}`,
          description: `${day.scriptureText}\n\n${day.prompt}`,
          startDate: eventDate,
          duration: 30, // 30 minutes
          location: 'Spiritual Seasons App',
          categories: [season.title.split(' — ')[0]]
        });
        
        icsContent += '\r\n' + event;
        dayNumber++;
      }
    }
    
    icsContent += '\r\nEND:VCALENDAR';
    
    return icsContent;
  }

  /**
   * Create a single iCal event
   */
  function createEvent({ uid, summary, description, startDate, duration, location, categories }) {
    const startStr = formatICSDate(startDate);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const endStr = formatICSDate(endDate);
    const stampStr = formatICSDate(new Date());
    
    // Escape special characters in text fields
    const escapedSummary = escapeICSText(summary);
    const escapedDescription = escapeICSText(description);
    const escapedLocation = escapeICSText(location);
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}@spiritualseasons.app`,
      `DTSTAMP:${stampStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${escapedSummary}`,
      `DESCRIPTION:${escapedDescription}`,
      `LOCATION:${escapedLocation}`,
      `CATEGORIES:${categories.join(',')}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapedSummary}`,
      'END:VALARM',
      'END:VEVENT'
    ].join('\r\n');
  }

  /**
   * Format date for iCal (YYYYMMDDTHHmmssZ)
   */
  function formatICSDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape text for iCal format
   */
  function escapeICSText(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  /**
   * Download iCal file
   */
  function downloadICS(icsContent, filename = 'spiritual-seasons-devotional') {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Show calendar export dialog
   */
  async function showExportDialog() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0); // Default to 8:00 AM
    
    const modalContent = document.createElement('div');
    modalContent.innerHTML = `
      <div style="margin-bottom: var(--space-6);">
        <p style="color: var(--text-secondary); margin-bottom: var(--space-4);">
          Export your 120-day devotional journey to your calendar app. Each day will be added as a separate event with scripture reference and reflection prompt.
        </p>
        
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">
            Start Date
          </label>
          <input 
            type="date" 
            id="start-date"
            value="${tomorrow.toISOString().split('T')[0]}"
            style="width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: var(--text-base);"
          >
        </div>
        
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">
            Daily Time
          </label>
          <input 
            type="time" 
            id="daily-time"
            value="08:00"
            style="width: 100%; padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: var(--text-base);"
          >
        </div>
        
        <div class="card" style="background: var(--bg-secondary); padding: var(--space-4); margin-top: var(--space-6);">
          <h4 style="margin-bottom: var(--space-2); font-weight: 600;">📅 What's Included</h4>
          <ul style="color: var(--text-secondary); padding-left: var(--space-5); margin: 0;">
            <li>All 120 devotional days</li>
            <li>Scripture references and verses</li>
            <li>Daily reflection prompts</li>
            <li>Organized by spiritual season</li>
            <li>15-minute reminder before each event</li>
          </ul>
        </div>
      </div>
    `;
    
    const startDateInput = modalContent.querySelector('#start-date');
    const dailyTimeInput = modalContent.querySelector('#daily-time');
    
    Modal.create({
      title: 'Export to Calendar',
      content: modalContent,
      size: 'medium',
      buttons: [
        {
          text: 'Export Calendar',
          className: 'btn-primary',
          onClick: async () => {
            try {
              const startDateStr = startDateInput.value;
              const timeStr = dailyTimeInput.value;
              
              if (!startDateStr || !timeStr) {
                Toast.error('Please select both date and time');
                return false;
              }
              
              // Combine date and time
              const [hours, minutes] = timeStr.split(':');
              const startDate = new Date(startDateStr);
              startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              
              // Generate and download ICS file
              const icsContent = generateICS(startDate);
              downloadICS(icsContent);
              
              Toast.success('Calendar file downloaded successfully!');
              
              // Show instructions
              setTimeout(() => {
                Modal.create({
                  title: 'Calendar Added!',
                  content: `
                    <div style="text-align: center;">
                      <div style="font-size: 48px; margin-bottom: var(--space-4);">✅</div>
                      <p style="margin-bottom: var(--space-4);">
                        Your devotional calendar has been downloaded. 
                      </p>
                      <div class="card" style="background: var(--bg-secondary); text-align: left; padding: var(--space-4);">
                        <h4 style="margin-bottom: var(--space-3); font-weight: 600;">📲 Next Steps:</h4>
                        <ol style="color: var(--text-secondary); padding-left: var(--space-5); margin: 0;">
                          <li style="margin-bottom: var(--space-2);">Open the downloaded <code>.ics</code> file</li>
                          <li style="margin-bottom: var(--space-2);">Your calendar app will open automatically</li>
                          <li style="margin-bottom: var(--space-2);">Confirm the import to add all 120 days</li>
                          <li>Set up any additional reminders if desired</li>
                        </ol>
                      </div>
                      <p style="margin-top: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary);">
                        Compatible with Google Calendar, Apple Calendar, Outlook, and most calendar apps.
                      </p>
                    </div>
                  `,
                  size: 'medium',
                  buttons: [
                    {
                      text: 'Got it!',
                      className: 'btn-primary',
                      onClick: () => true
                    }
                  ]
                });
              }, 500);
              
              return true; // Close the export dialog
            } catch (error) {
              console.error('Calendar export error:', error);
              Toast.error('Failed to export calendar');
              return false;
            }
          }
        },
        {
          text: 'Cancel',
          className: 'btn-ghost',
          onClick: () => true
        }
      ]
    });
  }

  return {
    generateICS,
    downloadICS,
    showExportDialog
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalendarIntegration;
}
