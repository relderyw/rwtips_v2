import requests
import json

LIVE_API_URL = "https://rwtips-r943.onrender.com/api/app3/live-events"
RECENT_MATCHES_URL = "https://rwtips-r943.onrender.com/api/app3/history"
H2H_API_URL = "https://rwtips-r943.onrender.com/api/app3/confronto?player1={player1}&player2={player2}&interval=30"

def test_live_matches():
    print("\n--- Testing Live Matches ---")
    try:
        response = requests.get(LIVE_API_URL, timeout=15)
        response.raise_for_status()
        data = response.json()
        events = data.get('events', [])
        print(f"Success: Found {len(events)} live events")
        if events:
            e = events[0]
            print(f"Sample Event: {e.get('homePlayer')} vs {e.get('awayPlayer')} | Time: {e.get('timer', {}).get('formatted')} | Score: {e.get('scoreboard')}")
            return True
        return True
    except Exception as e:
        print(f"Error testing live matches: {e}")
        return False

def test_recent_matches():
    print("\n--- Testing Recent Matches ---")
    try:
        page_size = 5
        params = {'limit': page_size, 'offset': 0, 'sort': '-time'}
        response = requests.get(RECENT_MATCHES_URL, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        raw_matches = data if isinstance(data, list) else data.get('results', [])
        print(f"Success: Found {len(raw_matches)} recent matches")
        if raw_matches:
            m = raw_matches[0]
            print(f"Sample Match: {m.get('home_player')} vs {m.get('away_player')} | HT: {m.get('home_score_ht')}-{m.get('away_score_ht')} | FT: {m.get('home_score_ft')}-{m.get('away_score_ft')}")
            return True
        return True
    except Exception as e:
        print(f"Error testing recent matches: {e}")
        return False

def test_h2h_data():
    print("\n--- Testing H2H Data ---")
    try:
        # Using players from recent matches or known names
        player1 = "Sheva"
        player2 = "Yerema"
        url = H2H_API_URL.format(player1=player1, player2=player2)
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        print(f"Success: Found H2H data for {player1} vs {player2}")
        print(f"Total Matches: {data.get('total_matches', 0)}")
        return True
    except Exception as e:
        print(f"Error testing H2H data: {e}")
        return False

if __name__ == "__main__":
    s1 = test_live_matches()
    s2 = test_recent_matches()
    s3 = test_h2h_data()
    
    if s1 and s2 and s3:
        print("\n✅ All API tests passed!")
    else:
        print("\n❌ Some API tests failed.")
