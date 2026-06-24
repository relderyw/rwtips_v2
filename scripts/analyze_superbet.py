import urllib.request, json, brotli

url = 'https://superbet-gaming-production.global.ssl.fastly.net/provider-socket/public/api/br/v2/state'
req = urllib.request.Request(url, headers={
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://superbet.bet.br',
    'Referer': 'https://superbet.bet.br/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'x-client-identifier': 'web.gaming/gaming-bff/live-stats',
})
resp = urllib.request.urlopen(req)
raw = brotli.decompress(resp.read())
data = json.loads(raw)

print(f'Total de itens: {len(data)}')
print(f'Keys do primeiro item: {list(data[0].keys())}')
print()

# Contar por tipo
types = {}
for item in data:
    t = item.get('gameType', '?')
    types[t] = types.get(t, 0) + 1
print('Tipos de jogo:')
for t, c in sorted(types.items(), key=lambda x: -x[1]):
    print(f'  {t}: {c}')
print()

# Pegar roletas
roulettes = [x for x in data if 'roulette' in str(x.get('gameType','')).lower()]
print(f'Roletas encontradas: {len(roulettes)}')
print()

for r in roulettes:
    rid = r.get('id', '?')
    name = r.get('name', '?')
    # Tentar achar resultados em diferentes campos possíveis
    lr = (r.get('lastResults') or r.get('results') or 
          r.get('roundHistory') or r.get('history') or 
          r.get('drawResults') or [])
    extra_keys = [k for k in r.keys() if k not in ['id','name','gameType']]
    print(f'  [{rid}] {name}')
    print(f'    results_field: {len(lr)} | all_keys: {extra_keys}')

print()
print('=== AMOSTRA DO PRIMEIRO ITEM ROULETTE (JSON) ===')
if roulettes:
    print(json.dumps(roulettes[0], indent=2, ensure_ascii=False)[:2000])

# Verificar se tem Roleta Brasileira
brasil = [x for x in data if 'brasil' in str(x.get('name','')).lower() or 'brazili' in str(x.get('name','')).lower()]
print()
print(f'Roletas com "brasil": {len(brasil)}')
for b in brasil:
    print(f'  {b.get("id")} | {b.get("name")} | type: {b.get("gameType")}')
