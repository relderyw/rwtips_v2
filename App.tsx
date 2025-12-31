
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HistoryMatch, LiveEvent, Prediction, LeagueStats, PlayerStats } from './types';
import { calculatePlayerStats, getH2HStats, analyzeMatchPotential, calculateLeagueStats, getLeagueInfo, normalize } from './services/analyzer';
import { LiveMatchCard } from './components/LiveMatchCard';
import { LeagueThermometer } from './components/LeagueThermometer';
import { fetchHistoryGames, fetchLiveGames, loginDev3 } from './services/api';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { checkSession, logout as firebaseLogout, auth, db, firebaseInstance } from './services/firebase';
import { sendTelegramAlert } from './services/telegram';
import { BankrollManager } from './components/Bankroll/BankrollManager';
import { H2HSearch } from './components/H2HSearch';
import { StrategyHistory } from './components/StrategyHistory';

interface GoalNotification {
  id: string;
  match: string;
  score: string;
  time: string;
}

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  all: "Monitoramento global de todos os confrontos em tempo real.",
  ht_pro: "HT PRO SNIPER: Ambos os jogadores com 100% de Over 0.5 HT nos últimos jogos e média de gols elevada no 1º tempo.",
  ft_pro: "FT PRO ENGINE: Média ponderada de 100% Over 2.5 FT e alta frequência de gols combinada.",
  btts_pro_ht: "BTTS HT PRO: Ambos jogadores com média >= 2.0 gols e alta taxa de 'Ambas Marcam' no HT.",
  casa_pro: "CASA DOMINANTE: Jogador mandante com taxa de vitória superior a 65% contra visitante em baixa.",
  fora_pro: "FORA DOMINANTE: Jogador visitante com taxa de vitória superior a 65% contra mandante em baixa.",
  casa_engine_pro: "CASA ENGINE PRO: Mandante com ataque massivo vs Visitante com sistema defensivo vulnerável.",
  fora_engine_pro: "FORA ENGINE PRO: Visitante com ataque massivo vs Mandante com sistema defensivo vulnerável.",
  top_clash: "ELITE CLASH: Confronto de alto nível onde ambos os jogadores possuem taxa de vitória acima de 50%."
};

