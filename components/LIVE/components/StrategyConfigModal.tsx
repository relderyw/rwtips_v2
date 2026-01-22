import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Zap, Flame, Shield, Target } from 'lucide-react';
import { StrategyConfig, defaultStrategyConfig, strategyPresets } from '../utils/liveStrategies';

interface StrategyConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentConfig: StrategyConfig;
    onSave: (config: StrategyConfig) => void;
}

const StrategyConfigModal: React.FC<StrategyConfigModalProps> = ({ isOpen, onClose, currentConfig, onSave }) => {
    const [config, setConfig] = useState<StrategyConfig>(currentConfig);

    useEffect(() => {
        setConfig(currentConfig);
    }, [currentConfig, isOpen]);

    const handleChange = (key: keyof StrategyConfig, value: any) => {
        let newValue = value;
        if (typeof config[key] === 'number') {
            newValue = parseFloat(value) || 0;
        }
        setConfig(prev => ({ ...prev, [key]: newValue }));
    };

    const handleReset = () => {
        setConfig(defaultStrategyConfig);
    };

    const loadPreset = (presetKey: keyof typeof strategyPresets) => {
        setConfig(strategyPresets[presetKey].config);
    };

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-900/10">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <i className="fa-solid fa-sliders text-emerald-500"></i>
                        Configurar Estratégias
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Presets Section */}
                    <div className="space-y-3">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            ⚡ Configurações Rápidas
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => loadPreset('botDefault')}
                                className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl hover:border-orange-500/60 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Flame size={16} className="text-orange-500" />
                                    <span className="text-xs font-bold text-orange-400">Padrão Bot</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Alta intensidade original</p>
                            </button>

                            <button
                                onClick={() => loadPreset('superPressure')}
                                className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl hover:border-yellow-500/60 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={16} className="text-yellow-500" />
                                    <span className="text-xs font-bold text-yellow-400">Super Pressão</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Domínio extremo</p>
                            </button>

                            <button
                                onClick={() => loadPreset('volumeGame')}
                                className="p-3 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/60 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield size={16} className="text-blue-500" />
                                    <span className="text-xs font-bold text-blue-400">Volume de Jogo</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Foco em escanteios</p>
                            </button>

                            <button
                                onClick={() => loadPreset('conservative')}
                                className="p-3 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl hover:border-emerald-500/60 transition-all text-left group"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Target size={16} className="text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-400">Conservador</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Mais oportunidades</p>
                            </button>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                            <p className="text-[10px] text-zinc-400 leading-relaxed">
                                💡 <span className="font-semibold text-zinc-300">APPM</span> = Ataques Perigosos Por Minuto.
                                <span className="text-emerald-400"> &gt; 1.0</span> significa 1+ ataque perigoso/min.
                                <br />
                                💡 <span className="font-semibold text-zinc-300">CG</span> = Corners + Chutes (Volume de pressão).
                            </p>
                        </div>
                    </div>

                    {/* 1st Half Section */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            1º Tempo (HT)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold mb-1 ml-1">Mín. APPM</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.htAppm}
                                    onChange={(e) => handleChange('htAppm', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold mb-1 ml-1">Mín. CG (Cantos+Chutes)</label>
                                <input
                                    type="number"
                                    value={config.htCorners}
                                    onChange={(e) => handleChange('htCorners', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2nd Half Section */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            2º Tempo (FT)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold mb-1 ml-1">Mín. APPM</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.ftAppm}
                                    onChange={(e) => handleChange('ftAppm', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs font-bold mb-1 ml-1">Mín. CG (Cantos+Chutes)</label>
                                <input
                                    type="number"
                                    value={config.ftCorners}
                                    onChange={(e) => handleChange('ftCorners', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Toggles Section */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            Tipos de Sinais
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                                <span className="text-sm font-semibold text-zinc-200">Gols (Over)</span>
                                <input
                                    type="checkbox"
                                    checked={config.enableGoals}
                                    onChange={(e) => handleChange('enableGoals', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-700"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                                <span className="text-sm font-semibold text-zinc-200">Escanteios</span>
                                <input
                                    type="checkbox"
                                    checked={config.enableCorners}
                                    onChange={(e) => handleChange('enableCorners', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-700"
                                />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                                <span className="text-sm font-semibold text-zinc-200">Ambas Marcam</span>
                                <input
                                    type="checkbox"
                                    checked={config.enableBothToScore}
                                    onChange={(e) => handleChange('enableBothToScore', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-700"
                                />
                            </label>
                        </div>
                    </div>

                </div>

                <div className="p-4 border-t border-zinc-800 flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} />
                        Resetar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[2] px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        Salvar Configuração
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyConfigModal;
