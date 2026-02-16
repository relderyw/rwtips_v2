import { normalizeHistoryData } from './analyzer';

const mockGreen365Data = [
  {
    "id": 3027555,
    "eventID": 11453315,
    "score": { "home": 1, "away": 1 },
    "scoreHT": { "home": 0, "away": 1 },
    "competition": { "name": "Esoccer H2H GG League - 8 mins play" },
    "home": { "name": "demolishor", "teamName": "A.Madrid" },
    "away": { "name": "dart", "teamName": "Liverpool" },
    "startTime": "2026-02-16T12:57:00.000Z",
    "status": "ended"
  }
];

const normalized = normalizeHistoryData(mockGreen365Data);
console.log("--- TEST GREEN365 NORMALIZATION ---");
console.log(JSON.stringify(normalized, null, 2));

if (normalized.length > 0 && 
    normalized[0].home_player === "demolishor" && 
    normalized[0].score_home === 1 && 
    normalized[0].halftime_score_away === 1) {
  console.log("✅ TEST PASSED");
} else {
  console.log("❌ TEST FAILED");
  process.exit(1);
}
