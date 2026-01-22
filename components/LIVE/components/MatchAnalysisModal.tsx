import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from './LoadingSpinner';
import { processPressureData, processProbabilities, processRecentMatches } from '../utils/helpers';
import { LiveScore } from '../services/liveApi';
import { calculateStrategies, StrategyResult, StrategyConfig } from '../utils/liveStrategies';
import StrategyDebugPanel from './StrategyDebugPanel';

interface MatchAnalysisModalProps {
    isOpen?: boolean;
    match: LiveScore;
    matchData: any; // Using any for the complex API response to facilitate porting
    loading: boolean;
    onClose: () => void;
    strategyConfig?: StrategyConfig;
}

// Helper Component: Circular Gauge
const CircularGauge = ({ value, color = "#25ad70", label, subLabel }: { value: number; color?: string; label?: string; subLabel?: string }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
                <svg className="transform -rotate-90 w-24 h-24">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-zinc-800"
                    />
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke={color}
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold text-white">{value}</span>
                </div>
            </div>
            {label && <span className="text-xs text-zinc-400 mt-2 uppercase tracking-wider">{label}</span>}
            {subLabel && <span className="text-[10px] text-zinc-500">{subLabel}</span>}
        </div>
    );
};

const MatchAnalysisModal: React.FC<MatchAnalysisModalProps> = ({ match, matchData, loading, onClose, strategyConfig }) => {
    const [activeMainTab, setActiveMainTab] = useState('dicas');
    const [activeTipTab, setActiveTipTab] = useState('vencedor');
    const [activeSection, setActiveSection] = useState('jogo-inteiro');
    const [statPeriod, setStatPeriod] = useState('FT'); // FT, 1T, 2T
    const [statType, setStatType] = useState('GOLS'); // GOLS, ESCANTEIOS, etc
    const [currentSlide, setCurrentSlide] = useState(0);


    const pressureData = matchData ? processPressureData(matchData) : [];
    const recentMatchesHome = matchData ? processRecentMatches(matchData, 'home', match.localTeamName || '') : [];
    const recentMatchesAway = matchData ? processRecentMatches(matchData, 'away', match.visitorTeamName || '') : [];

    // Helper to safely get numeric values
    const getVal = (val: any) => parseInt(val) || 0;
    const getFloat = (val: any) => parseFloat(val) || 0;

    // Calculate Live Strategies
    let liveStrategies: StrategyResult[] = [];
    if (matchData) {
        const statsForCalc = {
            time: parseInt(matchData.minute) || 0,
            homeScore: getVal(matchData.scoresLocalTeam),
            awayScore: getVal(matchData.scoresVisitorTeam),
            homeAttacks: getVal(matchData.localAttacksAttacks),
            awayAttacks: getVal(matchData.visitorAttacksAttacks),
            homeDangerousAttacks: getVal(matchData.localAttacksDangerousAttacks),
            awayDangerousAttacks: getVal(matchData.visitorAttacksDangerousAttacks),
            homeShootsOn: getVal(matchData.localShotsOnGoal),
            awayShootsOn: getVal(matchData.visitorShotsOnGoal),
            homeShootsOff: getVal(matchData.localShotsOffGoal),
            awayShootsOff: getVal(matchData.visitorShotsOffGoal),
            homeCorners: getVal(matchData.localCorners),
            awayCorners: getVal(matchData.visitorCorners),
            homeName: match.localTeamName || 'Casa',
            awayName: match.visitorTeamName || 'Fora'
        };
        liveStrategies = calculateStrategies(statsForCalc, strategyConfig);
    }

    // Always calculate debug info for the debug panel
    const debugInfo = matchData ? {
        appmHome: parseFloat(((getVal(matchData.localAttacksDangerousAttacks) / (parseInt(matchData.minute) || 1))).toFixed(2)),
        appmAway: parseFloat(((getVal(matchData.visitorAttacksDangerousAttacks) / (parseInt(matchData.minute) || 1))).toFixed(2)),
        appmTotal: parseFloat((((getVal(matchData.localAttacksDangerousAttacks) + getVal(matchData.visitorAttacksDangerousAttacks)) / (parseInt(matchData.minute) || 1))).toFixed(2)),
        cgHome: getVal(matchData.localCorners) + getVal(matchData.localShotsOnGoal) + getVal(matchData.localShotsOffGoal),
        cgAway: getVal(matchData.visitorCorners) + getVal(matchData.visitorShotsOnGoal) + getVal(matchData.visitorShotsOffGoal),
        cgTotal: getVal(matchData.localCorners) + getVal(matchData.visitorCorners) + getVal(matchData.localShotsOnGoal) + getVal(matchData.visitorShotsOnGoal) + getVal(matchData.localShotsOffGoal) + getVal(matchData.visitorShotsOffGoal),
        time: parseInt(matchData.minute) || 0,
        scoreHome: getVal(matchData.scoresLocalTeam),
        scoreAway: getVal(matchData.scoresVisitorTeam)
    } : undefined;

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
                                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{match.localTeamName}</div>
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
                                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{match.visitorTeamName}</div>
                                    <div className="text-3xl font-bold text-white">
                                        {prog.mercado_1x2_1t?.fora_vencer?.probabilidade || 0}%
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-800 rounded-lg p-4 text-center">
                                        <div className="text-xs text-slate-400 mb-2">{match.localTeamName.toUpperCase()}</div>
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
                                        <div className="text-xs text-slate-400 mb-2">{match.visitorTeamName.toUpperCase()}</div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 z-50 pt-10 overflow-y-auto">
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
                            <div className="space-y-6">
                                {/* Carousel Container */}
                                <div className="relative bg-zinc-800/30 rounded-xl overflow-hidden min-h-[200px]">
                                    {/* Slides */}
                                    <div className="transition-transform duration-500 ease-in-out flex" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>

                                        {/* Slide 1: Intensity Gauges */}
                                        <div className="min-w-full p-4 flex justify-around items-center">
                                            <div className="text-center space-y-2">
                                                <div className="text-emerald-500 font-bold text-lg">{matchData.localAttacksAttacks || 0}</div>
                                                <CircularGauge value={50} color="#25ad70" label="Ataques" />
                                                <div className="text-red-500 font-bold text-lg">{matchData.visitorAttacksAttacks || 0}</div>
                                            </div>
                                            <div className="text-center space-y-2">
                                                <div className="text-emerald-500 font-bold text-lg">{matchData.localAttacksDangerousAttacks || 0}</div>
                                                <CircularGauge value={60} color="#eab308" label="Ataques Perigosos" />
                                                <div className="text-red-500 font-bold text-lg">{matchData.visitorAttacksDangerousAttacks || 0}</div>
                                            </div>
                                            <div className="text-center space-y-2">
                                                <div className="text-emerald-500 font-bold text-lg">{matchData.localBallPossession || 50}%</div>
                                                <CircularGauge value={matchData.localBallPossession || 50} color="#3b82f6" label="Posse" />
                                                <div className="text-red-500 font-bold text-lg">{matchData.visitorBallPossession || 50}%</div>
                                            </div>
                                        </div>

                                        {/* Slide 2: APPM Breakdown (Placeholder for now as specific granular API data might be missing) */}
                                        <div className="min-w-full p-4 grid grid-cols-2 gap-4">
                                            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                                                <div className="text-zinc-500 text-xs uppercase mb-1">APPM (Total)</div>
                                                <div className="text-white font-bold">{((matchData.localAttacksAttacks || 0) / (matchData.minute || 1)).toFixed(2)}</div>
                                            </div>
                                            <div className="bg-zinc-800/50 p-3 rounded-lg text-center">
                                                <div className="text-zinc-500 text-xs uppercase mb-1">APPM (Perigoso)</div>
                                                <div className="text-white font-bold">{((matchData.localAttacksDangerousAttacks || 0) / (matchData.minute || 1)).toFixed(2)}</div>
                                            </div>
                                            {/* Add more breakdown items here if data becomes available */}
                                            <div className="col-span-2 text-center text-zinc-500 text-xs italic mt-4">
                                                Deslize para ver mais detalhes
                                            </div>
                                        </div>
                                    </div>

                                    {/* Carousel Indicators */}
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                                        {[0, 1].map((idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentSlide(idx)}
                                                className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'bg-emerald-500 w-4' : 'bg-zinc-600'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Pressure Bar (Kept from previous iteration as it's valuable) */}
                                {(matchData.localPressureBar !== undefined || matchData.visitorPressureBar !== undefined) && (
                                    <div className="bg-zinc-800/50 rounded-xl p-4 text-center border border-zinc-700">
                                        <div className="flex justify-between text-xs text-zinc-400 mb-2 uppercase font-bold tracking-widest">
                                            <span>Pressão Casa</span>
                                            <span>Índice de Pressão</span>
                                            <span>Pressão Visitante</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-emerald-500 font-bold text-xl w-8 text-right">{matchData.localPressureBar || 0}</div>
                                            <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden flex">
                                                <div
                                                    className="bg-emerald-500 h-full transition-all duration-500"
                                                    style={{ width: `${matchData.localPressureBar || 50}%` }}
                                                />
                                                <div
                                                    className="bg-red-500 h-full transition-all duration-500 flex-1"
                                                    style={{ width: `${matchData.visitorPressureBar || 0}%` }}
                                                />
                                            </div>
                                            <div className="text-red-500 font-bold text-xl w-8 text-left">{matchData.visitorPressureBar || 0}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Refined Stats Grid (Incidents) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center border border-zinc-700/50">
                                        <span className="text-emerald-400 font-bold text-lg">{matchData.localShotsOnGoal || 0}</span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Chutes no Gol</span>
                                            {/* Mini Bar */}
                                            <div className="w-16 h-1 bg-zinc-700 rounded-full mt-1 flex overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${(getVal(matchData.localShotsOnGoal) / (getVal(matchData.localShotsOnGoal) + getVal(matchData.visitorShotsOnGoal) || 1)) * 100}%` }}></div>
                                                <div className="bg-red-500 h-full flex-1"></div>
                                            </div>
                                        </div>
                                        <span className="text-red-400 font-bold text-lg">{matchData.visitorShotsOnGoal || 0}</span>
                                    </div>

                                    <div className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center border border-zinc-700/50">
                                        <span className="text-emerald-400 font-bold text-lg">{matchData.localCorners || 0}</span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Escanteios</span>
                                            <div className="w-16 h-1 bg-zinc-700 rounded-full mt-1 flex overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${(getVal(matchData.localCorners) / (getVal(matchData.localCorners) + getVal(matchData.visitorCorners) || 1)) * 100}%` }}></div>
                                                <div className="bg-red-500 h-full flex-1"></div>
                                            </div>
                                        </div>
                                        <span className="text-red-400 font-bold text-lg">{matchData.visitorCorners || 0}</span>
                                    </div>

                                    <div className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center border border-zinc-700/50">
                                        <span className="text-emerald-400 font-bold text-lg">{matchData.localYellowCards || 0}</span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Cartões Amarelos</span>
                                            <div className="w-16 h-1 bg-zinc-700 rounded-full mt-1 flex overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${(getVal(matchData.localYellowCards) / (getVal(matchData.localYellowCards) + getVal(matchData.visitorYellowCards) || 1)) * 100}%` }}></div>
                                                <div className="bg-red-500 h-full flex-1"></div>
                                            </div>
                                        </div>
                                        <span className="text-red-400 font-bold text-lg">{matchData.visitorYellowCards || 0}</span>
                                    </div>

                                    <div className="bg-zinc-800/50 rounded-lg p-3 flex justify-between items-center border border-zinc-700/50">
                                        <span className="text-emerald-400 font-bold text-lg">{matchData.localRedCards || 0}</span>
                                        <div className="flex flex-col items-center">
                                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Cartões Vermelhos</span>
                                            <div className="w-16 h-1 bg-zinc-700 rounded-full mt-1 flex overflow-hidden">
                                                <div className="bg-emerald-500 h-full" style={{ width: `${(getVal(matchData.localRedCards) / (getVal(matchData.localRedCards) + getVal(matchData.visitorRedCards) || 1)) * 100}%` }}></div>
                                                <div className="bg-red-500 h-full flex-1"></div>
                                            </div>
                                        </div>
                                        <span className="text-red-400 font-bold text-lg">{matchData.visitorRedCards || 0}</span>
                                    </div>
                                </div>
                            </div>
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

                        {activeMainTab === 'h2h' && (
                            <div className="space-y-6">
                                {recentMatchesHome.length > 0 && (
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                                        <div className="bg-zinc-800/50 p-3 text-zinc-300 font-semibold border-b border-zinc-800">
                                            ÚLTIMOS JOGOS {match.localTeamName.toUpperCase()}
                                        </div>
                                        <div>
                                            {recentMatchesHome.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-4 items-center p-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                                                >
                                                    <span className="text-zinc-500 text-xs w-16 whitespace-nowrap">{m.date}</span>
                                                    <div className="flex items-center justify-end gap-2 text-right">
                                                        <span className={`text-sm ${m.homeTeam === match.localTeamName ? 'font-bold text-white' : 'text-zinc-400'}`}>
                                                            {m.homeTeam}
                                                        </span>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-sm font-mono font-bold ${m.isWin ? 'bg-emerald-500/20 text-emerald-400' : m.isDraw ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {m.score}
                                                    </div>
                                                    <div className="flex items-center justify-start gap-2 text-left">
                                                        <span className={`text-sm ${m.awayTeam === match.localTeamName ? 'font-bold text-white' : 'text-zinc-400'}`}>
                                                            {m.awayTeam}
                                                        </span>
                                                    </div>
                                                    <div className={`w-8 h-6 flex items-center justify-center rounded text-xs font-bold ${m.isWin ? 'bg-emerald-500 text-black' : m.isDraw ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>
                                                        {m.isWin ? 'V' : m.isDraw ? 'E' : 'D'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {recentMatchesAway.length > 0 && (
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                                        <div className="bg-zinc-800/50 p-3 text-zinc-300 font-semibold border-b border-zinc-800">
                                            ÚLTIMOS JOGOS {match.visitorTeamName.toUpperCase()}
                                        </div>
                                        <div>
                                            {recentMatchesAway.map((m, idx) => (
                                                <div
                                                    key={idx}
                                                    className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-4 items-center p-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
                                                >
                                                    <span className="text-zinc-500 text-xs w-16 whitespace-nowrap">{m.date}</span>
                                                    <div className="flex items-center justify-end gap-2 text-right">
                                                        <span className={`text-sm ${m.homeTeam === match.visitorTeamName ? 'font-bold text-white' : 'text-zinc-400'}`}>
                                                            {m.homeTeam}
                                                        </span>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-sm font-mono font-bold ${m.isWin ? 'bg-emerald-500/20 text-emerald-400' : m.isDraw ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {m.score}
                                                    </div>
                                                    <div className="flex items-center justify-start gap-2 text-left">
                                                        <span className={`text-sm ${m.awayTeam === match.visitorTeamName ? 'font-bold text-white' : 'text-zinc-400'}`}>
                                                            {m.awayTeam}
                                                        </span>
                                                    </div>
                                                    <div className={`w-8 h-6 flex items-center justify-center rounded text-xs font-bold ${m.isWin ? 'bg-emerald-500 text-black' : m.isDraw ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>
                                                        {m.isWin ? 'V' : m.isDraw ? 'E' : 'D'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeMainTab === 'estatisticas' && matchData && (
                            <div className="space-y-6">
                                {/* Filtros de Estatísticas */}
                                <div className="flex gap-4 mb-4">
                                    <div className="relative flex-1">
                                        <select
                                            value={statType}
                                            onChange={(e) => setStatType(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500 uppercase font-bold text-sm tracking-wide"
                                        >
                                            <option value="GERAL">VISÃO GERAL</option>
                                            <option value="GLOSSARIO">GLOSSÁRIO TÉCNICO</option>
                                        </select>
                                    </div>

                                    <div className="relative flex-1">
                                        <select
                                            value={statPeriod}
                                            onChange={(e) => setStatPeriod(e.target.value)}
                                            className="w-full bg-zinc-900 border border-emerald-500 rounded-lg px-4 py-2 text-emerald-400 font-bold appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 text-sm uppercase tracking-wide text-center"
                                        >
                                            <option value="FT">Tempo Regulamentar</option>
                                            <option value="1T">1º Tempo</option>
                                            <option value="2T">2º Tempo</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Lista Principal de Estatísticas */}
                                <div className="space-y-4">
                                    {(() => {
                                        // Helper para renderizar barra de estatística
                                        const renderStatBar = (label: string, valueHome: number, valueAway: number, isPercentage = false) => {
                                            const total = valueHome + valueAway || 1;
                                            const homePercent = (valueHome / total) * 100;
                                            const awayPercent = (valueAway / total) * 100;

                                            // Correção visual para valores zerados ou muito pequenos
                                            const safeHomePercent = valueHome === 0 && valueAway === 0 ? 50 : homePercent;
                                            const safeAwayPercent = valueHome === 0 && valueAway === 0 ? 50 : awayPercent;

                                            return (
                                                <div className="relative mb-2" key={label}>
                                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                                        <span className="text-white text-sm font-bold w-12">{isPercentage ? `${valueHome}%` : valueHome}</span>
                                                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest text-center flex-1">{label}</span>
                                                        <span className="text-white text-sm font-bold w-12 text-right">{isPercentage ? `${valueAway}%` : valueAway}</span>
                                                    </div>
                                                    <div className="flex h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden gap-1">
                                                        <div
                                                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${safeHomePercent}%`, opacity: valueHome === 0 && valueAway === 0 ? 0.3 : 1 }}
                                                        />
                                                        <div
                                                            className="bg-red-500 h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${safeAwayPercent}%`, opacity: valueHome === 0 && valueAway === 0 ? 0.3 : 1 }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        };

                                        // Mapeamento dos dados
                                        const statsList = [
                                            { label: 'Posse de Bola', home: getVal(matchData.localBallPossession), away: getVal(matchData.visitorBallPossession), isPerc: true },
                                            { label: 'Total de Chutes', home: getVal(matchData.localShotsTotal), away: getVal(matchData.visitorShotsTotal) },
                                            { label: 'Chutes a Gol', home: getVal(matchData.localShotsOnGoal), away: getVal(matchData.visitorShotsOnGoal) },
                                            { label: 'Chutes ao Lado', home: getVal(matchData.localShotsOffGoal), away: getVal(matchData.visitorShotsOffGoal) },
                                            { label: 'Escanteios', home: getVal(matchData.localCorners), away: getVal(matchData.visitorCorners) },
                                            { label: 'Ataques', home: getVal(matchData.localAttacksAttacks), away: getVal(matchData.visitorAttacksAttacks) },
                                            { label: 'Ataques Perigosos', home: getVal(matchData.localAttacksDangerousAttacks), away: getVal(matchData.visitorAttacksDangerousAttacks) },
                                            // Novos campos baseados no design solicitado
                                            { label: 'Defesas do Goleiro', home: getVal(matchData.localGoalkeeperSaves), away: getVal(matchData.visitorGoalkeeperSaves) },
                                            { label: 'Faltas', home: getVal(matchData.localFouls), away: getVal(matchData.visitorFouls) },
                                            { label: 'Cartões Amarelos', home: getVal(matchData.localYellowCards), away: getVal(matchData.visitorYellowCards) },
                                            { label: 'Laterais', home: getVal(matchData.localThrowIns), away: getVal(matchData.visitorThrowIns) },
                                            { label: 'Tiro de Meta', home: getVal(matchData.localGoalKicks), away: getVal(matchData.visitorGoalKicks) },
                                        ];

                                        return statsList.map(stat => renderStatBar(stat.label, stat.home, stat.away, stat.isPerc));
                                    })()}
                                </div>

                                {/* Seção de Estatísticas Exclusivas (APPM e Derivados) */}
                                <div className="mt-8 pt-6 border-t border-zinc-800">
                                    <h3 className="text-center text-emerald-500 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                                        Estatísticas Exclusivas
                                    </h3>

                                    {(() => {
                                        const minutes = parseInt(matchData.minute) || 1; // Evitar divisão por zero

                                        // Cálculos de APPM (Attacks Per Minute)
                                        const homeAttacks = getVal(matchData.localAttacksAttacks);
                                        const awayAttacks = getVal(matchData.visitorAttacksAttacks);
                                        const homeDangAttacks = getVal(matchData.localAttacksDangerousAttacks);
                                        const awayDangAttacks = getVal(matchData.visitorAttacksDangerousAttacks);

                                        const appmHome = (homeAttacks / minutes).toFixed(2);
                                        const appmAway = (awayAttacks / minutes).toFixed(2);

                                        const dangAppmHome = (homeDangAttacks / minutes).toFixed(2);
                                        const dangAppmAway = (awayDangAttacks / minutes).toFixed(2);

                                        // Pontuação Máxima (Simulada baseada em pressão/ataques - placeholder para lógica real)
                                        const maxPotHome = ((homeDangAttacks * 2 + homeAttacks) / minutes).toFixed(1);
                                        const maxPotAway = ((awayDangAttacks * 2 + awayAttacks) / minutes).toFixed(1);

                                        const renderExclusiveStat = (label: string, valHome: string | number, valAway: string | number) => (
                                            <div className="relative mb-4">
                                                <div className="flex items-center justify-between mb-1.5 px-1">
                                                    <span className="text-white text-sm font-bold w-12">{valHome}</span>
                                                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest text-center flex-1">{label}</span>
                                                    <span className="text-white text-sm font-bold w-12 text-right">{valAway}</span>
                                                </div>
                                                <div className="flex h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden gap-1">
                                                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '50%' }} /> {/* Visual fixo ou calculado se houver max known */}
                                                    <div className="bg-red-500 h-full rounded-full" style={{ width: '50%' }} />
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <div className="space-y-2">
                                                {renderExclusiveStat('Chutes Dentro da Área', getVal(matchData.localShotsInsideBox), getVal(matchData.visitorShotsInsideBox))}
                                                {renderExclusiveStat('Chutes Fora da Área', getVal(matchData.localShotsOutsideBox), getVal(matchData.visitorShotsOutsideBox))}

                                                <div className="py-2"></div>

                                                {renderExclusiveStat('Ataques por Minuto', appmHome, appmAway)}
                                                {renderExclusiveStat('Ataques Perigosos por Minuto', dangAppmHome, dangAppmAway)}
                                                {renderExclusiveStat('Pontuação Máx. em 1 Min', maxPotHome, maxPotAway)}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {activeMainTab === 'possiveis-entradas' && (
                            <div className="space-y-4">
                                <div className="text-slate-300 text-sm mb-4">
                                    Estratégias identificadas baseadas no comportamento ao vivo do jogo.
                                </div>

                                {/* Debug Panel */}
                                <StrategyDebugPanel
                                    debug={debugInfo}
                                    config={strategyConfig || { htAppm: 1.3, htCorners: 10, ftAppm: 1.1, ftCorners: 15, enableGoals: true, enableCorners: true, enableBothToScore: true }}
                                />

                                {/* Strategies List */}
                                {liveStrategies.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 bg-zinc-900/50 rounded-lg border border-zinc-800 mt-4">
                                        Nenhuma oportunidade identificada com alta confiança no momento.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 mt-4">
                                        {liveStrategies.map((strategy, idx) => (
                                            <div key={idx} className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4 relative overflow-hidden group hover:bg-emerald-500/20 transition-all">
                                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <i className="fa-solid fa-robot text-4xl text-emerald-500"></i>
                                                </div>
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500 text-black px-2 py-0.5 rounded">
                                                                {strategy.type}
                                                            </span>
                                                            <span className="text-emerald-400 font-semibold text-xs animate-pulse">
                                                                ● Ao Vivo
                                                            </span>
                                                        </div>
                                                        <div className="text-white font-bold text-lg mt-1">{strategy.name}</div>
                                                        <div className="text-slate-300 text-sm mt-1">{strategy.description}</div>
                                                    </div>
                                                    <a
                                                        href={`https://www.bet365.com/#/AX/K%5E${match.localTeamName?.replace(/ /g, "+")}/`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                                                    >
                                                        Abrir na Bet365
                                                        <i className="fa-solid fa-external-link-alt text-xs"></i>
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchAnalysisModal;
