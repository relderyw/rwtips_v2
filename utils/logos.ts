import logosData from '../logos.json';

// Create a fast lookup map ignoring case and extra spaces
const logosMap = new Map<string, string>();
Object.entries(logosData).forEach(([key, url]) => {
  logosMap.set(key.trim().toLowerCase(), url as string);
});

/**
 * Returns the URL for a team's logo if available.
 * Does a fuzzy match against the logos.json keys.
 */
export const getTeamLogo = (teamName: string | undefined): string | null => {
  if (!teamName) return null;
  
  const normalized = teamName.trim().toLowerCase();
  
  // Direct match
  if (logosMap.has(normalized)) {
    return logosMap.get(normalized)!;
  }
  
  // Partial matches (e.g., if "FC Barcelona" is passed, but JSON has "Barcelona")
  for (const [key, url] of logosMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  
  return null;
};
