/**
 * API Key Storage Utilities
 *
 * Manages storage and retrieval of the user's Case.dev API key in localStorage.
 * Security Note: localStorage is vulnerable to XSS attacks. Users should only
 * use this application on trusted devices with secure browsers.
 */

const API_KEY_STORAGE_KEY = 'caseApiKey';
const VAULT_ID_STORAGE_KEY = 'defaultVaultId';
const VAULT_CACHE_EXPIRY_KEY = 'vaultCacheExpiry';

// Cache vault ID for 24 hours
const VAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Save the user's Case.dev API key to localStorage
 */
export function saveApiKey(key: string): void {
  if (!isBrowser()) return;

  if (!key || typeof key !== 'string') {
    throw new Error('Invalid API key');
  }

  // Validate basic format (should start with sk_case_)
  if (!key.startsWith('sk_case_')) {
    console.warn('API key does not match expected format (sk_case_...)');
  }

  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

/**
 * Retrieve the user's Case.dev API key from localStorage
 * Returns null if not found
 */
export function getApiKey(): string | null {
  if (!isBrowser()) return null;

  const key = localStorage.getItem(API_KEY_STORAGE_KEY);
  return key ? key.trim() : null;
}

/**
 * Remove the API key from localStorage
 * Called when API key is invalid or user signs out
 */
export function clearApiKey(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(API_KEY_STORAGE_KEY);
  clearVaultCache();
}

/**
 * Check if an API key is currently stored
 */
export function hasApiKey(): boolean {
  if (!isBrowser()) return false;

  const key = getApiKey();
  return key !== null && key.length > 0;
}

/**
 * Save the default vault ID to cache
 */
export function saveVaultId(vaultId: string): void {
  if (!isBrowser()) return;

  localStorage.setItem(VAULT_ID_STORAGE_KEY, vaultId);

  // Set cache expiry timestamp
  const expiry = Date.now() + VAULT_CACHE_DURATION;
  localStorage.setItem(VAULT_CACHE_EXPIRY_KEY, expiry.toString());
}

/**
 * Get the cached vault ID if not expired
 * Returns null if not found or expired
 */
export function getVaultId(): string | null {
  if (!isBrowser()) return null;

  const vaultId = localStorage.getItem(VAULT_ID_STORAGE_KEY);
  const expiryStr = localStorage.getItem(VAULT_CACHE_EXPIRY_KEY);

  if (!vaultId || !expiryStr) return null;

  const expiry = parseInt(expiryStr, 10);
  if (Date.now() > expiry) {
    // Cache expired
    clearVaultCache();
    return null;
  }

  return vaultId;
}

/**
 * Clear cached vault information
 */
export function clearVaultCache(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(VAULT_ID_STORAGE_KEY);
  localStorage.removeItem(VAULT_CACHE_EXPIRY_KEY);
}

/**
 * Clear all application data (API key, vault cache, etc.)
 * Use when user wants to completely reset or sign out
 */
export function clearAllData(): void {
  if (!isBrowser()) return;

  clearApiKey();
  // Note: We don't clear other app preferences here
  // Only security-sensitive data
}
