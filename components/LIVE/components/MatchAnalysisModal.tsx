import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import { processPressureData, processProbabilities, processRecentMatches } from '../utils/helpers';
import { LiveScore } from '../../../services/liveApi';

interface MatchAnalysisModalProps {
    match: LiveScore;
    matchData: any; // Using any for the complex API response to facilitate porting
    loading: boolean;
    onClose: () => void;
}

const MatchAnalysisModal: React.FC<MatchAnalysisModalProps> = ({ match, matchData, loading, onClose }) => {
    const [activeMainTab, setActiveMainTab] = useState('dicas');
    const [activeTipTab, setActiveTipTab] = useState('vencedor');
    const [activeSection, setActiveSection] = useState('jogo-inteiro');
    const [statPeriod, setStatPeriod] = useState('FT'); // FT, 1T, 2T
    const [statType, setStatType] = useState('GOLS'); // GOLS, ESCANTEIOS, etc

    const pressureData = matchData ? processPressureData(matchData) : [];
    // Unused variables for now, but kept for future use if needed, or derived in render
    // const probabilities = processProbabilities(matchData);
    const recentMatchesHome = matchData ? processRecentMatches(matchData, 'home', match.homeTeam.name) : [];
    const recentMatchesAway = matchData ? processRecentMatches(matchData, 'away', match.awayTeam.name) : [];

    // Helper to safely get numeric values
    const getVal = (val: any) => parseInt(val) || 0;
    const getFloat = (val: any) => parseFloat(val) || 0;

    const statusLabel = matchData?.status === 'HT'
        ? 'INTERVALO'
        : matchData?.status === 'FT'
            ? 'FINAL'
            : matchData?.status === '1st'
                ? '1º TEMPO'
                : matchData?.status === '2nd'
                    ? '2º TEMPO'
                    : matchData?.status || '';

    const getPrognosticos = () => {
        if (!matchData?.prognosticos) return null;
        try {
            return JSON.parse(matchData.prognosticos);
        } catch (e) {
            return null;
        }
    };

    const prog = getPrognosticos();

    const renderTipContent = () => {
        if (!prog) return null;

        switch (activeTipTab) {
            case 'vencedor':
                return (
                    <div>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveSection('1tempo')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === '1tempo'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                1º TEMPO
                            </button>
                            <button
                                onClick={() => setActiveSection('jogo-inteiro')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === 'jogo-inteiro'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                JOGO INTEIRO
                            </button>
                        </div>

                        {activeSection === '1tempo' ? (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{match.homeTeam.name}</div>
                                    <div className="text-3xl font-bold text-white">
                                        {prog.mercado_1x2_1t?.casa_vencer?.probabilidade || 0}%
                                    </div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-4 text-center">
                                    <div className="text-xs text-slate-400 mb-2">EMPATE</div>
                                    <div className="text-3xl font-bold text-white">
                                        {prog.mercado_1x2_1t?.empate?.probabilidade || 0}%
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{match.awayTeam.name}</div>
                                    <div className="text-3xl font-bold text-white">
                                        {prog.mercado_1x2_1t?.fora_vencer?.probabilidade || 0}%
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-800 rounded-lg p-4 text-center">
                                        <div className="text-xs text-slate-400 mb-2">{match.homeTeam.name.toUpperCase()}</div>
                                        <div className="text-3xl font-bold text-white">
                                            {prog.mercado_1x2?.casa_vencer?.probabilidade || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4 text-center">
                                        <div className="text-xs text-slate-400 mb-2">EMPATE</div>
                                        <div className="text-3xl font-bold text-white">
                                            {prog.mercado_1x2?.empate?.probabilidade || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4 text-center">
                                        <div className="text-xs text-slate-400 mb-2">{match.awayTeam.name.toUpperCase()}</div>
                                        <div className="text-3xl font-bold text-white">
                                            {prog.mercado_1x2?.fora_vencer?.probabilidade || 0}%
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                                        <div className="text-xs text-slate-400 mb-1">1X</div>
                                        <div className="text-xl font-bold text-emerald-400">
                                            {prog.mercado_1x2?.casa_ou_empate?.probabilidade || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                                        <div className="text-xs text-slate-400 mb-1">1 OU 2</div>
                                        <div className="text-xl font-bold text-emerald-400">
                                            {prog.mercado_1x2?.casa_ou_fora?.probabilidade || 0}%
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                                        <div className="text-xs text-slate-400 mb-1">X2</div>
                                        <div className="text-xl font-bold text-emerald-400">
                                            {prog.mercado_1x2?.fora_ou_empate?.probabilidade || 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'gols':
                return (
                    <div>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveSection('1tempo')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === '1tempo'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                1º PRIMEIRO TEMPO
                            </button>
                            <button
                                onClick={() => setActiveSection('2tempo')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === '2tempo'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                SEGUNDO TEMPO
                            </button>
                            <button
                                onClick={() => setActiveSection('jogo-inteiro')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === 'jogo-inteiro'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                JOGO INTEIRO
                            </button>
                        </div>

                        {activeSection === '1tempo' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 rounded-lg p-4 text-center">
                                    <div className="text-sm text-slate-300 mb-2">MAIS DE 0.5</div>
                                    <div className="text-2xl font-bold text-white">
                                        {prog.mercado_gols_primeiro_tempo?.over_0_5?.res || 0}%
                                    </div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-4 text-center">
                                    <div className="text-sm text-slate-300 mb-2">MAIS DE 1.5</div>
                                    <div className="text-2xl font-bold text-white">
                                        {prog.mercado_gols_primeiro_tempo?.over_1_5?.res || 0}%
                                    </div>
                                </div>
                            </div>
                        ) : activeSection === '2tempo' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 rounded-lg p-4 text-center">
                                    <div className="text-sm text-slate-300 mb-2">MAIS DE 0.5</div>
                                    <div className="text-2xl font-bold text-white">
                                        {/* Calcular para segundo tempo se disponível */}
                                        {((prog.mercado_gols?.over_1_5?.res || 0) - (prog.mercado_gols_primeiro_tempo?.over_0_5?.res || 0))}%
                                    </div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-4 text-center">
                                    <div className="text-sm text-slate-300 mb-2">MAIS DE 1.5</div>
                                    <div className="text-2xl font-bold text-white">
                                        {((prog.mercado_gols?.over_2_5?.res || 0) - (prog.mercado_gols_primeiro_tempo?.over_1_5?.res || 0))}%
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'over_0_5', label: 'MAIS DE 0.5' },
                                    { key: 'over_1_5', label: 'MAIS DE 1.5' },
                                    { key: 'over_2_5', label: 'MAIS DE 2.5' },
                                    { key: 'over_3_5', label: 'MAIS DE 3.5' }
                                ].map(({ key, label }) => (
                                    <div
                                        key={key}
                                        className={`bg-slate-800 rounded-lg p-4 text-center ${prog.mercado_gols?.[key]?.res >= 70 ? 'ring-2 ring-emerald-500' : ''
                                            }`}
                                    >
                                        <div className="text-xs text-slate-300 mb-2">{label}</div>
                                        <div className="text-2xl font-bold text-white">
                                            {prog.mercado_gols?.[key as any]?.res || 0}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'ambas':
                return (
                    <div className="flex gap-4 justify-center">
                        <div className="bg-slate-800 rounded-lg p-8 text-center flex-1 max-w-xs">
                            <div className="text-lg text-slate-300 mb-4">SIM</div>
                            <div className="text-5xl font-bold text-white">
                                {prog.mercado_ambos_marcam?.ambos_sim?.probabilidade || 0}%
                            </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-8 text-center flex-1 max-w-xs">
                            <div className="text-lg text-slate-300 mb-4">NÃO</div>
                            <div className="text-5xl font-bold text-white">
                                {prog.mercado_ambos_marcam?.ambos_nao?.probabilidade || 0}%
                            </div>
                        </div>
                    </div>
                );

            case 'escanteios':
                // Calcular média de escanteios: média casa + média visitante
                const mediaHome = parseFloat(matchData.medias_home_corners) || 0;
                const mediaAway = parseFloat(matchData.medias_away_corners) || 0;
                const mediaTotal = mediaHome + mediaAway;

                // Se não tiver as médias individuais, tentar usar do prognósticos
                const mediaFromProg = prog?.mercado_escanteios?.over_10?.media_total_escanteios;
                const cornersAverage = mediaTotal > 0 ? mediaTotal : (mediaFromProg || 0);

                return (
                    <div>
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setActiveSection('1tempo')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === '1tempo'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                1º PRIMEIRO TEMPO
                            </button>
                            <button
                                onClick={() => setActiveSection('2tempo')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === '2tempo'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                SEGUNDO TEMPO
                            </button>
                            <button
                                onClick={() => setActiveSection('jogo-inteiro')}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeSection === 'jogo-inteiro'
                                    ? 'bg-slate-700 text-emerald-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                JOGO INTEIRO
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="text-slate-300 text-sm mb-2">ESCANTEIOS</div>
                            <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                                <div className="text-6xl font-bold text-slate-200 mb-2">
                                    {cornersAverage.toFixed(1)}
                                </div>
                                <div className="text-slate-400 text-sm">ESCANTEIOS - MÉDIA</div>
                            </div>
                        </div>

                        {/* Estatísticas detalhadas */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-400 mb-2">CASA</div>
                                <div className="flex items-center gap-2">
                                    {match.localTeamFlag && (
                                        <img
                                            src={match.localTeamFlag}
                                            alt={match.localTeamName}
                                            className="h-6 w-6 object-contain"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="text-xl font-bold text-white">{mediaHome.toFixed(1)}</div>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Média em casa</div>
                            </div>

                            <div className="bg-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-400 mb-2">VISITANTE</div>
                                <div className="flex items-center gap-2">
                                    {match.visitorTeamFlag && (
                                        <img
                                            src={match.visitorTeamFlag}
                                            alt={match.visitorTeamName}
                                            className="h-6 w-6 object-contain"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="text-xl font-bold text-white">{mediaAway.toFixed(1)}</div>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Média fora</div>
                            </div>
                        </div>

                        {/* Escanteios no jogo atual (se disponível) */}
                        {(matchData.localCorners !== undefined || matchData.visitorCorners !== undefined) && (
                            <div className="mt-4 bg-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-400 mb-2">NO JOGO ATUAL</div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        {match.localTeamFlag && (
                                            <img
                                                src={match.localTeamFlag}
                                                alt={match.localTeamName}
                                                className="h-5 w-5 object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                        <span className="text-white font-semibold">{matchData.localCorners || 0}</span>
                                    </div>
                                    <div className="text-slate-400 text-sm">vs</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-semibold">{matchData.visitorCorners || 0}</span>
                                        {match.visitorTeamFlag && (
                                            <img
                                                src={match.visitorTeamFlag}
                                                alt={match.visitorTeamName}
                                                className="h-5 w-5 object-contain"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-emerald-900/10">
                {/* Top bar */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="text-slate-300 text-sm">
                        {match.countryName} | {match.leagueName} | Rodada {matchData?.roundName || 'N/A'}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="p-2 rounded hover:bg-slate-800 text-slate-300"
                    >
                        <X size={18} />
                    </button>
                </div>

                {loading || !matchData ? (
                    <div className="p-8 flex items-center justify-center">
                        <LoadingSpinner text="Carregando análise..." />
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Match header with logos */}
                        <div className="grid grid-cols-3 gap-4 items-center mb-6">
                            <div className="flex flex-col items-start">
                                <div className="flex items-center gap-2 mb-2">
                                    {match.localTeamFlag && (
                                        <img
                                            src={match.localTeamFlag}
                                            alt={match.localTeamName}
                                            className="h-12 w-12 object-contain"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                                <div className="text-white text-lg font-bold">{match.localTeamName}</div>
                                {matchData.localPressureBar && (
                                    <div className="mt-2 w-full">
                                        <div className="text-xs text-slate-400 mb-1">Pressão {matchData.localPressureBar}%</div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-emerald-500 h-2 rounded-full"
                                                style={{ width: `${matchData.localPressureBar}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-center">
                                <div className="text-3xl font-extrabold text-white mb-1">
                                    {matchData.scoresLocalTeam || 0} : {matchData.scoresVisitorTeam || 0}
                                </div>
                                {matchData.minute && matchData.status !== 'FT' && (
                                    <div className="text-emerald-400 text-lg font-semibold mb-1">{matchData.minute}'</div>
                                )}
                                <div className="text-slate-400 text-xs">{statusLabel}</div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 mb-2">
                                    {match.visitorTeamFlag && (
                                        <img
                                            src={match.visitorTeamFlag}
                                            alt={match.visitorTeamName}
                                            className="h-12 w-12 object-contain"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                </div>
                                <div className="text-white text-lg font-bold text-right">{match.visitorTeamName}</div>
                                {matchData.visitorPressureBar && (
                                    <div className="mt-2 w-full">
                                        <div className="text-xs text-slate-400 mb-1 text-right">Pressão {matchData.visitorPressureBar}%</div>
                                        <div className="w-full bg-slate-700 rounded-full h-2">
                                            <div
                                                className="bg-emerald-500 h-2 rounded-full ml-auto"
                                                style={{ width: `${matchData.visitorPressureBar}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main navigation tabs */}
                        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                            {[
                                { id: 'ao-vivo', label: 'AO VIVO' },
                                { id: 'graficos', label: 'GRÁFICOS' },
                                { id: 'dicas', label: 'DICAS' },
                                { id: 'h2h', label: 'H2H' },
                                { id: 'estatisticas', label: 'ESTATÍSTICAS' },
                                { id: 'possiveis-entradas', label: 'POSSÍVEIS ENTRADAS' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveMainTab(tab.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${activeMainTab === tab.id
                                        ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20'
                                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content based on main tab */}
                        {activeMainTab === 'dicas' && (
                            <div>
                                {/* Tip sub-tabs */}
                                <div className="flex gap-2 mb-6">
                                    {[
                                        { id: 'vencedor', label: 'VENCEDOR' },
                                        { id: 'gols', label: 'GOLS' },
                                        { id: 'ambas', label: 'AMBAS' },
                                        { id: 'escanteios', label: 'ESCANTEIOS' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTipTab(tab.id);
                                                setActiveSection('jogo-inteiro');
                                            }}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTipTab === tab.id
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tip content */}
                                {renderTipContent()}
                            </div>
                        )}

                        {/* Outros conteúdos (simplificado para caber... ) usa a mesma lógica do original */}
                        {activeMainTab === 'ao-vivo' && matchData && (
                            <div className="text-zinc-400 p-4 text-center">Implementação Completa do Ao Vivo em Breve... Utilize o app original para detalhes gráficos.</div>
                        )}

                        {activeMainTab === 'graficos' && pressureData.length > 0 && (
                            <div>
                                <div className="text-zinc-300 mb-3">📊 Pressão Durante o Jogo</div>
                                <div className="h-64 bg-zinc-900 border border-zinc-800 rounded p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={pressureData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="min" stroke="#94a3b8" />
                                            <YAxis stroke="#94a3b8" />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="home" stroke="#10b981" dot={false} name="Casa" />
                                            <Line type="monotone" dataKey="away" stroke="#60a5fa" dot={false} name="Fora" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Placeholder para outras tabs */}
                        {(activeMainTab === 'h2h' || activeMainTab === 'estatisticas' || activeMainTab === 'possiveis-entradas') && (
                            <div className="text-center py-10 text-zinc-500">
                                Funcionalidade em migração... visualização limitada.
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchAnalysisModal;
