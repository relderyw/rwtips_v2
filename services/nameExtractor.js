"use strict";
// services/nameExtractor.ts
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTeamAndPlayer = void 0;
var commonTeams = [
    'Spain', 'France', 'Germany', 'Italy', 'Brazil', 'Argentina', 'Portugal', 'Netherlands', 'England', 'Belgium',
    'Real Madrid', 'Barcelona', 'FC Bayern', 'Man City', 'Man Utd', 'Liverpool', 'PSG', 'Juventus', 'Arsenal', 'Chelsea',
    'Borussia Dortmund', 'Bayer Leverkusen', 'Napoli', 'AC Milan', 'Inter', 'Inter de Milão', 'Atletico Madrid', 'Sevilla',
    'Piemonte Calcio', 'Latium', 'Genoa', 'Roma', 'RB Leipzig', 'Real Sociedad', 'Athletic Club', 'Aston Villa', 'Spurs',
    'PAOK', 'Benfica', 'Sporting', 'Porto', 'Ajax', 'Bayern de Munique', 'Bayer de Munique', 'Inglaterra', 'França', 'Espanha',
    'Alemanha', 'Itália', 'Argentina', 'Holanda', 'Bélgica', 'Suíça', 'Escócia', 'Áustria', 'Grécia', 'Turquia'
];
var knownClubAcronyms = ['PSG', 'RMA', 'FCB', 'MCI', 'MUN', 'LIV', 'CHE', 'ARS', 'TOT', 'JUV', 'MIL', 'INT', 'NAP', 'BVB', 'ATM', 'FC', 'CF', 'SC', 'PAOK'];
/**
 * Extracts BOTH the player name and the team name from a raw API string.
 * Handles formats like "Team (Player)" and "Player (Team)".
 */
var extractTeamAndPlayer = function (str) {
    if (!str)
        return { player: "", team: "" };
    // 1. Check for "Team (Player)" or "Player (Team)" format
    // We look for the LAST set of parentheses to handle cases like "Boca Juniors (ARG) (Stenido)"
    var lastOpen = str.lastIndexOf('(');
    var lastClose = str.lastIndexOf(')');
    if (lastOpen !== -1 && lastClose > lastOpen) {
        var part1 = str.substring(0, lastOpen).trim();
        var part2 = str.substring(lastOpen + 1, lastClose).trim();
        var part2Upper_1 = part2.toUpperCase();
        var part1Upper_1 = part1.toUpperCase();
        // If explicitly part2 is a recognized team name, return part1 as the player and part2 as team
        if (commonTeams.some(function (team) { return part2Upper_1.includes(team.toUpperCase()); }))
            return { player: part1, team: part2 };
        if (knownClubAcronyms.includes(part2Upper_1))
            return { player: part1, team: part2 };
        // If explicitly part1 is a recognized team name, return part2 as the player and part1 as team
        if (commonTeams.some(function (team) { return part1Upper_1.includes(team.toUpperCase()); }))
            return { player: part2, team: part1 };
        if (knownClubAcronyms.includes(part1Upper_1))
            return { player: part2, team: part1 };
        // Default heuristic: 
        // We know in Adriatic it's usually "Player (Team)" or "Team (Player)". 
        // If part2 is all caps and part1 isn't, part2 is likely player name (e.g. Inter (JOHNY))
        var isPart1Caps = /^[A-Z0-9\s]+$/.test(part1) && part1.length > 1;
        var isPart2Caps = /^[A-Z0-9\s]+$/.test(part2) && part2.length > 1;
        if (isPart2Caps && !isPart1Caps)
            return { player: part2, team: part1 };
        if (isPart1Caps && !isPart2Caps)
            return { player: part1, team: part2 };
        // Ultimate fallback: assume Team (Player) because that's what Superbet mostly uses.
        return { player: part2, team: part1 };
    }
    // 2. Fallback for strings without parentheses (e.g., "PSG DANGERDIM77" or "Bayern Munich BECKHAM")
    var cleanStr = str.trim();
    var detectedTeam = "";
    var teamWordsToRemove = __spreadArray(__spreadArray([], commonTeams, true), knownClubAcronyms, true).sort(function (a, b) { return b.length - a.length; }); // Longest first
    for (var _i = 0, teamWordsToRemove_1 = teamWordsToRemove; _i < teamWordsToRemove_1.length; _i++) {
        var team = teamWordsToRemove_1[_i];
        var regex = new RegExp("\\b".concat(team, "\\b"), 'i');
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
exports.extractTeamAndPlayer = extractTeamAndPlayer;
