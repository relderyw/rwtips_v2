
import { normalizeHistoryData } from '../services/analyzer';

const mockApiResponse = {
  "results": [
    {
      "match_date": "2026-02-01",
      "match_time": "23:18:40.460000",
      "home_player": "Alukard",
      "away_player": "Sxitted",
      "home_team": "FC Bayern",
      "away_team": "Borussia Dortmund",
      "home_score_ft": 5,
      "away_score_ft": 5,
      "home_score_ht": 0,
      "away_score_ht": 0,
      "league_name": "CLA-UA Champions Cyber League (UA) Cyber Live Arena"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 137751,
    "total_pages": 6888,
    "has_next": true,
    "has_previous": false
  }
};

const normalized = normalizeHistoryData(mockApiResponse);
console.log(JSON.stringify(normalized, null, 2));

if (normalized.length === 1 && 
    normalized[0].home_player === "Alukard" &&
    normalized[0].score_home === 5 &&
    normalized[0].score_away === 5 &&
    normalized[0].data_realizacao.includes("2026-02-01")) {
    console.log("SUCCESS: Data normalized correctly");
} else {
    console.error("FAILURE: Data normalization failed");
}
