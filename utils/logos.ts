import logosData from '../logos.json';

// Create a fast lookup map ignoring case and extra spaces
const logosMap = new Map<string, string>();
Object.entries(logosData).forEach(([key, url]) => {
  logosMap.set(key.trim().toLowerCase(), url as string);
});

// Alias map for common variations and translations
const TEAM_ALIASES: Record<string, string> = {
  "frança": "france",
  "noruega": "norway",
  "itália": "italy",
  "espanha": "spain",
  "alemanha": "germany",
  "holanda": "netherlands",
  "bélgica": "belgium",
  "suíça": "switzerland",
  "manchester united": "man utd",
  "manchester city": "man city",
  "athletic club": "athletic bilbao",
  "a. bilbao": "athletic bilbao",
  "a. madrid": "atletico madrid",
  "atletico": "atletico madrid",
  "spurs": "tottenham",
  "tottenham hotspur": "tottenham",
  "bayern munich": "bayern",
  "bayern de munique": "bayern",
  "bayer leverkusen": "leverkusen",
  "bayer 04": "leverkusen",
  "pariss saint-germain": "psg",
  "p.s.g.": "psg"
};

/**
 * Returns the URL for a team's logo if available.
 * Does a fuzzy match against the logos.json keys and aliases.
 */
export const getTeamLogo = (teamName: string | undefined): string | null => {
  if (!teamName) return null;
  
  let normalized = teamName.trim().toLowerCase();
  
  // 1. Remove common noise like (ARG), (12 min), etc.
  normalized = normalized.replace(/\((.*?)\)/g, '').trim();

  // 2. Check Aliases
  if (TEAM_ALIASES[normalized]) {
    normalized = TEAM_ALIASES[normalized];
  }

  // 3. Direct match
  if (logosMap.has(normalized)) {
    return logosMap.get(normalized)!;
  }
  
  // 4. Partial matches (e.g., if "FC Barcelona" is passed, but JSON has "Barcelona")
  for (const [key, url] of logosMap.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url;
    }
  }
  
  return null;
};
