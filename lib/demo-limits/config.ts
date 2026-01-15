// Centralized demo limits configuration
// All limits can be overridden via environment variables

function parseEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export interface DemoLimits {
  session: {
    sessionHours: number;
  };
  documents: {
    maxDocumentsPerSession: number;
  };
}

/**
 * Demo limits configuration
 * Can be overridden via environment variables:
 * - DEMO_SESSION_HOURS (default: 24)
 * - DEMO_MAX_DOCUMENTS_PER_SESSION (default: 5)
 */
export const DEMO_LIMITS: DemoLimits = {
  session: {
    sessionHours: parseEnvInt('DEMO_SESSION_HOURS', 24),
  },
  documents: {
    maxDocumentsPerSession: parseEnvInt('DEMO_MAX_DOCUMENTS_PER_SESSION', 5),
  },
};

// Human-readable limit descriptions for UI
export const LIMIT_DESCRIPTIONS = {
  documents: {
    maxDocumentsPerSession: `${DEMO_LIMITS.documents.maxDocumentsPerSession} documents per session`,
  },
};

// Upgrade CTA messages
export const UPGRADE_MESSAGES = {
  documentLimit: {
    title: 'Document Limit Reached',
    description: `You've reached the demo limit of ${DEMO_LIMITS.documents.maxDocumentsPerSession} documents per session. Upgrade for unlimited document generation.`,
    cta: 'Upgrade to Pro',
  },
};

export default DEMO_LIMITS;
