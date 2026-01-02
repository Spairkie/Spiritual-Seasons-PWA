/**
 * Spiritual Seasons PWA - PDF Export Module
 * Export journal entries to formatted PDF with seasonal themes
 */

const PDFExport = (() => {
  let jsPDFLoaded = false;

  /**
   * Export journal to PDF
   */
  async function exportJournalToPDF() {
    try {
      // Create modal with progress
      const modalContent = document.createElement('div');
      modalContent.style.padding = 'var(--space-4)';
      modalContent.style.textAlign = 'center';
      modalContent.innerHTML = `
        <div class="loading-progress">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" id="pdf-progress" style="width: 0%"></div>
          </div>
          <p class="progress-text" id="pdf-status">Preparing export...</p>
        </div>
      `;

      const modal = Modal.create({
        title: 'Exporting to PDF',
        content: modalContent,
        buttons: [],
        size: 'small'
      });

      const updateProgress = (percent, status) => {
        const progressBar = document.getElementById('pdf-progress');
        const statusText = document.getElementById('pdf-status');
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusText) statusText.textContent = status;
      };

      // Load jsPDF library if not already loaded
      if (!jsPDFLoaded) {
        updateProgress(10, 'Loading PDF library...');
        await loadJsPDF();
        jsPDFLoaded = true;
      }

      updateProgress(20, 'Loading journal entries...');

      // Get all journal entries
      const entries = await Store.getAllJournalEntries();
      
      if (entries.length === 0) {
        Modal.close();
        Toast.warning('No journal entries to export');
        return;
      }

      // Sort by day
      entries.sort((a, b) => a.day - b.day);

      updateProgress(40, 'Generating PDF...');

      // Create PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Add title page
      addTitlePage(doc);
      
      // Add entries
      const progressPerEntry = 50 / entries.length;
      let currentProgress = 40;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        addJournalEntry(doc, entry);
        
        currentProgress += progressPerEntry;
        updateProgress(
          Math.round(currentProgress),
          `Adding entry ${i + 1} of ${entries.length}...`
        );
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      updateProgress(95, 'Saving PDF...');

      // Save PDF
      const fileName = `spiritual-seasons-journal-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      updateProgress(100, 'Complete!');

      setTimeout(() => {
        Modal.close();
        Toast.success('Journal exported successfully');
      }, 500);

    } catch (error) {
      console.error('PDF export failed:', error);
      Modal.close();
      Toast.error('Failed to export journal');
    }
  }

  /**
   * Add title page to PDF
   */
  function addTitlePage(doc) {
    doc.setFontSize(24);
    doc.setTextColor(74, 144, 164); // Winter blue
    doc.text('Spiritual Seasons', 105, 50, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(93, 109, 126);
    doc.text('Personal Journal', 105, 65, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(120, 120, 120);
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Exported on ${today}`, 105, 80, { align: 'center' });
    
    // Add decorative line
    doc.setDrawColor(200, 200, 200);
    doc.line(40, 90, 170, 90);
    
    doc.addPage();
  }

  /**
   * Add journal entry to PDF
   */
  function addJournalEntry(doc, entry) {
    const dayData = Devotional.getDay(entry.day);
    if (!dayData) return;

    const season = Devotional.getSeasonForDay(entry.day);
    const dayInSeason = Utils.getDayInSeason(entry.day);

    // Check if we need a new page
    const yPos = doc.lastAutoTable?.finalY || 20;
    if (yPos > 250) {
      doc.addPage();
    }

    let currentY = yPos > 250 ? 20 : yPos + 10;

    // Season & Day badge
    doc.setFontSize(10);
    doc.setTextColor(...getSeasonColor(season.id));
    doc.text(`${season.title.split(' — ')[0]} • Day ${dayInSeason}`, 20, currentY);
    
    currentY += 8;

    // Scripture reference
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(dayData.scriptureRef, 20, currentY);
    
    currentY += 8;

    // Date
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const entryDate = new Date(entry.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    doc.text(entryDate, 20, currentY);
    
    currentY += 12;

    // Journal content
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const content = entry.content || 'No entry';
    const lines = doc.splitTextToSize(content, 170);
    doc.text(lines, 20, currentY);
    
    currentY += (lines.length * 5) + 10;

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, currentY, 190, currentY);
  }

  /**
   * Get season color as RGB array
   */
  function getSeasonColor(seasonId) {
    const colors = {
      winter: [74, 144, 164],
      spring: [139, 195, 74],
      summer: [255, 167, 38],
      autumn: [211, 47, 47]
    };
    return colors[seasonId] || [0, 0, 0];
  }

  /**
   * Load jsPDF library dynamically
   */
  async function loadJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        console.log('✓ jsPDF loaded');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load jsPDF library'));
      };
      document.head.appendChild(script);
    });
  }

  // Public API
  return {
    exportJournalToPDF
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFExport;
}