const GoalToast: React.FC<{ notification: GoalNotification; onClose: (id: string) => void }> = ({ notification, onClose }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, interval);

    const closeTimer = setTimeout(() => {
      onClose(notification.id);
    }, duration);

    return () => {
      clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [notification.id, onClose]);

  return (
    <div className="w-full max-w-[280px] bg-[#0c0c0e]/95 border border-emerald-500/40 rounded-2xl p-3 shadow-2xl pointer-events-auto backdrop-blur-2xl z-[1000] notification-anim overflow-hidden relative group">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/40 animate-goal-pulse">
            <i className="fa-solid fa-futbol text-white animate-spin-slow"></i>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[7px] font-black rounded uppercase tracking-wider">GOAL</span>
            <span className="text-[9px] font-bold text-white/40 font-mono-numbers">{notification.time}'</span>
          </div>
          <p className="text-[11px] font-black text-white/90 truncate tracking-tight">{notification.match}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-2xl font-black text-white italic tabular-nums leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{notification.score}</p>
          </div>
        </div>

        <button onClick={() => onClose(notification.id)} className="text-white/20 hover:text-white/60 p-1 transition-all shrink-0">
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
        <div
          className="h-full bg-emerald-500 transition-all duration-75 linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => checkSession());
  const [isAdminView, setIsAdminView] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'radar' | 'thermometer' | 'bankroll' | 'h2h' | 'relatorios'>('radar');
  const [history, setHistory] = useState<HistoryMatch[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [notifications, setNotifications] = useState<GoalNotification[]>([]);
  const [nextUpdate, setNextUpdate] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  const [thermometerSampleSize, setThermometerSampleSize] = useState(15);
  const [viewingLeagueStats, setViewingLeagueStats] = useState<LeagueStats | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<LiveEvent | null>(null);
  const [h2hStats, setH2hStats] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const prevScores = useRef<Record<string, string>>({});
  const sentTelegramTips = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  const formatTimeStr = (date: Date) => date.toLocaleTimeString('pt-BR', { hour12: false });

  // --- LÓGICA DE DETECÇÃO DE LOGIN SIMULTÂNEO E HEARTBEAT ---
  useEffect(() => {
    let unsubscribe: any = null;
    let heartbeatInterval: any = null;

    if (isLoggedIn && !isAdminView) {
      const user = auth.currentUser;
      if (user) {
        // Listener de Sessão
        unsubscribe = db.collection('users').doc(user.uid).onSnapshot((doc: any) => {
          if (doc.exists) {
            const data = doc.data();
            const localSessionId = localStorage.getItem('activeSessionId');
            if (data.activeSessionId && localSessionId && data.activeSessionId !== localSessionId) {
              alert("Detectamos um novo acesso à sua conta em outro dispositivo. Esta sessão será encerrada.");
              handleLogout();
            }
          }
        });

        // Heartbeat para contar usuários online
        const updateHeartbeat = () => {
          db.collection('users').doc(user.uid).update({
            lastSeen: firebaseInstance.firestore.Timestamp.fromDate(new Date())
          }).catch(() => { });
        };

        updateHeartbeat();
        heartbeatInterval = setInterval(updateHeartbeat, 60000); // A cada 1 minuto
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isLoggedIn, isAdminView]);
  // ----------------------------------------------

  const initData = async () => {
    if (initRef.current) return;
    initRef.current = true;
    setIsLoadingData(true);
    try {
      const authData = await loginDev3();
      const [hist, live] = await Promise.all([
        authData ? fetchHistoryGames(40) : Promise.resolve([]),
        fetchLiveGames()
      ]);
      setHistory(hist || []);
      setLiveEvents(live || []);
      setLastSyncTime(formatTimeStr(new Date()));
      if (live) {
        live.forEach(g => prevScores.current[g.id] = `${g.score.home}-${g.score.away}`);
      }
    } catch (err) {
      console.error("RW TIPS: Erro inicial:", err);
    } finally {
      setIsLoadingData(false);
      initRef.current = false;
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      initData();
      const liveSyncInterval = setInterval(async () => {
        setIsSyncingLive(true);
        const live = await fetchLiveGames();
        if (live) {
          live.forEach(g => {
            const currentScore = `${g.score.home}-${g.score.away}`;
            if (prevScores.current[g.id] !== undefined && prevScores.current[g.id] !== currentScore) {
              const newNotif = {
                id: `${g.id}-${Date.now()}`,
                match: `${g.homePlayer} vs ${g.awayPlayer}`,
                score: currentScore,
                time: g.timer.formatted
              };
              setNotifications(prev => [newNotif, ...prev]);
            }
            prevScores.current[g.id] = currentScore;
          });
          setLiveEvents(live);
          setLastSyncTime(formatTimeStr(new Date()));
        }
        setIsSyncingLive(false);
        setNextUpdate(10);
      }, 10000);

      const countdownInterval = setInterval(() => {
        setNextUpdate(prev => Math.max(0, prev - 1));
      }, 1000);

      return () => {
        clearInterval(liveSyncInterval);
        clearInterval(countdownInterval);
      };
    }
  }, [isLoggedIn]);

  const leagueStats = useMemo(() => calculateLeagueStats(history, thermometerSampleSize), [history, thermometerSampleSize]);

  const availableLeagues = useMemo(() => {
    const leagues = new Set<string>();
    liveEvents.forEach(e => leagues.add(e.leagueName));
    return Array.from(leagues).sort();
  }, [liveEvents]);

  const analyzedLive = useMemo(() => {
    return liveEvents.map(event => {
      const analysis = analyzeMatchPotential(event.homePlayer, event.awayPlayer, history);
      return {
        event,
        potential: analysis.key,
        confidence: analysis.confidence,
        reasons: analysis.reasons
      };
    });
  }, [liveEvents, history]);

  useEffect(() => {
    if (analyzedLive.length > 0) {
      analyzedLive.forEach(({ event, potential, confidence }) => {
        if (potential !== 'none' && import.meta.env.VITE_TELEGRAM_CLIENT_SEND === 'true') {
          const tipKey = `${event.id}-${potential}`;
          if (!sentTelegramTips.current.has(tipKey)) {
            const p1Stats = calculatePlayerStats(event.homePlayer, history, 5);
            const p2Stats = calculatePlayerStats(event.awayPlayer, history, 5);

            const metrics = {
              ht05: (p1Stats.htOver05Rate + p2Stats.htOver05Rate) / 2,
              ft25: (p1Stats.ftOver25Rate + p2Stats.ftOver25Rate) / 2,
              ftBtts: (p1Stats.ftBttsRate + p2Stats.ftBttsRate) / 2
            };

            // Só envia se a confiança for >= 80 (ajustável)
            if (confidence >= 80) {
              sendTelegramAlert(event, potential, metrics, confidence);
              sentTelegramTips.current.add(tipKey);
              setTimeout(() => sentTelegramTips.current.delete(tipKey), 1000 * 60 * 120);
            }
          }
        }
      });
    }
  }, [analyzedLive, leagueStats]);

  const filterButtons = [
    { id: 'all', label: 'GERAL', icon: 'fa-globe' },
    { id: 'ht_pro', label: 'HT PRO', icon: 'fa-bolt' },
    { id: 'ft_pro', label: 'FT PRO', icon: 'fa-fire' },
    { id: 'btts_pro_ht', label: 'BTTS HT', icon: 'fa-arrows-rotate' },
    { id: 'casa_pro', label: 'CASA DOMINANTE', icon: 'fa-house-circle-check' },
    { id: 'fora_pro', label: 'FORA DOMINANTE', icon: 'fa-plane-arrival' },
    { id: 'casa_engine_pro', label: 'CASA ENGINE', icon: 'fa-gears' },
    { id: 'fora_engine_pro', label: 'FORA ENGINE', icon: 'fa-microchip' },
    { id: 'top_clash', label: 'ELITE CLASH', icon: 'fa-crown' }
  ];

  const strategyCounts = useMemo(() => {
    const counts: Record<string, number> = { all: liveEvents.length };
    filterButtons.forEach(f => {
      if (f.id !== 'all') {
        counts[f.id] = analyzedLive.filter(item => item.potential === f.id).length;
      }
    });
    return counts;
  }, [analyzedLive, liveEvents.length]);

  const filteredLive = useMemo(() => {
    return analyzedLive.filter(({ event, potential }) => {
      const matchesSearch = event.homePlayer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.awayPlayer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || potential === filter;
      const matchesLeague = selectedLeague === 'all' || event.leagueName === selectedLeague;
      return matchesSearch && matchesFilter && matchesLeague;
    });
  }, [analyzedLive, searchQuery, filter, selectedLeague]);

  const groupedMatches = useMemo(() => {
    const groups: Record<string, typeof filteredLive> = {};
    filteredLive.forEach(item => {
      const league = item.event.leagueName;
      if (!groups[league]) groups[league] = [];
      groups[league].push(item);
    });
    return groups;
  }, [filteredLive]);

  const handleAnalyze = async (match: LiveEvent) => {
    setSelectedMatch(match);
    setIsLoadingAnalysis(true);
    setH2hStats(null);
    try {
      const n1 = normalize(match.homePlayer);
      const n2 = normalize(match.awayPlayer);
      const count1 = history.filter(g => normalize(g.home_player) === n1 || normalize(g.away_player) === n1).length;
      const count2 = history.filter(g => normalize(g.home_player) === n2 || normalize(g.away_player) === n2).length;
      const syncLimit = Math.max(1, Math.min(count1, count2, 5));

      const homeS = calculatePlayerStats(match.homePlayer, history, syncLimit);
      const awayS = calculatePlayerStats(match.awayPlayer, history, syncLimit);
      const h2h = getH2HStats(match.homePlayer, match.awayPlayer, history);
      setH2hStats({ ...h2h, p1Stats: homeS, p2Stats: awayS, syncLimit });
    } catch (e) { console.error(e); }
    finally { setIsLoadingAnalysis(false); }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const isAnySyncing = isSyncingLive || isSyncingHistory;

  const handleLoginSuccess = (isAdmin: boolean = false) => {
    if (isAdmin) setIsAdminView(true);
    else setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setIsAdminView(false);
    setHistory([]);
    setLiveEvents([]);
    setNotifications([]);
    setSelectedMatch(null);
    setH2hStats(null);
    prevScores.current = {};
    localStorage.removeItem('activeSessionId');
    await firebaseLogout();
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-white selection:bg-emerald-500 selection:text-black`}>

      {!isLoggedIn && !isAdminView && <LoginScreen onLoginSuccess={handleLoginSuccess} />}
      {isAdminView && <AdminPanel onClose={() => setIsAdminView(false)} />}

      <div className={`${(!isLoggedIn && !isAdminView) ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'} transition-all duration-700`}>
        <div className="fixed top-6 right-6 z-[6000] flex flex-col gap-4 pointer-events-none">
          {notifications.map(n => (
            <GoalToast key={n.id} notification={n} onClose={removeNotification} />
          ))}
        </div>

        <header className="px-6 py-4 border-b border-white/[0.03] bg-black/95 backdrop-blur-3xl sticky top-0 z-[1000] shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 bg-gradient-to-br from-[#111] to-[#000] rounded-xl flex items-center justify-center shadow-2xl border transition-all duration-500 overflow-hidden group ${isAnySyncing ? 'border-amber-500 animate-pulse shadow-amber-500/20' : 'border-emerald-500 shadow-emerald-500/20'}`}>
                <img src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png" alt="👑RW" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div>
                <h1 className="text-lg font-black italic tracking-tighter text-white leading-none">👑RW  <span className="text-emerald-500"> TIPS🎮</span></h1>
                <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.3em] mt-1.5">{isAnySyncing ? 'Sincronizando...' : 'Conectado'}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <nav className="flex bg-white/[0.02] p-1 rounded-xl border border-white/5 shadow-inner">
                <button onClick={() => setActiveMainTab('radar')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${activeMainTab === 'radar' ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/30 hover:text-white/60'}`}>Radar Live</button>
                <button onClick={() => setActiveMainTab('thermometer')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${activeMainTab === 'thermometer' ? 'bg-white text-black shadow-2xl scale-105' : 'text-white/30 hover:text-white/60'}`}>Termômetro</button>
                <button onClick={() => setActiveMainTab('bankroll')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${activeMainTab === 'bankroll' ? 'bg-emerald-500 text-black shadow-2xl scale-105' : 'text-white/30 hover:text-emerald-500'}`}>Gestão de Banca</button>
                <button onClick={() => setActiveMainTab('h2h')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${activeMainTab === 'h2h' ? 'bg-indigo-500 text-white shadow-2xl scale-105' : 'text-white/30 hover:text-indigo-500'}`}>H2H PRO</button>
                <button onClick={() => setActiveMainTab('relatorios')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all duration-300 ${activeMainTab === 'relatorios' ? 'bg-rose-500 text-white shadow-2xl scale-105' : 'text-white/30 hover:text-rose-500'}`}>Relatórios</button>
              </nav>
              {(isLoggedIn || isAdminView) && (
                <button onClick={handleLogout} className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center hover:bg-rose-500/20 transition-all active:scale-95 group">
                  <i className="fa-solid fa-power-off text-rose-500 text-xs group-hover:scale-110 transition-transform"></i>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {isLoadingData ? (
            <div className="flex flex-col items-center gap-10 py-48">
              <div className="w-12 h-12 border-[2px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.8em]">Sincronizando Banco de Dados...</p>
            </div>
          ) : activeMainTab === 'radar' ? (
            <>
              <div className="max-w-7xl mx-auto mb-10 space-y-6">
                <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/[0.01] p-4 rounded-[2.5rem] border border-white/[0.05] backdrop-blur-3xl shadow-2xl">
                  <div className="relative group flex-1 w-full">
                    <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-white/10 text-base"></i>
                    <input
                      type="text"
                      placeholder="BUSCAR JOGADOR..."
                      className="w-full bg-white/[0.01] border border-white/[0.06] rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none focus:border-emerald-500/30 focus:bg-white/[0.03] transition-all placeholder:text-white/10 uppercase tracking-widest shadow-inner"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative w-full lg:w-72">
                    <select
                      value={selectedLeague}
                      onChange={(e) => setSelectedLeague(e.target.value)}
                      className="w-full bg-black border border-white/[0.06] rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] outline-none appearance-none cursor-pointer focus:border-emerald-500/30 transition-all text-white/60 shadow-lg"
                    >
                      <option value="all">🌐 TODAS AS LIGAS</option>
                      {availableLeagues.map(l => (
                        <option key={l} value={l}>{getLeagueInfo(l).name}</option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-white/10 pointer-events-none"></i>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 justify-center py-2">
                  {filterButtons.map(f => {
                    const count = strategyCounts[f.id] || 0;
                    const hasMatches = count > 0;
                    const isActive = filter === f.id;
                    return (
                      <div key={f.id} className="tooltip-trigger">
                        <button
                          onClick={() => setFilter(f.id)}
                          className={`relative px-4 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 border transition-all duration-500 ${isActive ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg scale-105' : hasMatches ? 'bg-transparent border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)] hover:bg-emerald-500/5' : 'bg-transparent border-white/5 text-white/30 hover:text-white hover:bg-white/5'}`}
                        >
                          <i className={`fa-solid ${f.icon} text-[11px]`}></i> {f.label}
                          {hasMatches && (
                            <span className={`flex items-center justify-center min-w-[16px] h-[16px] px-1.5 rounded-full text-[8px] font-black border ${isActive ? 'bg-black text-emerald-500 border-emerald-400' : 'bg-emerald-500 text-black border-white/10 shadow-lg animate-pulse'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                        <div className="tooltip-content bg-[#0a0a0c]/95 border border-white/10 p-4 rounded-2xl w-56 shadow-2xl text-[10px] font-bold text-white/80 uppercase leading-relaxed tracking-wider backdrop-blur-3xl">
                          {STRATEGY_DESCRIPTIONS[f.id]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-16">
                {Object.keys(groupedMatches).length > 0 ? (Object.entries(groupedMatches) as [string, any[]][]).map(([leagueName, matches]) => {
                  const lInfo = getLeagueInfo(leagueName);
                  return (
                    <section key={leagueName} className="space-y-6">
                      <div className="flex items-center gap-4 border-b border-white/[0.04] pb-3 px-2">
                        <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: lInfo.color }}></div>
                        <h3 className="text-sm font-black italic uppercase text-white/80 tracking-tight">{lInfo.name}</h3>
                        <div className="h-4 w-px bg-white/5 mx-2"></div>
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em]">{matches.length} CONFRONTOS ATIVOS</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.map(({ event, potential, confidence, reasons }: any) => (
                          <LiveMatchCard
                            key={event.id}
                            match={event}
                            potential={potential}
                            confidence={confidence}
                            reasons={reasons}
                            historicalGames={history}
                            onDetailClick={handleAnalyze}
                          />
                        ))}
                      </div>
                    </section>
                  );
                }) : (
                  <div className="py-56 text-center opacity-10">
                    <i className="fa-solid fa-satellite-dish text-5xl mb-6 animate-pulse"></i>
                    <p className="text-[10px] font-black uppercase tracking-[1.5em]">Buscando Oportunidades... </p>
                  </div>
                )}
              </div>
            </>
          ) : activeMainTab === 'bankroll' ? (
            <BankrollManager userEmail={auth.currentUser?.email || ''} />
          ) : activeMainTab === 'h2h' ? (
            <H2HSearch />
          ) : activeMainTab === 'relatorios' ? (
            <StrategyHistory history={history} />
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white/[0.01] border border-white/[0.05] p-6 rounded-[2.5rem] backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black italic text-white tracking-tighter">TERMÔMETRO <span className="text-emerald-500">PRO</span></h3>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Amostragem dinâmica para cálculo de probabilidades por liga</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                  {[5, 10, 15, 20, 30, 40].map(size => (
                    <button
                      key={size}
                      onClick={() => setThermometerSampleSize(size)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-500 border ${thermometerSampleSize === size ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg scale-105' : 'text-white/20 border-transparent hover:text-white/40 hover:bg-white/5'}`}
                    >
                      Últimos {size}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Engine Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {leagueStats.map((stats, idx) => (
                  <LeagueThermometer
                    key={idx}
                    stats={stats}
                    onViewGames={(s) => setViewingLeagueStats(s)}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {viewingLeagueStats && (
        <div className="fixed inset-0 z-[6000] bg-black/95 flex items-center justify-center p-6 backdrop-blur-2xl">
          <div className="bg-[#08080a] w-full max-w-4xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">BASE DE DADOS: {getLeagueInfo(viewingLeagueStats.leagueName).name}</h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Últimos {viewingLeagueStats.sampleGames.length} jogos analisados para o termômetro</p>
              </div>
              <button onClick={() => setViewingLeagueStats(null)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scroll space-y-4">
              {viewingLeagueStats.sampleGames.map((game, i) => (
                <div key={i} className="bg-white/[0.01] border border-white/[0.03] p-5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.03] transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1">{new Date(game.data_realizacao).toLocaleString('pt-BR')}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white/90 truncate uppercase">{game.home_player}</span>
                      <span className="text-[10px] text-white/10 italic">vs</span>
                      <span className="text-sm font-bold text-white/90 truncate uppercase">{game.away_player}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0 px-6 border-l border-white/5 ml-4">
                    <div className="bg-black border border-white/10 px-4 py-1.5 rounded-xl">
                      <span className="textxl font-black italic tabular-nums">{game.score_home}-{game.score_away}</span>
                    </div>
                    <span className="text-[8px] font-black text-white/20 uppercase">HT: {game.halftime_score_home}-{game.halftime_score_away}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedMatch && h2hStats && (
        <div className="fixed inset-0 z-[5000] bg-black/98 flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl overflow-y-auto custom-scroll">
          <div className="bg-[#050505] w-full max-w-7xl my-auto rounded-[3.5rem] border border-white/10 relative overflow-hidden animate-in zoom-in-95 duration-500 shadow-[0_40px_100px_rgba(0,0,0,1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500"></div>

            <button onClick={() => setSelectedMatch(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:border-rose-400 text-white transition-all z-50 group">
              <i className="fa-solid fa-xmark text-lg group-hover:scale-110"></i>
            </button>

            <div className="p-8 md:p-16">
              <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-16">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mb-4 text-3xl shadow-2xl">🏠</div>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter mb-1 truncate w-full text-center">{selectedMatch.homePlayer}</h2>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em]">MANDANTE PRO</span>
                </div>
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full">
                    <span className="text-sm font-black text-white/20 italic tracking-[0.3em]">VERSUS</span>
                  </div>
                </div>
                <div className="flex flex-col items-center flex-1 min-w-0">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center mb-4 text-3xl shadow-2xl">🚀</div>
                  <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white tracking-tighter mb-1 truncate w-full text-center">{selectedMatch.awayPlayer}</h2>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.5em]">VISITANTE PRO</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-8 space-y-10">

                  <div className="bg-[#0a0a0c] p-10 rounded-[3rem] border border-white/10 shadow-inner">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.5em]">Probabilidades H2H (Histórico Direto)</h3>
                      {h2hStats.syncLimit < 5 && (
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                          <i className="fa-solid fa-triangle-exclamation"></i> DADOS ADAPTADOS PARA {h2hStats.syncLimit} JOGOS (AMOSTRAGEM REDUZIDA)
                        </span>
                      )}
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold text-white/30 uppercase tracking-widest">{h2hStats.count} JOGOS ANALISADOS</span>
                    </div>

                    <div className="grid grid-cols-3 gap-10">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-emerald-500 uppercase">Vitória Casa</span>
                          <span className="text-4xl font-mono-numbers font-black text-white">{h2hStats.p1WinProb.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${h2hStats.p1WinProb}%` }}></div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-amber-500 uppercase">Empate</span>
                          <span className="text-4xl font-mono-numbers font-black text-white">{h2hStats.drawProb.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-1000" style={{ width: `${h2hStats.drawProb}%` }}></div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-rose-500 uppercase">Vitória Fora</span>
                          <span className="text-4xl font-mono-numbers font-black text-white">{h2hStats.p2WinProb.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <div className="h-full bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)] transition-all duration-1000" style={{ width: `${h2hStats.p2WinProb}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0a0a0c] p-10 rounded-[3rem] border border-white/10 flex flex-col items-center">
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-6">Média Gols HT (H2H)</span>
                      <div className="flex items-center gap-6">
                        <span className="text-5xl font-mono-numbers font-black text-emerald-500 drop-shadow-lg">{h2hStats.p1AvgGoalsHT.toFixed(1)}</span>
                        <span className="text-2xl font-black text-white/10 italic">/</span>
                        <span className="text-5xl font-mono-numbers font-black text-indigo-500 drop-shadow-lg">{h2hStats.p2AvgGoalsHT.toFixed(1)}</span>
                      </div>
                      <p className="mt-6 text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Performance no Primeiro Tempo</p>
                    </div>
                    <div className="bg-[#0a0a0c] p-10 rounded-[3rem] border border-white/10 flex flex-col items-center">
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-6">Média Gols FT (H2H)</span>
                      <div className="flex items-center gap-6">
                        <span className="text-5xl font-mono-numbers font-black text-emerald-400 drop-shadow-lg">{h2hStats.p1AvgGoalsFT.toFixed(1)}</span>
                        <span className="text-2xl font-black text-white/10 italic">/</span>
                        <span className="text-5xl font-mono-numbers font-black text-indigo-400 drop-shadow-lg">{h2hStats.p2AvgGoalsFT.toFixed(1)}</span>
                      </div>
                      <p className="mt-6 text-[9px] font-bold text-white/20 uppercase tracking-widest italic">Performance na Partida Completa</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 flex flex-col gap-8 h-full">
                  <div className="bg-[#0a0a0c] p-8 rounded-[3rem] border border-white/10 flex-1 flex flex-col min-h-[500px]">
                    <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-5 text-center">Confrontos Recentes H2H</h3>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-3 custom-scroll">
                      {h2hStats.recentGames.length > 0 ? h2hStats.recentGames.map((game: HistoryMatch, i: number) => {
                        const isP1Winner = game.score_home > game.score_away;
                        const isP2Winner = game.score_away > game.score_home;
                        return (
                          <div key={i} className="flex flex-col p-5 bg-white/[0.01] rounded-3xl border border-white/[0.04] hover:bg-white/[0.03] transition-all group">
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-[10px] font-mono-numbers font-bold text-white/20">{new Date(game.data_realizacao).toLocaleDateString()}</p>
                              <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded">HT: {game.halftime_score_home}-{game.halftime_score_away}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className={`text-[11px] font-black uppercase flex-1 truncate ${isP1Winner ? 'text-white' : 'text-white/40'}`}>{game.home_player}</span>
                              <div className="flex items-center gap-3 shrink-0 px-4 py-2 bg-black rounded-2xl border border-white/5 shadow-2xl">
                                <span className={`text-xl font-mono-numbers font-black ${isP1Winner ? 'text-emerald-500' : 'text-white/60'}`}>{game.score_home}</span>
                                <span className="text-white/10 font-bold italic">-</span>
                                <span className={`text-xl font-mono-numbers font-black ${isP2Winner ? 'text-emerald-500' : 'text-white/60'}`}>{game.score_away}</span>
                              </div>
                              <span className={`text-[11px] font-black uppercase flex-1 text-right truncate ${isP2Winner ? 'text-white' : 'text-white/40'}`}>{game.away_player}</span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-5 py-20 text-center">
                          <i className="fa-solid fa-database text-4xl mb-4"></i>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em]">SEM DADOS H2H DISPONÍVEIS</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-10">
                <div className="bg-[#0a0a0c] p-10 rounded-[3rem] border border-white/10 flex flex-col min-h-[450px]">
                  <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                    <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] italic flex items-center gap-2">
                      Forma Individual: {selectedMatch.homePlayer}
                      {h2hStats.syncLimit < 5 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>}
                    </h3>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-lg uppercase tracking-widest">Últimos <span className={h2hStats.syncLimit < 5 ? 'text-amber-500' : ''}>{h2hStats.syncLimit || 5}</span> Jogos</span>
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-3 custom-scroll">
                    {h2hStats.p1Stats?.lastMatches?.map((game: any, i: number) => {
                      const isWinner = game.targetScore > game.opponentScore;
                      const isDraw = game.targetScore === game.opponentScore;
                      return (
                        <div key={i} className="flex flex-col p-5 bg-white/[0.01] rounded-3xl border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] font-mono-numbers font-bold text-white/20">{new Date(game.data_realizacao).toLocaleDateString()}</p>
                              {/* HT Score fix: Always Home x Away to match the names below */}
                              <span className="px-2 py-0.5 bg-black/60 text-emerald-500 text-[8px] font-black rounded border border-white/5 uppercase tracking-tighter shadow-xl">HT: {game.halftime_score_home}-{game.halftime_score_away}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isWinner ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isDraw ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                              {isWinner ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-[11px] font-black uppercase flex-1 truncate ${normalize(game.home_player) === normalize(selectedMatch.homePlayer) ? 'text-white' : 'text-white/40'}`}>{game.home_player}</span>
                            <div className="flex items-center gap-3 shrink-0 px-4 py-1.5 bg-black/60 rounded-xl border border-white/5">
                              <span className="text-sm font-mono-numbers font-black text-white">{game.score_home}</span>
                              <span className="text-[10px] text-white/10">x</span>
                              <span className="text-sm font-mono-numbers font-black text-white">{game.score_away}</span>
                            </div>
                            <span className={`text-[11px] font-black uppercase flex-1 text-right truncate ${normalize(game.away_player) === normalize(selectedMatch.homePlayer) ? 'text-white' : 'text-white/40'}`}>{game.away_player}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-[#0a0a0c] p-10 rounded-[3rem] border border-white/10 flex flex-col min-h-[450px]">
                  <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                    <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em] italic flex items-center gap-2">
                      Forma Individual: {selectedMatch.awayPlayer}
                      {h2hStats.syncLimit < 5 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>}
                    </h3>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black rounded-lg uppercase tracking-widest">Últimos <span className={h2hStats.syncLimit < 5 ? 'text-amber-500' : ''}>{h2hStats.syncLimit || 5}</span> Jogos</span>
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-3 custom-scroll">
                    {h2hStats.p2Stats?.lastMatches?.map((game: any, i: number) => {
                      const isWinner = game.targetScore > game.opponentScore;
                      const isDraw = game.targetScore === game.opponentScore;
                      return (
                        <div key={i} className="flex flex-col p-5 bg-white/[0.01] rounded-3xl border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] font-mono-numbers font-bold text-white/20">{new Date(game.data_realizacao).toLocaleDateString()}</p>
                              {/* HT Score fix: Always Home x Away to match the names below */}
                              <span className="px-2 py-0.5 bg-black/60 text-emerald-500 text-[8px] font-black rounded border border-white/5 uppercase tracking-tighter shadow-xl">HT: {game.halftime_score_home}-{game.halftime_score_away}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isWinner ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isDraw ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                              {isWinner ? 'Vitória' : isDraw ? 'Empate' : 'Derrota'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className={`text-[11px] font-black uppercase flex-1 truncate ${normalize(game.home_player) === normalize(selectedMatch.awayPlayer) ? 'text-white' : 'text-white/40'}`}>{game.home_player}</span>
                            <div className="flex items-center gap-3 shrink-0 px-4 py-1.5 bg-black/60 rounded-xl border border-white/5">
                              <span className="text-sm font-mono-numbers font-black text-white">{game.score_home}</span>
                              <span className="text-[10px] text-white/10">x</span>
                              <span className="text-sm font-mono-numbers font-black text-white">{game.score_away}</span>
                            </div>
                            <span className={`text-[11px] font-black uppercase flex-1 text-right truncate ${normalize(game.away_player) === normalize(selectedMatch.awayPlayer) ? 'text-white' : 'text-white/40'}`}>{game.away_player}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
