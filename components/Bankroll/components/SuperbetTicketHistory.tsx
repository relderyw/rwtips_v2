import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, History, CheckCircle2, XCircle, Clock, Key } from 'lucide-react';

interface SuperbetTicket {
  id: string;
  stake: number;
  possibleReturn: number;
  status: string;
  selections: any[];
  createdAt: string;
  [key: string]: any;
}

interface SuperbetTicketHistoryProps {
}

const SuperbetTicketHistory: React.FC<SuperbetTicketHistoryProps> = () => {
  const [tickets, setTickets] = useState<SuperbetTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  // Initialize from localStorage if available
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('superbet_sessionId') || '';
  });
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('superbet_userId') || '1232497';
  });
  const [userUuid, setUserUuid] = useState(() => {
    return localStorage.getItem('superbet_userUuid') || '';
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('superbet_token') || '';
  });
  const [count, setCount] = useState(() => {
    return localStorage.getItem('superbet_count') || '11';
  });
  const [status, setStatus] = useState(() => {
    return localStorage.getItem('superbet_status') || 'finished';
  });
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage whenever these values change
  useEffect(() => {
    localStorage.setItem('superbet_sessionId', sessionId);
  }, [sessionId]);
  useEffect(() => {
    localStorage.setItem('superbet_userId', userId);
  }, [userId]);
  useEffect(() => {
    localStorage.setItem('superbet_userUuid', userUuid);
  }, [userUuid]);
  useEffect(() => {
    localStorage.setItem('superbet_token', token);
  }, [token]);
  useEffect(() => {
    localStorage.setItem('superbet_count', count);
  }, [count]);
  useEffect(() => {
    localStorage.setItem('superbet_status', status);
  }, [status]);

  // Auto-fetch on load if we have either sessionId or token and userId
  useEffect(() => {
    if ((sessionId || token) && userId) {
      fetchTickets();
    }
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('won') || lowerStatus.includes('ganho') || lowerStatus.includes('green')) {
      return 'text-emerald-500';
    } else if (lowerStatus.includes('lost') || lowerStatus.includes('perda') || lowerStatus.includes('red')) {
      return 'text-rose-500';
    }
    return 'text-yellow-500';
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('won') || lowerStatus.includes('ganho')) {
      return <CheckCircle2 size={16} className="text-emerald-500" />;
    } else if (lowerStatus.includes('lost') || lowerStatus.includes('perda')) {
      return <XCircle size={16} className="text-rose-500" />;
    }
    return <Clock size={16} className="text-yellow-500" />;
  };

  const generateToken = async () => {
    if (!sessionId || !userId || !userUuid) {
      setError('Para gerar o token, informe Session ID, User ID e User UUID');
      return;
    }
    setGeneratingToken(true);
    setError(null);
    try {
      const url = `/api/superbet-generate-token?userId=${userId}&userUuid=${userUuid}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'session_id': sessionId,
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.details || `Erro ao gerar token: ${response.status}`);
      }
      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        // Auto-fetch tickets after generating token
        fetchTickets(data.token);
      }
    } catch (err: any) {
      console.error('Erro ao gerar token:', err);
      setError(`Erro ao gerar token: ${err.message}`);
    } finally {
      setGeneratingToken(false);
    }
  };

  const fetchTickets = async (authToken?: string) => {
    const useToken = authToken || token;
    if (!(sessionId || useToken)) {
      setError('Por favor, informe o Session ID ou Token');
      return;
    }
    if (!userId) {
      setError('Por favor, informe o User ID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/superbet-tickets?userId=${userId}&count=${count}&status=${status}`;
      const headers: any = {};
      if (useToken) {
        headers['Authorization'] = `Bearer ${useToken}`;
      } else if (sessionId) {
        headers['sessionid'] = sessionId;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Autenticação falhou! Por favor, atualize o Session ID ou Token.');
        }
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.details || `Erro na requisição: ${response.status}`);
      }
      
      const data = await response.json();
      // Assuming data might be an array or have a wrapper, adjust as needed
      if (Array.isArray(data)) {
        setTickets(data);
      } else if (data.tickets) {
          setTickets(data.tickets);
      } else {
          // Fallback: assume the whole response as tickets
          setTickets(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar tickets:', err);
      setError(`Erro ao buscar tickets: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CONFIGURATION */}
      <div className="bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <History size={18} className="text-emerald-500" />
          <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">Configuração da API</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Informe o Session ID"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Informe o User ID"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">User UUID</label>
            <input
              type="text"
              value={userUuid}
              onChange={(e) => setUserUuid(e.target.value)}
              placeholder="Informe o User UUID"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Token (opcional)</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Informe o Token JWT"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <button
              onClick={generateToken}
              disabled={generatingToken || !sessionId || !userId || !userUuid}
              className="w-full py-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-[9px] font-black uppercase tracking-widest hover:text-indigo-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Key size={14} className={generatingToken ? 'animate-spin' : ''} /> 
              {generatingToken ? 'Gerando Token...' : 'Gerar Token'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="finished">Finalizados</option>
              <option value="open">Abertos</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest ml-2">Quantidade</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="Número de tickets"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>
        <button
            onClick={() => fetchTickets()}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest hover:text-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
            {loading ? 'Carregando...' : 'Atualizar Histórico'}
          </button>
        {error && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-xs font-bold text-rose-500">{error}</p>
          </div>
        )}
      </div>

      {/* TICKETS LIST */}
      <div className="bg-[#0a0a0c] p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy size={18} className="text-emerald-500" />
            <h3 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em]">Histórico de Apostas Superbet</h3>
          </div>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{tickets.length} REGISTROS</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map((_, index) => (
              <div key={index} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/3"></div>
                  <div className="h-3 bg-white/5 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket, idx) => (
              <div key={ticket.id || idx} className="group relative flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 p-4 rounded-2xl transition-all">
                <div className={`w-1.5 h-12 rounded-full shrink-0 ${getStatusColor(ticket.status).includes('emerald') ? 'bg-emerald-500' :
                    getStatusColor(ticket.status).includes('rose') ? 'bg-rose-500' : 'bg-yellow-500'
                  }`}></div>
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <span className={`text-xs font-black uppercase tracking-widest ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className="text-[9px] font-bold text-white/30 ml-2">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{formatCurrency(ticket.stake || 0)}</p>
                      <p className="text-[9px] font-bold text-white/40">
                        Retorno: {formatCurrency(ticket.possibleReturn || 0)}
                      </p>
                    </div>
                  </div>
                  {ticket.selections && ticket.selections.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="grid grid-cols-1 gap-1">
                        {ticket.selections.slice(0, 3).map((selection, sidx) => (
                          <div key={sidx} className="flex items-center justify-between text-[9px]">
                            <span className="text-white/60 truncate">{selection.eventName || selection.name || 'Evento'}</span>
                            <span className="text-emerald-500 font-bold ml-2">{selection.odds ? selection.odds.toFixed(2) : ''}</span>
                          </div>
                        ))}
                        {ticket.selections.length > 3 && (
                          <div className="text-[9px] text-white/30">+ {ticket.selections.length - 3} mais</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
          <History size={48} className="text-white/10 mx-auto mb-4" />
          <p className="text-xs font-bold text-white/20">Nenhum ticket encontrado</p>
          <p className="text-[9px] text-white/10 mt-2">Configure os dados da API e clique em atualizar</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default SuperbetTicketHistory;