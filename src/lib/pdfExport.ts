// Type-only import — the real jsPDF module (and its unused-by-us html2canvas
// peer dependency) is loaded dynamically inside exportJournalToPDF() below,
// so it never ends up in the main bundle for people who never export a PDF.
import type { jsPDF } from 'jspdf';
import { getDayEntry, getSeasonForDay, loadBookData } from '@/content/content';
import * as store from '@/store';
import type { SeasonId } from '@/types/book';

/** RGB triples derived from this app's own --color-*-accent-deep tokens
 * (src/styles/main.css), not the legacy app's unrelated hardcoded colors. */
const SEASON_COLOR: Record<SeasonId, [number, number, number]> = {
  winter: [43, 78, 92],
  spring: [67, 96, 47],
  summer: [131, 90, 22],
  autumn: [122, 53, 36],
};

const PAGE_BREAK_Y = 260;
const MARGIN_X = 20;
const CONTENT_WIDTH = 170;

function addTitlePage(doc: jsPDF): void {
  doc.setFontSize(24);
  doc.setTextColor(43, 78, 92);
  doc.text('Spiritual Seasons', 105, 50, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(93, 88, 82);
  doc.text('Personal Journal', 105, 65, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Exported on ${today}`, 105, 80, { align: 'center' });

  doc.setDrawColor(200, 200, 200);
  doc.line(40, 90, 170, 90);
  doc.addPage();
}

export async function exportJournalToPDF(): Promise<{ success: boolean; message: string }> {
  const entries = (await store.getAllJournalEntries())
    .filter((e) => e.content.trim().length > 0)
    .sort((a, b) => a.day - b.day);

  if (entries.length === 0) {
    return { success: false, message: 'No journal entries to export' };
  }

  const book = await loadBookData();
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF();
  addTitlePage(doc);

  let currentY = 20;
  for (const entry of entries) {
    if (currentY > PAGE_BREAK_Y) {
      doc.addPage();
      currentY = 20;
    }

    const season = getSeasonForDay(book, entry.day);
    const dayEntry = getDayEntry(book, entry.day);
    const dayInSeason = entry.day - (season.days[0]?.day ?? entry.day) + 1;

    doc.setFontSize(10);
    doc.setTextColor(...SEASON_COLOR[season.id]);
    doc.text(`${season.title.split(' — ')[0]} • Day ${dayInSeason}`, MARGIN_X, currentY);
    currentY += 8;

    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text(dayEntry.scriptureRef, MARGIN_X, currentY);
    currentY += 8;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const entryDate = new Date(entry.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    doc.text(entryDate, MARGIN_X, currentY);
    currentY += 12;

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(entry.content, CONTENT_WIDTH) as string[];
    doc.text(lines, MARGIN_X, currentY);
    currentY += lines.length * 5 + 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_X, currentY, 190, currentY);
    currentY += 10;
  }

  const fileName = `spiritual-seasons-journal-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  return { success: true, message: `Exported ${entries.length} journal entries` };
}
