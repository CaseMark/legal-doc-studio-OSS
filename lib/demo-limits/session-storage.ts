// Session storage for demo limits tracking
// Tracks documents generated per session with automatic 24-hour reset

import { DEMO_LIMITS } from './config';

const STATS_KEY = 'lds_session_stats';

export interface SessionStats {
  documentsGenerated: number;
  sessionStartAt: string;
  sessionResetAt: string;
}

// Helper function to get session reset time
function getSessionResetTime(sessionHours: number = 24): string {
  const resetTime = new Date();
  resetTime.setHours(resetTime.getHours() + sessionHours);
  return resetTime.toISOString();
}

// Get current session stats
export function getSessionStats(): SessionStats {
  const defaultStats: SessionStats = {
    documentsGenerated: 0,
    sessionStartAt: new Date().toISOString(),
    sessionResetAt: getSessionResetTime(DEMO_LIMITS.session.sessionHours),
  };

  if (typeof window === 'undefined') {
    return defaultStats;
  }

  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (!stored) {
      localStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
      return defaultStats;
    }

    const stats = JSON.parse(stored) as SessionStats;

    // Check if session reset needed
    const now = new Date();
    if (now >= new Date(stats.sessionResetAt)) {
      const resetStats: SessionStats = {
        documentsGenerated: 0,
        sessionStartAt: now.toISOString(),
        sessionResetAt: getSessionResetTime(DEMO_LIMITS.session.sessionHours),
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(resetStats));
      return resetStats;
    }

    return stats;
  } catch {
    return defaultStats;
  }
}

// Update session stats
export function updateSessionStats(updates: Partial<SessionStats>): void {
  if (typeof window === 'undefined') return;

  const current = getSessionStats();
  const updated = { ...current, ...updates };
  localStorage.setItem(STATS_KEY, JSON.stringify(updated));
}

// Increment documents generated count
export function incrementDocumentsGenerated(): void {
  const stats = getSessionStats();
  updateSessionStats({ documentsGenerated: stats.documentsGenerated + 1 });
}

// Check if document limit has been reached
export function hasReachedDocumentLimit(): boolean {
  const stats = getSessionStats();
  return stats.documentsGenerated >= DEMO_LIMITS.documents.maxDocumentsPerSession;
}

// Get remaining documents count
export function getRemainingDocuments(): number {
  const stats = getSessionStats();
  return Math.max(0, DEMO_LIMITS.documents.maxDocumentsPerSession - stats.documentsGenerated);
}

// Calculate time remaining until session reset
export function getTimeRemaining(): string {
  const stats = getSessionStats();
  const now = new Date();
  const reset = new Date(stats.sessionResetAt);
  const diff = reset.getTime() - now.getTime();

  if (diff <= 0) return '0h 0m';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}
