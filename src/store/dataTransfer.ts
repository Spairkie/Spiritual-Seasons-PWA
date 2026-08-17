import { getDb } from './db';
import { STORE_NAMES } from '@/types/store';
import type { DataExport, ImportValidation, ImportResult } from '@/types/store';
import { getUser, saveUser, getQuizResults, saveQuizResults } from './user';
import { getAllJournalEntries, saveJournalEntry } from './journal';
import { getAllProgress, markDayComplete } from './progress';
import { getAllFavorites } from './favorites';
import { getSettings, saveSettings, resetSettings, DEFAULT_SETTINGS } from './settings';
import { getAllAudioNotes, saveAudioNote } from './audioNotes';
import { getAllWeeklyReflections, saveWeeklyReflection } from './weeklyReflections';
import { getStreakData, updateStreakData } from './streaks';

/** Matches legacy CONFIG.LIMITS / CONFIG.JOURNAL constants. */
const LIMITS = {
  MAX_JOURNAL_LENGTH: 50000,
  MAX_AUDIO_DURATION_SECONDS: 300,
  MAX_FAVORITE_COUNT: 120,
  MAX_AUDIO_SIZE_MB: 10,
};

export async function exportAllData(): Promise<DataExport> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: await getUser(),
    quizResults: await getQuizResults(),
    journal: await getAllJournalEntries(),
    progress: await getAllProgress(),
    favorites: await getAllFavorites(),
    settings: await getSettings(),
    audioNotes: await getAllAudioNotes(),
    weeklyReflections: await getAllWeeklyReflections(),
    streaks: await getStreakData(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateImportData(data: any): ImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format: expected an object');
    return { valid: false, errors, warnings };
  }

  const hasAnyValidData =
    data.user !== undefined ||
    data.quizResults !== undefined ||
    data.journal !== undefined ||
    data.progress !== undefined ||
    data.favorites !== undefined ||
    data.settings !== undefined ||
    data.audioNotes !== undefined ||
    data.weeklyReflections !== undefined;

  if (!hasAnyValidData) {
    errors.push('No recognizable Spiritual Seasons data found');
    return { valid: false, errors, warnings };
  }

  if (data.journal !== undefined) {
    if (!Array.isArray(data.journal)) {
      errors.push('Journal data must be an array');
    } else {
      data.journal.forEach((entry: any, i: number) => {
        if (typeof entry.day !== 'number' || entry.day < 1 || entry.day > 120) {
          errors.push(`Journal entry ${i + 1}: invalid day number`);
        }
        if (entry.content && typeof entry.content !== 'string') {
          errors.push(`Journal entry ${i + 1}: content must be a string`);
        }
        if (entry.content && entry.content.length > LIMITS.MAX_JOURNAL_LENGTH) {
          warnings.push(`Journal entry ${i + 1}: content exceeds maximum length, will be truncated`);
        }
        if (entry.content && /<script|javascript:|onerror=/i.test(entry.content)) {
          errors.push(`Journal entry ${i + 1}: contains potentially unsafe content`);
        }
      });
    }
  }

  if (data.progress !== undefined) {
    if (!Array.isArray(data.progress)) {
      errors.push('Progress data must be an array');
    } else {
      data.progress.forEach((prog: any, i: number) => {
        if (typeof prog.day !== 'number' || prog.day < 1 || prog.day > 120) {
          errors.push(`Progress entry ${i + 1}: invalid day number`);
        }
        if (prog.completedAt) {
          const date = new Date(prog.completedAt);
          if (isNaN(date.getTime())) {
            errors.push(`Progress entry ${i + 1}: invalid date`);
          }
        }
      });
    }
  }

  if (data.favorites !== undefined) {
    if (!Array.isArray(data.favorites)) {
      errors.push('Favorites data must be an array');
    } else if (data.favorites.length > LIMITS.MAX_FAVORITE_COUNT) {
      warnings.push(`Favorites exceed limit (${LIMITS.MAX_FAVORITE_COUNT}), excess will be ignored`);
    }
  }

  if (data.audioNotes !== undefined) {
    if (!Array.isArray(data.audioNotes)) {
      errors.push('Audio notes must be an array');
    } else {
      data.audioNotes.forEach((note: any, i: number) => {
        if (note.size && note.size > LIMITS.MAX_AUDIO_SIZE_MB * 1024 * 1024) {
          errors.push(`Audio note ${i + 1}: exceeds size limit (${LIMITS.MAX_AUDIO_SIZE_MB}MB)`);
        }
        if (note.duration && note.duration > LIMITS.MAX_AUDIO_DURATION_SECONDS) {
          errors.push(`Audio note ${i + 1}: exceeds duration limit (${LIMITS.MAX_AUDIO_DURATION_SECONDS}s)`);
        }
      });
    }
  }

  if (data.weeklyReflections !== undefined) {
    if (!Array.isArray(data.weeklyReflections)) {
      errors.push('Weekly reflections must be an array');
    } else {
      data.weeklyReflections.forEach((reflection: any, i: number) => {
        if (typeof reflection.week !== 'number' || reflection.week < 1 || reflection.week > 17) {
          errors.push(`Weekly reflection ${i + 1}: invalid week number`);
        }
        if (!Array.isArray(reflection.responses)) {
          errors.push(`Weekly reflection ${i + 1}: responses must be an array`);
        }
      });
    }
  }

  if (data.settings) {
    const validFontSizes = ['small', 'medium', 'large', 'extra-large'];
    const validLineSpacing = ['compact', 'normal', 'relaxed', 'loose'];
    const validThemes = ['light', 'dark', 'system'];

    if (data.settings.fontSize && !validFontSizes.includes(data.settings.fontSize)) {
      warnings.push('Invalid font size, will use default');
    }
    if (data.settings.lineSpacing && !validLineSpacing.includes(data.settings.lineSpacing)) {
      warnings.push('Invalid line spacing, will use default');
    }
    if (data.settings.darkMode && !validThemes.includes(data.settings.darkMode)) {
      warnings.push('Invalid theme, will use default');
    }
  }

  if (data.version && data.version > 1) {
    warnings.push(`Data from newer version (v${data.version}), some features may not import correctly`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importData(data: any): Promise<ImportResult> {
  const validation = validateImportData(data);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      message: 'Import failed: ' + validation.errors.join('; '),
    };
  }

  try {
    const db = await getDb();
    await Promise.all(Object.values(STORE_NAMES).map((store) => db.clear(store)));

    const counts = { journal: 0, progress: 0, favorites: 0, audioNotes: 0, reflections: 0 };

    if (data.user) await saveUser(data.user);
    if (data.quizResults) await saveQuizResults(data.quizResults);

    if (data.journal && Array.isArray(data.journal)) {
      for (const entry of data.journal) {
        if (entry.day >= 1 && entry.day <= 120) {
          await saveJournalEntry(entry.day, entry.content || '', entry.season);
          counts.journal++;
        }
      }
    }

    if (data.progress && Array.isArray(data.progress)) {
      for (const prog of data.progress) {
        if (prog.completed && prog.day >= 1 && prog.day <= 120) {
          await markDayComplete(prog.day, prog.season);
          counts.progress++;
        }
      }
    }

    if (data.favorites && Array.isArray(data.favorites)) {
      for (const fav of data.favorites) {
        if (fav.day >= 1 && fav.day <= 120) {
          await db.put(STORE_NAMES.FAVORITES, fav);
          counts.favorites++;
        }
      }
    }

    if (data.settings) await saveSettings(data.settings);

    if (data.audioNotes && Array.isArray(data.audioNotes)) {
      for (const note of data.audioNotes) {
        if (note.day >= 1 && note.day <= 120) {
          await saveAudioNote(note);
          counts.audioNotes++;
        }
      }
    }

    if (data.weeklyReflections && Array.isArray(data.weeklyReflections)) {
      for (const reflection of data.weeklyReflections) {
        await saveWeeklyReflection(reflection);
        counts.reflections++;
      }
    }

    if (data.streaks) {
      await updateStreakData(data.streaks);
    }

    const parts = [
      `${counts.journal} journal entries`,
      `${counts.progress} progress records`,
      `${counts.favorites} favorites`,
    ];
    if (counts.audioNotes > 0) parts.push(`${counts.audioNotes} audio notes`);
    if (counts.reflections > 0) parts.push(`${counts.reflections} reflections`);

    return { success: true, imported: counts, message: `Imported: ${parts.join(', ')}` };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message],
      message: 'Import failed due to an unexpected error',
    };
  }
}

export async function resetAllData(): Promise<true> {
  const db = await getDb();
  await Promise.all(
    Object.values(STORE_NAMES)
      .filter((store) => store !== STORE_NAMES.SETTINGS)
      .map((store) => db.clear(store))
  );
  await resetSettings();
  return true;
}

export { DEFAULT_SETTINGS };
