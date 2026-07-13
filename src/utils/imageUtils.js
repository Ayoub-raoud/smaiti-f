const API_BASE = 'https://smaiti-b-production.up.railway.app';

/**
 * Builds a fully qualified image URL from any given path.
 * @param {string} path - The image path from the API.
 * @returns {string|null} - The full URL, or null if invalid.
 */
export const getImageUrl = (path) => {
  if (!path || typeof path !== 'string') return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  // 1. Already absolute → return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 2. Contains the backend domain but lacks scheme → add https://
  if (trimmed.includes('smaiti-b-production.up.railway.app')) {
    return `https://${trimmed}`;
  }

  // 3. Starts with '/storage/' or just '/' → prepend API_BASE
  if (trimmed.startsWith('/')) {
    return `${API_BASE}${trimmed}`;
  }

  // 4. Fallback: treat as a relative path (prepend API_BASE + '/')
  return `${API_BASE}/${trimmed}`;
};