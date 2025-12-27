
import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { dbModular as db } from '../../services/firebase'; // Updated import
import { Bet, BetResult, ChartDataPoint, Market, Bankroll } from './types';
import { SummaryCard } from './components/SummaryCard';
import { BetChart } from './components/BetChart';
import {
  Trophy,
  Wallet,
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  LayoutDashboard,
  Settings,
  Coins,
  RefreshCw,
  Save,
  Pencil,
  ChevronDown,
  X,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react';

interface Category {
  id: string;
  nome: string;
  order: number;
  expanded?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Categorias de Mercados Padrão (Seed)
const DEFAULT_CATEGORIES = [
  { nome: 'GOLS HT', order: 1 },
  { nome: 'GOLS FT', order: 2 },
  { nome: 'AMBAS', order: 3 },
  { nome: 'ML JOGADORES', order: 4 },
  { nome: 'WIN JOGADOR', order: 5 },
  { nome: 'DUTCHING', order: 6 },
  { nome: 'OUTROS', order: 7 }
];

// Mapeamento de ligas da API para o sistema
const mapLeagueName = (apiName: string) => {
  if (apiName.includes("8 mins") && apiName.includes("H2H")) return "Battle 8 min (H2H)";
  if (apiName.includes("6 mins")) return "Battle 6 min";
  if (apiName.includes("8 mins")) return "Battle 8 min";
  if (apiName.includes("10 mins")) return "Adriact 10 min";
  if (apiName.includes("12 mins")) return "GT 12 min";
  return "Outro";
};

const extractPlayerName = (text: string) => {
  const match = text.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : text.trim();
};

const initialFormState = {
  liga: '',
  jogador1: '',
  jogador2: '',
  mercado: '',
  stake: '',
  odds: '',
  resultado: 'aguardando' as BetResult
};

interface BankrollManagerProps {
  userEmail: string;
}

export const BankrollManager: React.FC<BankrollManagerProps> = ({ userEmail }) => {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'new-bet' | 'markets' | 'settings'>('dashboard');
  const [isLeagueStatsOpen, setIsLeagueStatsOpen] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketCategories, setMarketCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Config State
  const [bankrolls, setBankrolls] = useState<Bankroll[]>([]);
  const [activeBankrollId, setActiveBankrollId] = useState<string>('');
  const [configLoading, setConfigLoading] = useState(false);
  
  // Initialize Categories
  useEffect(() => {
    if (!userEmail) return;
    
    const q = query(collection(db, 'categorias_mercado'), where('userEmail', '==', userEmail), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Seed default categories
        DEFAULT_CATEGORIES.forEach(async (cat, index) => {
          await addDoc(collection(db, 'categorias_mercado'), {
            userEmail,
            nome: cat.nome,
            order: cat.order,
            timestamp: serverTimestamp()
          });
        });
      } else {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        // Maintain local expanded state if possible, or default to false
        setMarketCategories(prev => {
            const openIds = new Set(prev.filter(c => c.expanded).map(c => c.id));
            return cats.map(c => ({...c, expanded: openIds.has(c.id)}));
        });
      }
    });
    return () => unsubscribe();
  }, [userEmail]);

  const toggleCategory = (id: string) => {
    setMarketCategories(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  };
  
  // Local state for editing
  const [localInitialBankroll, setLocalInitialBankroll] = useState(1000);
  const [localUnitValue, setLocalUnitValue] = useState(100);
  
  // Computed active bankroll
  const activeBankroll = useMemo(() => 
    bankrolls.find(b => b.id === activeBankrollId) || bankrolls[0], 
  [bankrolls, activeBankrollId]);

  // Sync local state when active bankroll changes
  useEffect(() => {
    if (activeBankroll) {
      setLocalInitialBankroll(activeBankroll.initialCapital);
      setLocalUnitValue(activeBankroll.unitValue);
    }
  }, [activeBankroll]);

  // Derived values from active bankroll (for stats)
  const initialBankroll = activeBankroll?.initialCapital || 1000;
  const unitValue = activeBankroll?.unitValue || 100;
  
  // Players Cache
  const [playersCache, setPlayersCache] = useState<Record<string, Set<string>>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Form State
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCategory, setNewMarketCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isMarketOptionsOpen, setIsMarketOptionsOpen] = useState(false);

  // Set initial category when categories load
  useEffect(() => {
    if (marketCategories.length > 0 && !newMarketCategory) {
      setNewMarketCategory(marketCategories[0].nome);
    }
  }, [marketCategories]);

  // --- Realtime Listeners ---
  
  // 1. Bets Listener
  useEffect(() => {
    if (!userEmail) return;
    setLoading(true);

    const q = query(
      collection(db, 'apostas'),
      where('userEmail', '==', userEmail),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bet[];
      setBets(fetchedBets);
      setLoading(false);
    }, (error) => {
      console.error("Error watching bets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  // 2. Markets Listener
  useEffect(() => {
    const q = collection(db, 'mercados');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMarkets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Market[];
      
      // Sort by category then name
      fetchedMarkets.sort((a, b) => {
        if (a.categoria === b.categoria) {
          return a.nome.localeCompare(b.nome);
        }
        return (a.categoria || '').localeCompare(b.categoria || '');
      });
      
      setMarkets(fetchedMarkets);
    });

    return () => unsubscribe();
  }, []);

  // 4. Market Categories Listener (carrega do Firebase)
  useEffect(() => {
    const q = collection(db, 'categorias');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      
      if (fetchedCategories.length > 0) {
        // Sort client-side to handle missing 'order' fields safely
        fetchedCategories.sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return a.nome.localeCompare(b.nome);
        });
        setMarketCategories(fetchedCategories);
      } else {
        // Fallback: This usually shouldn't happen if initialized, but for safety
        const defaultCats = DEFAULT_CATEGORIES.map((cat, index) => ({
          id: `default_${index}`,
          nome: cat.nome,
          order: cat.order
        }));
        setMarketCategories(defaultCats);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Bankrolls Listener & Migration
  useEffect(() => {
    if (!userEmail) return;
    setConfigLoading(true);

    const q = query(collection(db, 'bankrolls'), where('userEmail', '==', userEmail));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedBankrolls = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Bankroll[];

      if (fetchedBankrolls.length > 0) {
        setBankrolls(fetchedBankrolls);
        // If no active bankroll selected, select the first one (or default)
        if (!activeBankrollId) {
          const defaultBankroll = fetchedBankrolls.find(b => b.isDefault) || fetchedBankrolls[0];
          setActiveBankrollId(defaultBankroll.id!);
        }
      } else {
        // MIGRATION: No bankrolls found, create default from user config
         try {
           const newBankroll: Bankroll = {
             name: "Principal",
             initialCapital: 1000, 
             unitValue: 100,
             userEmail,
             isDefault: true
           };
           
           const docRef = await addDoc(collection(db, 'bankrolls'), newBankroll);
           setActiveBankrollId(docRef.id);
        } catch (e) {
          console.error("Error creating default bankroll:", e);
        }
      }
      setConfigLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  // --- API Integration ---
  const fetchPlayersFromAPI = async () => {
    setLoadingPlayers(true);
    try {
      const response = await fetch('https://api.green365.com.br/api/events/ended?sport_id=4&competition_id=&page=1');
      const data = await response.json();

      if (data && data.data) {
        const newCache: Record<string, Set<string>> = {};

        data.data.forEach((match: any) => {
          const league = mapLeagueName(match.leagueName);
          if (league !== "Outro") {
            if (!newCache[league]) newCache[league] = new Set();
            if (match.home) newCache[league].add(extractPlayerName(match.home));
            if (match.away) newCache[league].add(extractPlayerName(match.away));
          }
        });
        setPlayersCache(newCache);
      }
    } catch (error) {
      console.error("Erro ao buscar jogadores:", error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  // Trigger API fetch on load
  useEffect(() => {
    fetchPlayersFromAPI();
  }, []);

  // --- Handlers ---

  const handleUpdateBankroll = async (id: string, data: Partial<Bankroll>) => {
    try {
      await setDoc(doc(db, 'bankrolls', id), data, { merge: true });
      alert('Configurações atualizadas!');
    } catch (error) {
      console.error("Error updating bankroll:", error);
      alert("Erro ao atualizar.");
    }
  };

  const handleCreateBankroll = async (name: string, initial: number, unit: number) => {
    try {
      const newBankroll: Bankroll = {
        name,
        initialCapital: initial,
        unitValue: unit,
        userEmail
      };
      const docRef = await addDoc(collection(db, 'bankrolls'), newBankroll);
      setActiveBankrollId(docRef.id); // Switch to new bankroll
      alert(`Banca "${name}" criada com sucesso!`);
    } catch (error) {
      console.error("Error creating bankroll:", error);
      alert("Erro ao criar banca.");
    }
  };

  const startEditing = (bet: Bet) => {
    setFormData({
      liga: bet.liga,
      jogador1: bet.jogador1,
      jogador2: bet.jogador2,
      mercado: bet.mercado,
      stake: bet.stake.toString(),
      odds: bet.odds.toString(),
      resultado: bet.resultado
    });
    setEditingId(bet.id || null);
    setActiveTab('new-bet');
  };

  const copyBet = (bet: Bet) => {
    setFormData({
      liga: bet.liga,
      jogador1: bet.jogador1,
      jogador2: bet.jogador2,
      mercado: bet.mercado,
      stake: bet.stake.toString(),
      odds: bet.odds.toString(),
      resultado: 'aguardando' as BetResult
    });
    setEditingId(null); // Não é edição, é uma nova aposta
    setActiveTab('new-bet');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleBetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.liga || !formData.jogador1 || !formData.mercado || !formData.stake || !formData.odds) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const betData: any = {
        liga: formData.liga,
        jogador1: formData.jogador1,
        jogador2: formData.jogador2 || '',
        mercado: formData.mercado,
        stake: parseFloat(formData.stake.toString().replace(',', '.')),
        odds: parseFloat(formData.odds.toString().replace(',', '.')),
        resultado: formData.resultado,
        userEmail,
        bankrollId: activeBankrollId
      };

      // Only add timestamp for new bets
      if (!editingId) {
        betData.timestamp = serverTimestamp();
      }

      if (editingId) {
        // Use updateDoc for edits to avoid listener conflicts
        await updateDoc(doc(db, 'apostas', editingId), betData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'apostas'), betData);
      }
      
      setFormData(initialFormState);
      setActiveTab('dashboard');
    } catch (error: any) {
      console.error("Error saving bet:", error);
      alert(`Erro ao salvar aposta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteBet = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Tem certeza que deseja excluir esta aposta permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'apostas', id));
      } catch (error) {
        console.error("Erro ao excluir aposta:", error);
        alert("Erro ao excluir aposta.");
      }
    }
  };

  const handleUpdateResult = async (id: string, newResult: BetResult) => {
    try {
      const betRef = doc(db, 'apostas', id);
      await setDoc(betRef, { resultado: newResult }, { merge: true });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketName) return;
    try {
      await addDoc(collection(db, 'mercados'), {
        nome: newMarketName,
        categoria: newMarketCategory,
        userEmail,
        timestamp: serverTimestamp()
      });
      setNewMarketName('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteMarket = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm('Remover este mercado?')) {
      try {
        await deleteDoc(doc(db, 'mercados', id));
      } catch (error) {
        console.error("Erro ao excluir mercado:", error);
        alert("Erro ao excluir mercado.");
      }
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === marketCategories.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const itemA = marketCategories[index];
    const itemB = marketCategories[targetIndex];

    try {
      await setDoc(doc(db, 'categorias', itemA.id), { order: targetIndex }, { merge: true });
      await setDoc(doc(db, 'categorias', itemB.id), { order: index }, { merge: true });
    } catch (error) {
      console.error("Error reordering categories:", error);
      alert("Erro ao reordenar categorias.");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    try {
      await addDoc(collection(db, 'categorias'), {
        nome: newCategoryName.trim(),
        order: marketCategories.length // Append to end
      });
      setNewCategoryName('');
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Erro ao adicionar categoria.");
    }
  };

  const handleToggleMarketVisibility = async (e: React.MouseEvent, market: Market) => {
    e.preventDefault();
    e.stopPropagation();
    if (!market.id) return;

    try {
      await setDoc(doc(db, 'mercados', market.id), { hidden: !market.hidden }, { merge: true });
    } catch (error) {
      console.error("Error toggling market visibility:", error);
    }
  };

  // --- Calculations & Filtering ---

  const calculateProfit = (stake: number, odds: number, result: BetResult) => {
    switch (result) {
      case 'green': return stake * (odds - 1);
      case 'red': return -stake;
      case 'meio-green': return (stake / 2) * (odds - 1);
      case 'meio-red': return -stake / 2;
      case 'reembolso': return 0;
      default: return 0;
    }
  };

  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      // Filter by Bankroll FIRST
      if (activeBankroll?.isDefault) {
         if (bet.bankrollId && bet.bankrollId !== activeBankrollId) return false;
      } else {
        if (bet.bankrollId !== activeBankrollId) return false;
      }
      
      if (!startDate && !endDate) return true;
      
      const betDate = bet.timestamp?.seconds ? new Date(bet.timestamp.seconds * 1000) : new Date();
      betDate.setHours(0,0,0,0);

      // Helper function to parse 'YYYY-MM-DD' as local midnight
      const parseLocal = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      };

      const start = startDate ? parseLocal(startDate) : null;
      const end = endDate ? parseLocal(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      if (start && betDate < start) return false;
      if (end && betDate > end) return false;

      return true;
    });
  }, [bets, startDate, endDate, activeBankrollId, activeBankroll]);

  const stats = useMemo(() => {
    let totalGain = 0;
    let totalLoss = 0;
    let greens = 0;
    let reds = 0;
    let refunds = 0;
    let pending = 0;

    filteredBets.forEach(bet => {
      const profit = calculateProfit(bet.stake, bet.odds, bet.resultado);
      if (profit > 0) {
        totalGain += profit;
        greens += (bet.resultado === 'meio-green' ? 0.5 : 1);
      } else if (profit < 0) {
        totalLoss += Math.abs(profit);
        reds += (bet.resultado === 'meio-red' ? 0.5 : 1);
      }
      
      if (bet.resultado === 'reembolso') refunds++;
      if (bet.resultado === 'aguardando') pending++;
    });

    const netBalance = totalGain - totalLoss;
    const roi = initialBankroll > 0 ? (netBalance / initialBankroll) * 100 : 0;
    const netUnits = unitValue > 0 ? (netBalance / unitValue) : 0;
    
    // Chart Data Generation (Filtered)
    const sortedBets = [...filteredBets].sort((a, b) => {
       const dateA = a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000) : new Date();
       const dateB = b.timestamp?.seconds ? new Date(b.timestamp.seconds * 1000) : new Date();
       return dateA.getTime() - dateB.getTime();
    });

    let runningBalance = initialBankroll; // Start from initial capital for the chart
    const chartData: ChartDataPoint[] = [];
    const dailyBalances: Record<string, number> = {};

    // Initial point
    const today = new Date();
    // chartData.push({ date: 'Início', balance: initialBankroll });

    // New Stats: Best League & Market
    const leagueProfits: Record<string, number> = {};
    const marketProfits: Record<string, number> = {};

    sortedBets.forEach(bet => {
      const profit = calculateProfit(bet.stake, bet.odds, bet.resultado);
      const dateObj = bet.timestamp?.seconds ? new Date(bet.timestamp.seconds * 1000) : new Date();
      const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      // We want running balance over time.
      // If multiple bets in same day, we aggregate their profits to that day's END balance
      // But simplifying: just add every bet to a detailed line might be better or aggregate by day.
      // Let's aggregate by day for smoother chart.
      
      if (!dailyBalances[dateStr]) dailyBalances[dateStr] = 0;
      dailyBalances[dateStr] += profit;

      // Aggregate for Best League/Market
      if (bet.liga) {
        leagueProfits[bet.liga] = (leagueProfits[bet.liga] || 0) + profit;
      }
      if (bet.mercado) {
        marketProfits[bet.mercado] = (marketProfits[bet.mercado] || 0) + profit;
      }
    });

    // Construct chart data strictly chronological
    // Note: The previous logic in dailyBalances was summing profits per day.
    // We need to accumulate them over previous days.
    
    let accumulatedBalance = initialBankroll;
    // Sort dates
    const sortedDates = Object.keys(dailyBalances).sort((a, b) => {
        const [d1, m1] = a.split('/').map(Number);
        const [d2, m2] = b.split('/').map(Number);
        return (m1 * 31 + d1) - (m2 * 31 + d2); // Approximate sort for DD/MM
    });

    sortedDates.forEach(date => {
        accumulatedBalance += dailyBalances[date];
        chartData.push({ date, balance: accumulatedBalance });
    });

    // Find Best League
    let bestLeague = { name: '-', profit: 0 };
    Object.entries(leagueProfits).forEach(([name, profit]) => {
      if (profit > bestLeague.profit) bestLeague = { name, profit };
    });

    // Find Best Market
    let bestMarket = { name: '-', profit: 0 };
    Object.entries(marketProfits).forEach(([name, profit]) => {
      if (profit > bestMarket.profit) bestMarket = { name, profit };
    });

    // Calculate Detailed League Stats
    const leagueStats = Object.entries(leagueProfits).map(([league, profit]) => {
      const leagueBets = sortedBets.filter(b => b.liga === league);
      const betsCount = leagueBets.length;
      const totalStaked = leagueBets.reduce((acc, b) => acc + b.stake, 0);
      const units = profit / (unitValue || 1);
      const roi = totalStaked > 0 ? (profit / totalStaked) * 100 : 0;
      
      let leagueGreens = 0;
      let leagueReds = 0;
      leagueBets.forEach(bet => {
        const profit = calculateProfit(bet.stake, bet.odds, bet.resultado);
        if (profit > 0) {
          leagueGreens += (bet.resultado === 'meio-green' ? 0.5 : 1);
        } else if (profit < 0) {
          leagueReds += (bet.resultado === 'meio-red' ? 0.5 : 1);
        }
      });
      
      return {
        name: league,
        betsCount,
        profit,
        units,
        roi,
        greens: leagueGreens,
        reds: leagueReds
      };
    }).sort((a, b) => b.units - a.units);

    return {
      totalGain,
      totalLoss,
      netBalance,
      roi,
      greens,
      reds,
      refunds,
      pending,
      netUnits,
      chartData,
      bestLeague,
      bestMarket,
      leagueStats
    };
  }, [filteredBets, unitValue, initialBankroll]);

  // --- RENDER ---

  // NOTE: This portion is heavily adapted to fit within `RWTIPS_V02` container
  // We remove the outer full-screen divs and assume this component is rendered inside the main layout
  
  // Error Handling State
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("BankrollManager mounted", { userEmail });
  }, [userEmail]);

  // Wrap async operations in try-catch and set error state
  useEffect(() => {
    try {
      if (!userEmail) return;
      setLoading(true);
      console.log("Setting up bets listener...");
      const q = query(
        collection(db, 'apostas'),
        where('userEmail', '==', userEmail),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`Bets snapshot received: ${snapshot.docs.length} docs`);
        const fetchedBets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Bet[];
        setBets(fetchedBets);
        setLoading(false);
      }, (error) => {
        console.error("Error watching bets:", error);
        setError(`Erro ao carregar apostas: ${error.message}`);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
        console.error("Critical error in Bets effect:", e);
        setError(`Erro crítico: ${e.message}`);
    }
  }, [userEmail]);

  if (error) {
      return (
          <div className="p-10 text-center">
              <h2 className="text-xl font-bold text-rose-500 mb-2">Erro no Gerenciador de Banca</h2>
              <p className="text-white/60">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 text-white"
              >
                Recarregar Página
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      
      {/* HEADER / TABS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.01] border border-white/[0.05] p-2 rounded-[2.5rem] backdrop-blur-3xl">
         <div className="flex bg-black/40 p-1.5 rounded-3xl border border-white/5 overflow-x-auto w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <LayoutDashboard size={14} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('new-bet')} 
              className={`px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new-bet' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Plus size={14} /> Nova Aposta
            </button>
            <button 
              onClick={() => setActiveTab('markets')} 
              className={`px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'markets' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Target size={14} /> Mercados
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-6 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              <Settings size={14} /> Configurações
            </button>
         </div>

         {/* BANKROLL SELECTOR */}
         <div className="relative group px-4">
             <div className="flex items-center gap-2 cursor-pointer">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <select 
                    value={activeBankrollId}
                    onChange={(e) => setActiveBankrollId(e.target.value)}
                    className="bg-transparent text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer appearance-none pr-4"
                 >
                    {bankrolls.map(b => (
                        <option key={b.id} value={b.id} className="bg-black text-white">{b.name}</option>
                    ))}
                 </select>
                 <ChevronDown size={12} className="text-white/40" />
             </div>
         </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
            {/* STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard 
                   title="Banca Atual" 
                   value={formatCurrency(initialBankroll + stats.netBalance)} 
                   icon={Wallet} 
                   color="emerald"
                   trend={stats.netBalance >= 0 ? 'up' : 'down'}
                   subtext={`Inicial: ${formatCurrency(initialBankroll)}`}
                />
                
                <SummaryCard 
                   title="Lucro Líquido" 
                   value={formatCurrency(stats.netBalance)} 
                   icon={Coins} 
                   color={stats.netBalance >= 0 ? 'emerald' : 'rose'}
                   trend={stats.netBalance >= 0 ? 'up' : 'down'}
                   subtext={`${stats.netUnits > 0 ? '+' : ''}${stats.netUnits.toFixed(2)}u`}
                />

                <SummaryCard 
                   title="ROI" 
                   value={`${stats.roi.toFixed(1)}%`} 
                   icon={Target} 
                   color={stats.roi >= 0 ? 'emerald' : 'rose'}
                   trend={stats.roi >= 0 ? 'up' : 'down'}
                   subtext={`${(stats.greens + stats.reds) > 0 ? ((stats.greens / (stats.greens + stats.reds)) * 100).toFixed(1) : 0}% Taxa`}
                />

                <SummaryCard 
                   title="Greens" 
                   value={stats.greens.toFixed(1)} 
                   icon={CheckCircle2} 
                   color="emerald"
                   subtext={`${stats.greens} vitórias`}
                />

                <SummaryCard 
                   title="Reds" 
                   value={stats.reds.toFixed(1)} 
                   icon={XCircle} 
                   color="rose"
                   subtext={`${stats.reds} derrotas`}
                />
            </div>

            {/* LEAGUE PERFORMANCE SECTION */}
            <div className="bg-[#0a0a0c] rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-300">
                <button 
                  onClick={() => setIsLeagueStatsOpen(!isLeagueStatsOpen)}
                  className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <Trophy size={18} className="text-emerald-500" />
                      <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">Desempenho por Liga</h3>
                   </div>
                   {isLeagueStatsOpen ? <ChevronDown size={18} className="text-white/40 rotate-180 transition-transform" /> : <ChevronDown size={18} className="text-white/40 transition-transform" />}
                </button>

                {isLeagueStatsOpen && (
                  <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                      <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="border-b border-white/5 bg-white/[0.02]">
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest">Liga</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Apostas</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Greens</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Reds</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Lucro (R$)</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-center">Unidades</th>
                                      <th className="p-4 text-[9px] font-black text-white/30 uppercase tracking-widest text-right">ROI</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {stats.leagueStats.map((stat) => (
                                      <tr key={stat.name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors last:border-0">
                                          <td className="p-4 text-xs font-bold text-white">{stat.name}</td>
                                          <td className="p-4 text-xs font-bold text-white/60 text-center">{stat.betsCount}</td>
                                          <td className="p-4 text-xs font-bold text-emerald-500 text-center">{stat.greens.toFixed(1)}</td>
                                          <td className="p-4 text-xs font-bold text-rose-500 text-center">{stat.reds.toFixed(1)}</td>
                                          <td className={`p-4 text-xs font-bold text-center ${stat.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stat.profit)}</td>
                                          <td className={`p-4 text-xs font-bold text-center ${stat.units >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.units > 0 ? '+' : ''}{stat.units.toFixed(2)}u</td>
                                          <td className={`p-4 text-xs font-bold text-right ${stat.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.roi.toFixed(1)}%</td>
                                      </tr>
                                  ))}
                                  {stats.leagueStats.length === 0 && (
                                     <tr>
                                        <td colSpan={7} className="p-8 text-center text-xs font-bold text-white/20 italic">
                                           Sem dados suficientes para exibir estatísticas por liga.
                                        </td>
                                     </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
                )}
            </div>

            {/* CHART & FILTERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Crescimento da Banca</h3>
                       <div className="flex gap-2">
                           {['7D', '30D', 'TD'].map(p => (
                               <button key={p} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-white/40 hover:text-white transition-all uppercase">{p}</button>
                           ))}
                       </div>
                    </div>
                    <BetChart data={stats.chartData} />
                </div>

                <div className="space-y-6">
                    {/* FILTERS CARD */}
                    <div className="bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5">
                        <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Filtros</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Data Inicial</label>
                                <input 
                                   type="date" 
                                   value={startDate} 
                                   onChange={(e) => setStartDate(e.target.value)}
                                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Data Final</label>
                                <input 
                                   type="date" 
                                   value={endDate} 
                                   onChange={(e) => setEndDate(e.target.value)}
                                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                            <button 
                               onClick={() => { setStartDate(''); setEndDate(''); }}
                               className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={12} /> Limpar Filtros
                            </button>
                        </div>
                    </div>

                    {/* QUICK STATS */}
                    <div className="bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5 flex flex-col gap-4">
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                           <span className="text-[10px] font-bold text-white/40 uppercase">Apostas Pendentes</span>
                           <span className="text-sm font-black text-white">{stats.pending}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-white/5">
                           <span className="text-[10px] font-bold text-white/40 uppercase">Reembolsos</span>
                           <span className="text-sm font-black text-white">{stats.refunds}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-white/40 uppercase">Volume Total</span>
                           <span className="text-sm font-black text-white">{formatCurrency(stats.totalGain + stats.totalLoss)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RECENT BETS LIST */}
            <div className="bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Histórico Recente</h3>
                   <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{filteredBets.length} REGISTROS</span>
                </div>
                
                <div className="space-y-3">
                   {filteredBets.slice(0, 50).map((bet) => (
                      <div key={bet.id} className="group relative flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-4 rounded-2xl transition-all">
                          
                          {/* Result Indicator */}
                          <div className={`w-1.5 h-12 rounded-full shrink-0 ${
                             bet.resultado === 'green' || bet.resultado === 'meio-green' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                             bet.resultado === 'red' || bet.resultado === 'meio-red' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' :
                             bet.resultado === 'reembolso' ? 'bg-amber-500' : 'bg-white/10'
                          }`}></div>

                          <div className="flex-1 w-full min-w-0 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                             <div>
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">
                                   {bet.timestamp?.seconds ? new Date(bet.timestamp.seconds * 1000).toLocaleDateString() : 'Hoje'}
                                </p>
                                <p className="text-xs font-bold text-white truncate">{bet.liga || 'Liga'}</p>
                             </div>
                             
                             <div className="md:col-span-2">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white/40 mb-1">
                                    <span>{bet.jogador1}</span>
                                    <span className="text-rose-500">vs</span>
                                    <span>{bet.jogador2}</span>
                                </div>
                                <p className="text-xs font-bold text-emerald-400 truncate">{bet.mercado}</p>
                             </div>

                             <div className="text-right">
                                 <p className="text-[10px] font-bold text-white/30 mb-0.5">ODD <span className="text-white">{bet.odds.toFixed(2)}</span></p>
                                 <p className="text-xs font-black text-white">{formatCurrency(bet.stake)}</p>
                             </div>

                             <div className="text-right">
                                 <p className="text-[10px] font-bold text-white/30 mb-0.5">Unit: <span className="text-white">{(bet.stake / unitValue).toFixed(2)}u</span></p>
                                 <p className={`text-xs font-black ${
                                   bet.resultado === 'green' || bet.resultado === 'meio-green' ? 'text-emerald-500' :
                                   bet.resultado === 'red' || bet.resultado === 'meio-red' ? 'text-rose-500' :
                                   'text-white/40'
                                 }`}>
                                   {(() => {
                                     const profit = calculateProfit(bet.stake, bet.odds, bet.resultado);
                                     const units = profit / unitValue;
                                     return units > 0 ? `+${units.toFixed(2)}u` : units < 0 ? `${units.toFixed(2)}u` : '0.00u';
                                   })()}
                                 </p>
                             </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 md:relative md:top-auto md:right-auto bg-black/80 md:bg-transparent rounded-lg p-1 md:p-0">
                             {bet.resultado === 'aguardando' && (
                                <>
                                  <button onClick={() => handleUpdateResult(bet.id!, 'green')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black transition-colors" title="Green">
                                     <CheckCircle2 size={14} />
                                  </button>
                                  <button onClick={() => handleUpdateResult(bet.id!, 'red')} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-black transition-colors" title="Red">
                                     <XCircle size={14} />
                                  </button>
                                </>
                             )}
                             <button onClick={() => startEditing(bet)} className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-colors">
                                <Pencil size={14} />
                             </button>
                             <button onClick={() => handleDeleteBet({ preventDefault: () => {}, stopPropagation: () => {} } as any, bet.id!)} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:bg-rose-500/20 hover:text-rose-500 transition-colors">
                                <Trash2 size={14} />
                             </button>
                          </div>
                      </div>
                   ))}
                </div>
            </div>
        </div>
      )}

      {activeTab === 'new-bet' && (
         <div className="max-w-2xl mx-auto bg-[#0a0a0c] border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-rose-500"></div>
             
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">
                   {editingId ? 'Editar Aposta' : 'Nova Aposta'}
                </h3>
                {editingId && (
                   <button onClick={cancelEditing} className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-2">
                      <X size={12} /> Cancelar
                   </button>
                )}
             </div>

             <form onSubmit={handleBetSubmit} className="space-y-6">
                
                {/* LIGA & MERCADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Liga</label>
                      <select 
                         value={formData.liga}
                         onChange={(e) => setFormData({...formData, liga: e.target.value})}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                      >
                         <option value="">SELECIONE...</option>
                         <option value="Battle 8 min">Battle 8 min</option>
                         <option value="Battle 6 min">Battle 6 min</option>
                         <option value="Adriact 10 min">Adriact 10 min</option>
                         <option value="GT 12 min">GT 12 min</option>
                         <option value="Outro">Outro</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Mercado</label>
                       <select 
                        value={formData.mercado}
                        onChange={(e) => setFormData({...formData, mercado: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                       >
                         <option value="">Selecione ou digite...</option>
                         {marketCategories.map(cat => {
                           const catMarkets = markets.filter(m => m.categoria === cat.nome && !m.hidden);
                           if (catMarkets.length === 0) return null;
                           return (
                             <optgroup key={cat.id} label={cat.nome}>
                               {catMarkets.map(m => (
                                 <option key={m.id} value={m.nome}>{m.nome}</option>
                               ))}
                             </optgroup>
                           );
                         })}
                       </select>
                   </div>
                </div>

                {/* PLAYERS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Mandante</label>
                      <input 
                         list="players-list-home"
                         value={formData.jogador1}
                         onChange={(e) => setFormData({...formData, jogador1: e.target.value})}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
                         placeholder="Nome do Jogador 1"
                      />
                      <datalist id="players-list-home">
                         {formData.liga && playersCache[formData.liga] && Array.from(playersCache[formData.liga]).map(p => (
                             <option key={`p1-${p}`} value={p} />
                         ))}
                      </datalist>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Visitante</label>
                      <input 
                         list="players-list-away"
                         value={formData.jogador2}
                         onChange={(e) => setFormData({...formData, jogador2: e.target.value})}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
                         placeholder="Nome do Jogador 2"
                      />
                      <datalist id="players-list-away">
                         {formData.liga && playersCache[formData.liga] && Array.from(playersCache[formData.liga]).map(p => (
                             <option key={`p2-${p}`} value={p} />
                         ))}
                      </datalist>
                   </div>
                </div>

                {/* STAKE & ODD */}
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Valor (R$)</label>
                      <input 
                         type="number"
                         value={formData.stake}
                         onChange={(e) => setFormData({...formData, stake: e.target.value})}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-emerald-500 outline-none focus:border-emerald-500 transition-colors"
                         placeholder="100"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Odd</label>
                      <input 
                         type="number"
                         step="0.01"
                         value={formData.odds}
                         onChange={(e) => setFormData({...formData, odds: e.target.value})}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-indigo-400 outline-none focus:border-emerald-500 transition-colors"
                         placeholder="1.90"
                      />
                   </div>
                </div>

                {/* RESULT SELECTION IF EDITING OR NEW */}
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Status Inicial</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['aguardando', 'green', 'red', 'meio-green', 'meio-red', 'reembolso'].map((status) => (
                          <button
                             type="button"
                             key={status}
                             onClick={() => setFormData({...formData, resultado: status as BetResult})}
                             className={`px-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                                 formData.resultado === status 
                                 ? 'bg-white text-black border-white' 
                                 : 'bg-black text-white/40 border-white/10 hover:border-white/20'
                             }`}
                          >
                             {status}
                          </button>
                      ))}
                   </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-4">
                   <button 
                      type="submit" 
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all transform active:scale-95"
                   >
                      {editingId ? 'Salvar Alterações' : 'Registrar Aposta'}
                   </button>
                </div>
             </form>
         </div>
      )}

      {activeTab === 'markets' && (
         <div className="space-y-8 max-w-4xl mx-auto">
             <div className="bg-[#0a0a0c] p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                   <div>
                       <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">Gerenciar Mercados</h3>
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Organize seus tipos de apostas</p>
                   </div>
                   
                   <div className="flex gap-4 w-full md:w-auto">
                      <input 
                         value={newCategoryName}
                         onChange={(e) => setNewCategoryName(e.target.value)}
                         placeholder="NOVA CATEGORIA..."
                         className="bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-all w-full md:w-64 focus:bg-white/[0.02]"
                      />
                      <button onClick={handleAddCategory} className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 transition-all">
                         <Plus size={20} strokeWidth={3} />
                      </button>
                   </div>
                </div>

                {/* VISUALIZAÇÃO EM ACORDEÃO */}
                <div className="space-y-4">
                   {marketCategories.map((category, index) => (
                      <div key={category.id} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${category.expanded ? 'bg-white/[0.02] border-emerald-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                         
                         {/* HEADER CATEGORIA */}
                         <div 
                            className="flex items-center justify-between p-4 cursor-pointer select-none"
                            onClick={() => toggleCategory(category.id)}
                         >
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${category.expanded ? 'bg-emerald-500 text-black' : 'bg-white/5 text-white/30'}`}>
                                    {category.expanded ? <ChevronDown size={14} /> : <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                                </div>
                                <h4 className={`text-xs font-black uppercase tracking-[0.15em] ${category.expanded ? 'text-emerald-400' : 'text-white/60'}`}>{category.nome}</h4>
                                <span className="bg-white/5 text-white/20 text-[9px] font-bold px-2 py-1 rounded-md">
                                    {markets.filter(m => m.categoria === category.nome).length}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                               <div className="flex bg-black rounded-lg p-1 border border-white/5 mr-2">
                                  <button onClick={() => handleMoveCategory(index, 'up')} disabled={index === 0} className="p-1.5 hover:text-white text-white/20 disabled:opacity-10 transition-colors"><ArrowUp size={12} /></button>
                                  <button onClick={() => handleMoveCategory(index, 'down')} disabled={index === marketCategories.length -1} className="p-1.5 hover:text-white text-white/20 disabled:opacity-10 transition-colors"><ArrowDown size={12} /></button>
                               </div>
                               <button 
                                    className="p-2 hover:bg-rose-500/10 hover:text-rose-500 text-white/10 rounded-lg transition-colors"
                                    onClick={() => {/* Implement category delete logic */}}
                                >
                                    <Trash2 size={14} />
                               </button>
                            </div>
                         </div>
                         
                         {/* CONTENT CATEGORIA */}
                         {category.expanded && (
                             <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                 {/* ADD MARKET INPUT */}
                                 <form onSubmit={(e) => {
                                     e.preventDefault();
                                     setNewMarketCategory(category.nome); // Force category
                                     handleAddMarket(e);
                                 }} className="flex gap-2 mb-4 pl-12">
                                     <input 
                                        value={newMarketCategory === category.nome ? newMarketName : ''}
                                        onChange={(e) => {
                                            setNewMarketCategory(category.nome);
                                            setNewMarketName(e.target.value);
                                        }}
                                        placeholder={`Adicionar mercado em ${category.nome}...`}
                                        className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
                                     />
                                     <button type="submit" disabled={!newMarketName || newMarketCategory !== category.nome} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black px-4 rounded-lg font-black text-[10px] uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                        <Plus size={14} />
                                     </button>
                                 </form>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-12">
                                    {markets.filter(m => m.categoria === category.nome).map(market => (
                                       <div key={market.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${market.hidden ? 'bg-black/40 border-white/5 opacity-50' : 'bg-white/[0.02] border-white/5 hover:border-emerald-500/20'}`}>
                                           <span className="text-xs font-bold text-white/80">{market.nome}</span>
                                           <div className="flex gap-1">
                                              <button onClick={(e) => handleToggleMarketVisibility(e, market)} className={`p-1.5 rounded-lg transition-colors ${market.hidden ? 'text-white/20 hover:text-white' : 'text-indigo-400 hover:text-indigo-300'}`}>
                                                 {market.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                              </button>
                                              <button onClick={(e) => handleDeleteMarket(e, market.id!)} className="p-1.5 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                 <Trash2 size={12} />
                                              </button>
                                           </div>
                                       </div>
                                    ))}
                                    {markets.filter(m => m.categoria === category.nome).length === 0 && (
                                        <div className="text-[10px] font-bold text-white/20 italic py-2 md:col-span-2">Nenhum mercado nesta categoria.</div>
                                    )}
                                 </div>
                             </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
         </div>
      )}

      {activeTab === 'settings' && (
         <div className="max-w-xl mx-auto space-y-8">
             <div className="bg-[#0a0a0c] p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter mb-8">Configurações da Banca: {activeBankroll?.name}</h3>
                
                <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Banca Inicial</label>
                      <input 
                         type="number"
                         value={localInitialBankroll}
                         onChange={(e) => setLocalInitialBankroll(Number(e.target.value))}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-emerald-500 outline-none focus:border-emerald-500 transition-colors"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-3">Valor da Unidade (1%)</label>
                      <input 
                         type="number"
                         value={localUnitValue}
                         onChange={(e) => setLocalUnitValue(Number(e.target.value))}
                         className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-emerald-500 outline-none focus:border-emerald-500 transition-colors"
                      />
                   </div>

                   <button 
                      onClick={() => handleUpdateBankroll(activeBankrollId, { initialCapital: localInitialBankroll, unitValue: localUnitValue })}
                      className="w-full bg-white/5 hover:bg-emerald-500 hover:text-black text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                   >
                      <Save size={16} /> Salvar Configurações
                   </button>
                </div>
             </div>

             <div className="bg-[#0a0a0c] p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">Criar Nova Banca</h3>
                <div className="flex gap-4">
                   <button 
                      onClick={() => {
                        const name = prompt("Nome da nova banca:");
                        if (name) handleCreateBankroll(name, 1000, 100);
                      }}
                      className="flex-1 border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all group"
                   >
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                         <Plus size={24} />
                      </div>
                      <span className="text-xs font-bold text-white/60">Nova Banca</span>
                   </button>
                </div>
             </div>
         </div>
      )}

    </div>
  );
};
