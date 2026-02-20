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
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-all"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-900/10 flex flex-col max-h-[95vh]">
                <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
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

                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">

                    {/* Presets Section */}
                    <div className="space-y-3">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            ⚡ Configurações Rápidas
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => loadPreset('botDefault')}
                                className="p-2.5 bg-zinc-800/50 border border-orange-500/20 rounded-xl hover:border-orange-500/40 transition-all text-left flex items-center gap-2 group"
                            >
                                <Flame size={14} className="text-orange-500" />
                                <div>
                                    <div className="text-[10px] font-black text-orange-400 uppercase tracking-wider">Padrão Bot</div>
                                    <p className="text-[8px] text-zinc-500 leading-none">Alta intensidade</p>
                                </div>
                            </button>

                            <button
                                onClick={() => loadPreset('superPressure')}
                                className="p-2.5 bg-zinc-800/50 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all text-left flex items-center gap-2 group"
                            >
                                <Zap size={14} className="text-yellow-500" />
                                <div>
                                    <div className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Pressão</div>
                                    <p className="text-[8px] text-zinc-500 leading-none">Domínio extremo</p>
                                </div>
                            </button>

                            <button
                                onClick={() => loadPreset('volumeGame')}
                                className="p-2.5 bg-zinc-800/50 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all text-left flex items-center gap-2 group"
                            >
                                <Shield size={14} className="text-blue-500" />
                                <div>
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Volume</div>
                                    <p className="text-[8px] text-zinc-500 leading-none">Escanteios</p>
                                </div>
                            </button>

                            <button
                                onClick={() => loadPreset('conservative')}
                                className="p-2.5 bg-zinc-800/50 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all text-left flex items-center gap-2 group"
                            >
                                <Target size={14} className="text-emerald-500" />
                                <div>
                                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Conservador</div>
                                    <p className="text-[8px] text-zinc-500 leading-none">Mais chances</p>
                                </div>
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
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Mín. APPM</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.htAppm}
                                    onChange={(e) => handleChange('htAppm', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Mín. CG</label>
                                <input
                                    type="number"
                                    value={config.htCorners}
                                    onChange={(e) => handleChange('htCorners', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2nd Half Section */}
                    <div className="space-y-4">
                        <h3 className="text-emerald-500 text-xs font-bold uppercase tracking-widest border-b border-emerald-500/20 pb-2">
                            2º Tempo (FT)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Mín. APPM</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={config.ftAppm}
                                    onChange={(e) => handleChange('ftAppm', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-1">Mín. CG</label>
                                <input
                                    type="number"
                                    value={config.ftCorners}
                                    onChange={(e) => handleChange('ftCorners', e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none transition-colors font-mono"
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
                            <label className="flex items-center justify-between p-2.5 bg-zinc-800/30 border border-zinc-700/50 rounded-xl cursor-pointer hover:bg-zinc-800/80 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Gols (Over)</span>
                                <input
                                    type="checkbox"
                                    checked={config.enableGoals}
                                    onChange={(e) => handleChange('enableGoals', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-700"
                                />
                            </label>
                            <label className="flex items-center justify-between p-2.5 bg-zinc-800/30 border border-zinc-700/50 rounded-xl cursor-pointer hover:bg-zinc-800/80 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Escanteios</span>
                                <input
                                    type="checkbox"
                                    checked={config.enableCorners}
                                    onChange={(e) => handleChange('enableCorners', e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-700"
                                />
                            </label>
                            <label className="flex items-center justify-between p-2.5 bg-zinc-800/30 border border-zinc-700/50 rounded-xl cursor-pointer hover:bg-zinc-800/80 transition-colors">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Ambas Marcam</span>
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

                <div className="p-4 border-t border-zinc-800 flex gap-3 shrink-0">
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
