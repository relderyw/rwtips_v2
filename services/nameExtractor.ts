// services/nameExtractor.ts

const commonTeams = [
    'Spain', 'France', 'Germany', 'Italy', 'Brazil', 'Argentina', 'Portugal', 'Netherlands', 'England', 'Belgium',
    'Real Madrid', 'Barcelona', 'FC Bayern', 'Man City', 'Man Utd', 'Liverpool', 'PSG', 'Juventus', 'Arsenal', 'Chelsea',
    'Borussia Dortmund', 'Bayer Leverkusen', 'Napoli', 'AC Milan', 'Inter', 'Inter de Milão', 'Atletico Madrid', 'Sevilla',
    'Piemonte Calcio', 'Latium', 'Genoa', 'Roma', 'RB Leipzig', 'Real Sociedad', 'Athletic Club', 'Aston Villa', 'Spurs',
    'PAOK', 'Benfica', 'Sporting', 'Porto', 'Ajax', 'Bayern de Munique', 'Bayer de Munique', 'Inglaterra', 'França', 'Espanha',
    'Alemanha', 'Itália', 'Argentina', 'Holanda', 'Bélgica', 'Suíça', 'Escócia', 'Áustria', 'Grécia', 'Turquia'
];

const knownClubAcronyms = ['PSG', 'RMA', 'FCB', 'MCI', 'MUN', 'LIV', 'CHE', 'ARS', 'TOT', 'JUV', 'MIL', 'INT', 'NAP', 'BVB', 'ATM', 'FC', 'CF', 'SC', 'PAOK'];

/**
 * Extracts BOTH the player name and the team name from a raw API string.
 * Handles formats like "Team (Player)" and "Player (Team)".
 */
export const extractTeamAndPlayer = (str: string): { player: string, team: string } => {
    if (!str) return { player: "", team: "" };
    
    // 1. Check for "Team (Player)" or "Player (Team)" format
    const parenMatch = str.match(/(.*?)\((.*?)\)/);

    if (parenMatch) {
        const part1 = parenMatch[1].trim();
        const part2 = parenMatch[2].trim();
        
        const part2Upper = part2.toUpperCase();
        const part1Upper = part1.toUpperCase();

        // If explicitly part2 is a recognized team name, return part1 as the player and part2 as team
        if (commonTeams.some(team => part2Upper.includes(team.toUpperCase()))) return { player: part1, team: part2 };
        if (knownClubAcronyms.includes(part2Upper)) return { player: part1, team: part2 };
        
        // If explicitly part1 is a recognized team name, return part2 as the player and part1 as team
        if (commonTeams.some(team => part1Upper.includes(team.toUpperCase()))) return { player: part2, team: part1 };
        if (knownClubAcronyms.includes(part1Upper)) return { player: part2, team: part1 };
        
        // Default heuristic: 
        // We know in Adriatic it's usually "Player (Team)" or "Team (Player)". 
        // If part2 is all caps and part1 isn't, part2 is likely player name (e.g. Inter (JOHNY))
        const isPart1Caps = /^[A-Z0-9\s]+$/.test(part1) && part1.length > 1;
        const isPart2Caps = /^[A-Z0-9\s]+$/.test(part2) && part2.length > 1;
        
        if (isPart2Caps && !isPart1Caps) return { player: part2, team: part1 };
        if (isPart1Caps && !isPart2Caps) return { player: part1, team: part2 };

        // Ultimate fallback: assume Team (Player) because that's what Superbet mostly uses.
        return { player: part2, team: part1 };
    }
    
    // 2. Fallback for strings without parentheses (e.g., "PSG DANGERDIM77" or "Bayern Munich BECKHAM")
    let cleanStr = str.trim();
    let detectedTeam = "";
    
    const teamWordsToRemove = [...commonTeams, ...knownClubAcronyms].sort((a, b) => b.length - a.length); // Longest first
    
    for (const team of teamWordsToRemove) {
        const regex = new RegExp(`\\b${team}\\b`, 'i');
        if (regex.test(cleanStr)) {
            detectedTeam = team;
            cleanStr = cleanStr.replace(regex, '').trim();
            break;
        }
    }
    
    // Clean up any stray hyphens or extra spaces left behind
    cleanStr = cleanStr.replace(/^-\s*|\s*-\s*$/g, '').trim();
    
    // If we only have one word and didn't detect a team, assume it's just the player
    return { player: cleanStr || str.trim(), team: detectedTeam };
};
