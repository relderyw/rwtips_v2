import requests
import pandas as pd
from datetime import datetime
import telebot
import time

bot_token = '6569266928:AAHm7pOJVsd3WKzJEgdVDez4ZYdCAlRoYO8'
chat_id = '-1001888876068'

bot = telebot.TeleBot(bot_token)

jogos_enviados = set()

def get_ongoing_games():
    """
    Obtém jogos em andamento para a data atual da API 365scores.
    Retorna um DataFrame com informações básicas dos jogos e o lastUpdateId.
    """
    today = datetime.now().strftime("%d/%m/%Y")
    url = "https://webws.365scores.com/web/games/allscores/"
    params = {
        "appTypeId": 5,
        "langId": 31,
        "timezoneName": "America/Manaus",
        "userCountryId": 21,
        "sports": 1,
        "startDate": today,
        "endDate": today,
        "showOdds": "true",
        "onlyMajorGames": "true",
        "withTop": "true",
        "topBookmaker": 161
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        last_update_id = data.get("lastUpdateId", "0")
        games = data.get("games", [])
        df_data = []
        
        # Define status válidos para jogos em andamento
        valid_statuses = {"primeiro tempo", "segundo tempo", "intervalo", "pós-pênaltis"}
        
        for game in games:
            status_text = game.get("statusText", "").lower()
            if status_text in valid_statuses:  # Filtra jogos em andamento
                row = {
                    "id": game.get("id"),
                    "competitionDisplayName": game.get("competitionDisplayName"),
                    "statusText": game.get("statusText"),
                    "gameTime": game.get("gameTime", 0),
                    "home_name": game.get("homeCompetitor", {}).get("name"),
                    "home_score": game.get("homeCompetitor", {}).get("score", 0),
                    "away_name": game.get("awayCompetitor", {}).get("name"),
                    "away_score": game.get("awayCompetitor", {}).get("score", 0)
                }
                df_data.append(row)
        
        return pd.DataFrame(df_data), last_update_id
    
    except requests.exceptions.RequestException as e:
        print(f"Erro ao buscar jogos: {e}")
        return pd.DataFrame(), "0"
    except KeyError as e:
        print(f"Erro ao parsear JSON de jogos: {e}")
        return pd.DataFrame(), "0"

def get_game_stats(game_id, last_update_id):
    """
    Obtém estatísticas de um jogo específico usando seu ID e lastUpdateId.
    Retorna um dicionário com as estatísticas solicitadas para ambos os times.
    """
    url = "https://webws.365scores.com/web/game/stats/"
    params = {
        "appTypeId": 5,
        "langId": 31,
        "timezoneName": "America/Manaus",
        "userCountryId": 21,
        "games": game_id,
        "lastUpdateId": last_update_id
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        stats = data.get("statistics", [])
        competitors = data.get("competitors", [])
        
        if len(competitors) != 2:
            print(f"Erro: Jogo {game_id} não tem exatamente 2 competidores. Competidores: {competitors}")
            return {}
        
        # Assume que o primeiro competidor é o time da casa e o segundo é o visitante
        home_id = competitors[0]["id"]
        away_id = competitors[1]["id"]
        competitor_map = {c["id"]: c["name"] for c in competitors}
        
        print(f"Jogo {game_id} - Time da casa: {home_id} ({competitor_map.get(home_id)}), Time visitante: {away_id} ({competitor_map.get(away_id)})")
        
        # Define as estatísticas a serem extraídas
        stat_mapping = {
            "Posse de Bola": ("ball_possession", 10),
            "Gols esperados (xG)": ("xg", 76),
            "Chutes no gol": ("shots_on_target", 4),
            "Chutes para fora": ("shots_off_target", 5),
            "Escanteios": ("corners", 8),
            "Ataque": ("attacks", 11),
            "Cartões vermelhos": ("red_cards", 2),
            "Cartões amarelos": ("yellow_cards", 1),
            "Perigo afastado": ("danger_cleared", 40)
        }
        
        game_stats = {
            "home_ball_possession": None, "away_ball_possession": None,
            "home_xg": None, "away_xg": None,
            "home_shots_on_target": None, "away_shots_on_target": None,
            "home_shots_off_target": None, "away_shots_off_target": None,
            "home_corners": None, "away_corners": None,
            "home_attacks": None, "away_attacks": None,
            "home_red_cards": None, "away_red_cards": None,
            "home_yellow_cards": None, "away_yellow_cards": None,
            "home_danger_cleared": None, "away_danger_cleared": None
        }
        
        # Debug: Log de todos os IDs de competidores encontrados nas estatísticas
        competitor_ids_in_stats = set(stat.get("competitorId") for stat in stats if stat.get("competitorId"))
        print(f"Jogo {game_id} - IDs de competidores nas estatísticas: {competitor_ids_in_stats}")
        
        for stat in stats:
            stat_id = stat.get("id")
            competitor_id = stat.get("competitorId")
            value = stat.get("value")
            
            # Determina se a estatística pertence ao time da casa ou visitante
            prefix = None
            if competitor_id == home_id:
                prefix = "home"
            elif competitor_id == away_id:
                prefix = "away"
            
            if prefix:
                for stat_name, (col_name, mapped_id) in stat_mapping.items():
                    if stat_id == mapped_id:
                        game_stats[f"{prefix}_{col_name}"] = value
                        print(f"Jogo {game_id} - Atribuído {stat_name} ({value}) ao time {prefix}")
            else:
                print(f"Jogo {game_id} - Nenhum time correspondente para competitorId {competitor_id}")
        
        return game_stats
    
    except requests.exceptions.RequestException as e:
        print(f"Erro ao buscar estatísticas para o jogo {game_id}: {e}")
        return {}
    except KeyError as e:
        print(f"Erro ao parsear JSON de estatísticas para o jogo {game_id}: {e}")
        return {}

def main():
    # Envia mensagem inicial
    text = "<b>Analisando a grade de jogos!!</b> 🚀"
    sent_message = bot.send_message(chat_id=chat_id, text=text, parse_mode="html", disable_web_page_preview=True)

    # Espera 5 segundos
    time.sleep(5)

    # Apaga a mensagem enviada
    bot.delete_message(chat_id=chat_id, message_id=sent_message.message_id)

    # Obtém jogos em andamento e lastUpdateId
    df_games, last_update_id = get_ongoing_games()
    
    if df_games.empty:
        print("Nenhum jogo em andamento encontrado ou ocorreu um erro.")
        return
    
    # Obtém estatísticas para cada jogo
    stats_list = []
    for game_id in df_games["id"]:
        stats = get_game_stats(game_id, last_update_id)
        stats_list.append(stats)
    
    # Cria um DataFrame a partir das estatísticas
    df_stats = pd.DataFrame(stats_list)
    
    # Concatena os DataFrames de jogos e estatísticas
    df_combined = pd.concat([df_games, df_stats], axis=1)
    
    # Reordena as colunas para maior clareza
    columns = [
        "id", "competitionDisplayName", "statusText", "gameTime",
        "home_name", "home_score", "away_name", "away_score"
    ] + [
        "home_ball_possession", "away_ball_possession",
        "home_xg", "away_xg",
        "home_shots_on_target", "away_shots_on_target",
        "home_shots_off_target", "away_shots_off_target",
        "home_corners", "away_corners",
        "home_attacks", "away_attacks",
        "home_red_cards", "away_red_cards",
        "home_yellow_cards", "away_yellow_cards",
        "home_danger_cleared", "away_danger_cleared"
    ]
    # Filtra apenas as colunas que existem em df_combined
    df_combined = df_combined[[col for col in columns if col in df_combined.columns]]
    
    # Armazena métricas em uma lista de dicionários
    game_metrics = []
    for _, row in df_combined.iterrows():
        metrics = {
            "game_id": row["id"],
            "competition": row["competitionDisplayName"],
            "status": row["statusText"],
            "game_time": row["gameTime"],
            "home_team": row["home_name"],
            "home_score": row["home_score"],
            "away_team": row["away_name"],
            "away_score": row["away_score"],
            "home_ball_possession": row.get("home_ball_possession"),
            "away_ball_possession": row.get("away_ball_possession"),
            "home_xg": row.get("home_xg"),
            "away_xg": row.get("away_xg"),
            "home_shots_on_target": row.get("home_shots_on_target"),
            "away_shots_on_target": row.get("away_shots_on_target"),
            "home_shots_off_target": row.get("home_shots_off_target"),
            "away_shots_off_target": row.get("away_shots_off_target"),
            "home_corners": row.get("home_corners"),
            "away_corners": row.get("away_corners"),
            "home_attacks": row.get("home_attacks"),
            "away_attacks": row.get("away_attacks"),
            "home_red_cards": row.get("home_red_cards"),
            "away_red_cards": row.get("away_red_cards"),
            "home_yellow_cards": row.get("home_yellow_cards"),
            "away_yellow_cards": row.get("away_yellow_cards"),
            "home_danger_cleared": row.get("home_danger_cleared"),
            "away_danger_cleared": row.get("away_danger_cleared")
        }
        game_metrics.append(metrics)
    
    # Lógica de envio para o Telegram
    for game in game_metrics:
        jogo_id = f"{game['home_team']} x {game['away_team']}_{game['game_time']}"
        
        if jogo_id in jogos_enviados:
            continue
        
        # Extrai e trata métricas
        Possession_Home = game['home_ball_possession'].replace('%', '') if game['home_ball_possession'] else 0
        Possession_Away = game['away_ball_possession'].replace('%', '') if game['away_ball_possession'] else 0
        
        expected_goals_casa = game['home_xg'] if game['home_xg'] else 0
        expected_goals_visitante = game['away_xg'] if game['away_xg'] else 0
        
        On_Target_Home = game['home_shots_on_target'] if game['home_shots_on_target'] else 0
        On_Target_Away = game['away_shots_on_target'] if game['away_shots_on_target'] else 0
        
        Off_Target_Home = game['home_shots_off_target'] if game['home_shots_off_target'] else 0
        Off_Target_Away = game['away_shots_off_target'] if game['away_shots_off_target'] else 0
        
        Escanteios_Home = game['home_corners'] if game['home_corners'] else 0
        Escanteios_Away = game['away_corners'] if game['away_corners'] else 0
        
        Ataques_Home = game['home_attacks'] if game['home_attacks'] else 0
        Ataques_Away = game['away_attacks'] if game['away_attacks'] else 0
        
        Atp_Perigosos_Home = game['home_danger_cleared'] if game['home_danger_cleared'] else 0
        Atp_Perigosos_Away = game['away_danger_cleared'] if game['away_danger_cleared'] else 0
        
        Yellow_Card_Home = game['home_yellow_cards'] if game['home_yellow_cards'] else 0
        Yellow_Card_Away = game['away_yellow_cards'] if game['away_yellow_cards'] else 0
        
        Red_Card_Home = game['home_red_cards'] if game['home_red_cards'] else 0
        Red_Card_Away = game['away_red_cards'] if game['away_red_cards'] else 0
        
        # Extrai dados do jogo
        Home = game['home_team']
        Away = game['away_team']
        Pais = "Brasil"  # Ajuste se necessário, ou extraia da API se disponível
        liga = game['competition']
        tempo = game['game_time']
        Gols_Home = game['home_score']
        Gols_Away = game['away_score']
        
        # Tratamento do tempo
        tempo_int = tempo
        if tempo_int is None:
            continue  # Ignora se tempo não for válido
        
        t1 = tempo_int <= 43
        t2 = tempo_int >= 50
        
        # Cálculos adaptados
        appm_home = round(Atp_Perigosos_Home / tempo_int, 1) if tempo_int != 0 else 0.0
        appm_away = round(Atp_Perigosos_Away / tempo_int, 1) if tempo_int != 0 else 0.0
        appmT = appm_home + appm_away
        
        cg_home = int(Escanteios_Home) + int(On_Target_Home) + int(Off_Target_Home)
        cg_away = int(Escanteios_Away) + int(On_Target_Away) + int(Off_Target_Away)
        cgT = cg_home + cg_away
        
        sc_home = int(Gols_Home)
        sc_away = int(Gols_Away)
        scT = sc_home + sc_away
        
        cn_h = int(Escanteios_Home)
        cn_a = int(Escanteios_Away)
        cnT = cn_h + cn_a
        
        # Lógica de condições para estratégias (adaptada do código antigo)
        nome_estrategia = None
        t = None
        
        if (appm_home >= 1.3 and cg_home >= 10 and sc_home <= sc_away and t1 and tempo_int <= 39):
            t = 't1'
            nome_estrategia = f'⚽ +{sc_home}.5 Gol (HT) - Casa'
        
        elif (appm_away >= 1.3 and cg_away >= 10 and sc_away <= sc_home and t1 and tempo_int <= 39):
            t = 't1'
            nome_estrategia = f'⚽ +{sc_away}.5 Gol (HT) - Fora'
        
        elif (appm_home >= 1.3 and cg_home >= 10 and sc_home <= 0 and sc_away >= 1 and t1 and tempo_int <= 39):
            t = 't1'
            nome_estrategia = f'⚽ Ambas Marcam - SIM (HT)'
        
        elif (appm_away >= 1.3 and cg_away >= 10 and sc_away <= 0 and sc_home >= 1 and t1 and tempo_int <= 39):
            t = 't1'
            nome_estrategia = f'⚽ Ambas Marcam - SIM (HT)'
        
        elif (appm_home >= 1.1 and cg_home >= 20 and sc_home <= 0 and sc_away >= 1 and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⚽ Ambas Marcam - SIM (FT)'
        
        elif (appm_away >= 1.1 and cg_away >= 20 and sc_away <= 0 and sc_home >= 1 and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⚽ Ambas Marcam - SIM (FT)'
        
        elif (appm_home >= 1.1 and cg_home >= 15 and sc_home <= sc_away and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⚽ +{sc_home}.5 Gol (FT) - Casa'
        
        elif (appm_away >= 1.1 and cg_away >= 15 and sc_away <= sc_home and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⚽ +{sc_away}.5 Gol (FT) - Fora'
        
        elif (appmT >= 1.3 and cgT >= 17 and scT <= 0 and t1 and tempo_int <= 39):
            t = 't1'
            nome_estrategia = f'⚽ +{scT}.5 Gol (HT)'
        
        elif (appmT >= 1.1 and cgT >= 20 and scT <= 2 and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⚽ +{scT}.5 Gol (FT)'
        
        elif (appmT >= 1.3 and cgT >= 10 and t1 and tempo_int <= 41):
            t = 't1'
            nome_estrategia = f'⛳ + {cnT}.5 Canto(s) (HT)'
        
        elif (appmT >= 1.1 and cgT >= 20 and t2 and tempo_int <= 87):
            t = 't2'
            nome_estrategia = f'⛳ + {cnT}.5 Canto(s) (FT)'
        
        elif (appm_home >= 1.3 and cg_home >= 10 and sc_home <= sc_away and On_Target_Home + Off_Target_Home > On_Target_Away + Off_Target_Away and t1 and tempo_int <= 37):
            t = 't1'
            nome_estrategia = f'⛳ + {cn_h +1}.5 Canto(s) (HT) - Casa'
        
        elif (appm_away >= 1.3 and cg_away >= 10 and sc_away <= sc_home and On_Target_Away + Off_Target_Away > On_Target_Home + Off_Target_Home and t1 and tempo_int <= 37):
            t = 't1'
            nome_estrategia = f'⛳ + {cn_a +1}.5 Canto(s) (HT) - Fora'
        
        elif (appm_home >= 1.1 and cg_home >= 15 and sc_home <= sc_away and On_Target_Home + Off_Target_Home > On_Target_Away + Off_Target_Away and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⛳ + {cn_h +1}.5 Canto(s) (FT) - Casa'
        
        elif (appm_away >= 1.1 and cg_away >= 15 and sc_away <= sc_home and On_Target_Away + Off_Target_Away > On_Target_Home + Off_Target_Home and t2 and tempo_int <= 85):
            t = 't2'
            nome_estrategia = f'⛳ + {cn_a +1}.5 Canto(s) (FT) - Fora'
        
        if nome_estrategia:
            # Formata o link para Bet365
            convert_nome = Home.replace(" ", "+")
            link_bet365 = f"https://www.bet365.com/#/AX/K%5E{convert_nome}/"
            
            # Monta a mensagem de alerta
            text = f"""
<b>{nome_estrategia}</b>

🏆 <b>{liga}</b> (🌍 {Pais})  
🔰 <b>{Home}</b> x <b>{Away}</b>  
⏳ <i>Tempo: {tempo} min</i>

📊 <b>Estatísticas (Casa 🆚 Fora)</b>  
🥅 Gols: <b>{Gols_Home}</b> - <b>{Gols_Away}</b>  
📈 EXG: {expected_goals_casa} - {expected_goals_visitante}  
🔥 Ataques Perigosos: {Atp_Perigosos_Home} - {Atp_Perigosos_Away}  
🎯 Chutes no Gol: {On_Target_Home} - {On_Target_Away} | ⛔ Fora do Gol: {Off_Target_Home} - {Off_Target_Away}  
⛳️ Escanteios: {Escanteios_Home} - {Escanteios_Away}  
⚽️ Posse de Bola: {Possession_Home}% - {Possession_Away}%  
🟨 Amarelos: {Yellow_Card_Home} - {Yellow_Card_Away} | 🟥 Vermelhos: {Red_Card_Home} - {Red_Card_Away}

🔗 <a href='{link_bet365}'><b>Bet365</b></a>
"""
            bot.send_message(chat_id=chat_id, text=text, parse_mode="html", disable_web_page_preview=True)
            jogos_enviados.add(jogo_id)

    return game_metrics

if __name__ == "__main__":
    while True:
        game_metrics = main()
        print("Aguardando próximo loop...")
        time.sleep(120)