import React from 'react';
import { Activity, Target, TrendingUp, Clock } from 'lucide-react';
import { StrategyConfig } from '../utils/liveStrategies';

interface StrategyDebugPanelProps {
    debug?: {
        appmHome: number;
        appmAway: number;
        appmTotal: number;
        cgHome: number;
        cgAway: number;
        cgTotal: number;
        time: number;
        scoreHome: number;
        scoreAway: number;
    };
    config: StrategyConfig;
}

const StrategyDebugPanel: React.FC<StrategyDebugPanelProps> = ({ debug, config }) => {
    if (!debug) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
                <p className="text-zinc-500 text-sm">Aguardando dados do jogo...</p>
            </div>
        );
    }

    const isT1 = debug.time <= 43;
    const isT2 = debug.time >= 50 && debug.time <= 85;
    const phase = isT1 ? '1º Tempo' : isT2 ? '2º Tempo' : 'Intervalo';

    const MetricCard = ({ label, value, threshold, icon: Icon, isGood }: any) => (
        <div className={`bg-zinc-800/50 border ${isGood ? 'border-emerald-500/30' : 'border-zinc-700'} rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={16} className={isGood ? 'text-emerald-500' : 'text-zinc-500'} />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
                </div>
                {isGood ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">✓</span>
                ) : (
                    <span className="text-xs bg-zinc-700/50 text-zinc-500 px-2 py-0.5 rounded-full font-bold">✗</span>
                )}
            </div>
            <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${isGood ? 'text-emerald-400' : 'text-zinc-400'}`}>
                    {value}
                </span>
                <span className="text-xs text-zinc-500">
                    / {threshold} min
                </span>
            </div>
        </div>
    );

    const currentAppm = isT1 ? config.htAppm : config.ftAppm;
    const currentCg = isT1 ? config.htCorners : config.ftCorners;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            <Activity size={16} />
                            Métricas em Tempo Real
                        </h3>
                        <p className="text-zinc-400 text-xs mt-1">
                            Critérios para ativação de estratégias
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-emerald-400 font-bold text-lg">{debug.time}'</div>
                        <div className="text-zinc-500 text-xs">{phase}</div>
                    </div>
                </div>
            </div>

            {/* Placar */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-center">
                    <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Placar Atual</div>
                    <div className="text-4xl font-bold text-white">
                        {debug.scoreHome} <span className="text-zinc-600">x</span> {debug.scoreAway}
                    </div>
                </div>
            </div>

            {/* APPM Metrics */}
            <div>
                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <TrendingUp size={14} />
                    APPM (Ataques Perigosos Por Minuto)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <MetricCard
                        label="Casa"
                        value={debug.appmHome}
                        threshold={currentAppm}
                        icon={Target}
                        isGood={debug.appmHome >= currentAppm}
                    />
                    <MetricCard
                        label="Fora"
                        value={debug.appmAway}
                        threshold={currentAppm}
                        icon={Target}
                        isGood={debug.appmAway >= currentAppm}
                    />
                    <MetricCard
                        label="Total"
                        value={debug.appmTotal}
                        threshold={currentAppm}
                        icon={Target}
                        isGood={debug.appmTotal >= currentAppm}
                    />
                </div>
            </div>

            {/* CG Metrics */}
            <div>
                <h4 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock size={14} />
                    CG (Cantos + Chutes)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <MetricCard
                        label="Casa"
                        value={debug.cgHome}
                        threshold={currentCg}
                        icon={Activity}
                        isGood={debug.cgHome >= currentCg}
                    />
                    <MetricCard
                        label="Fora"
                        value={debug.cgAway}
                        threshold={currentCg}
                        icon={Activity}
                        isGood={debug.cgAway >= currentCg}
                    />
                    <MetricCard
                        label="Total"
                        value={debug.cgTotal}
                        threshold={currentCg}
                        icon={Activity}
                        isGood={debug.cgTotal >= currentCg}
                    />
                </div>
            </div>

            {/* Explanation */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-400 text-xs leading-relaxed">
                    💡 <span className="font-semibold text-zinc-300">Critérios atuais ({phase}):</span>
                    <br />
                    • APPM ≥ <span className="text-emerald-400 font-bold">{currentAppm}</span> (Pressão)
                    <br />
                    • CG ≥ <span className="text-emerald-400 font-bold">{currentCg}</span> (Volume)
                    <br />
                    <br />
                    ✓ = Critério atendido | ✗ = Critério não atendido
                </p>
            </div>
        </div>
    );
};

export default StrategyDebugPanel;
