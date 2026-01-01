import axios from 'axios';

const API_KEY = 'eb1fee786f198d9679794fbf92a68bd9';
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

async function testTheOddsApi() {
    try {
        // 1. Get Sports
        console.log("Fetching sports...");
        const sportsRes = await axios.get(`${BASE_URL}?apiKey=${API_KEY}`);
        const soccerSports = sportsRes.data
            .filter((s: any) => s.group === 'Soccer')
            .map((s: any) => s.key);
        
        console.log(`Found ${soccerSports.length} soccer leagues.`);
        
        if (soccerSports.length === 0) return;

        // 2. Fetch Odds/Events for a few popular leagues (to save quota/time)
        // We'll pick a few keys or just use 'soccer' if it allows querying all soccer (usually not, must specify sport)
        // Actually, we can pass comma separated sports or just iterate. 
        // Let's try 'soccer_brazil_campeonato' if it exists, or just the first few.
        
        const targetLeagues = soccerSports.slice(0, 3).join(',');
        console.log(`Fetching events for: ${targetLeagues}`);

        // Note: The endpoint for events is /v4/sports/{sport}/events usually, or /odds
        // Let's try fetching events for the first one.
        const firstLeague = soccerSports[0];
        const eventsUrl = `${BASE_URL}/${firstLeague}/odds?apiKey=${API_KEY}&regions=us&markets=h2h`;
        
        const eventsRes = await axios.get(eventsUrl);
        console.log(`Events for ${firstLeague}:`, eventsRes.data.length);
        if (eventsRes.data.length > 0) {
            console.log("Sample Event:", JSON.stringify(eventsRes.data[0], null, 2));
        }

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Data:", e.response.data);
        }
    }
}

testTheOddsApi();
