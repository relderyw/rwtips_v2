
import React from 'react';
import { Gamepad2, Trophy, Dribbble, Target, Sparkles, ChevronRight } from 'lucide-react';

interface ModuleOption {
    id: 'fifa' | 'futebol' | 'basquete';
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgImage: string;
}

const MODULES: ModuleOption[] = [
    {
        id: 'fifa',
        title: 'FIFA PRO',
        subtitle: 'E-Soccer Live Radar',
        description: 'Monitoramento em tempo real de confrontos e-soccer com inteligência preditiva.',
        icon: <Gamepad2 className="w-8 h-8" />,
        color: 'emerald',
        bgImage: 'https://i.redd.it/pfvj8rw1r0gf1.jpeg'
    },
    {
        id: 'futebol',
        title: 'FUTEBOL',
        subtitle: 'Global Analysis',
        description: 'Análise detalhada de ligas mundiais, tendências de gols e performance de times.',
        icon: <Trophy className="w-8 h-8" />,
        color: 'blue',
        bgImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1586&auto=format&fit=crop'
    },
    {
        id: 'basquete',
        title: 'BASQUETE',
        subtitle: 'NBA Analytics',
        description: 'Estatísticas avançadas da NBA, projeções de pontuação e análise de matchups.',
        icon: <Dribbble className="w-8 h-8" />,
        color: 'orange',
        bgImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1490&auto=format&fit=crop'
    }
];

interface ModuleSelectorProps {
    onSelect: (moduleId: 'fifa' | 'futebol' | 'basquete') => void;
    userName?: string;
    allowedModules?: string[];
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect, userName, allowedModules = ['fifa', 'futebol', 'basquete'] }) => {
    return (
        <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>

            <div className="max-w-6xl w-full z-10">
                <header className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Bem-vindo ao RW TIPS</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4">
                        ESCOLHA SEU <span className="text-emerald-500">MÓDULO</span>
                    </h1>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
                        Selecione a modalidade de análise para começar sua sessão de trading esportivo.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {MODULES.map((module, idx) => (
                        <button
                            key={module.id}
                            onClick={() => {
                                if (!allowedModules?.includes(module.id)) {
                                    alert(`Seu plano atual não inclui acesso ao módulo ${module.title}. Entre em contato com o suporte para fazer um upgrade.`);
                                    return;
                                }
                                onSelect(module.id);
                            }}
                            className={`group relative flex flex-col text-left h-[500px] rounded-[3rem] border border-white/10 overflow-hidden transition-all duration-500 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 ${!allowedModules?.includes(module.id)
                                ? 'opacity-80 grayscale hover:grayscale-0 hover:opacity-100'
                                : 'hover:border-emerald-500/50 hover:scale-[1.02]'
                                }`}
                            style={{ animationDelay: `${idx * 150}ms` }}
                        >
                            <div className="absolute inset-0 z-0">
                                <img
                                    src={module.bgImage}
                                    alt={module.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-60"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent"></div>
                            </div>

                            <div className="relative z-10 mt-auto p-10 flex flex-col h-full">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-white/10 border border-white/20 backdrop-blur-xl group-hover:scale-110 transition-transform duration-500 ${module.color === 'emerald' ? 'group-hover:text-emerald-500 group-hover:border-emerald-500/50' :
                                    module.color === 'blue' ? 'group-hover:text-blue-500 group-hover:border-blue-500/50' :
                                        'group-hover:text-orange-500 group-hover:border-orange-500/50'
                                    }`}>
                                    {module.icon}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded ${module.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                            module.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-orange-500/20 text-orange-400'
                                            }`}>
                                            {module.subtitle}
                                        </span>
                                    </div>
                                    <h3 className="text-4xl font-black italic tracking-tighter mb-4 text-white uppercase group-hover:translate-x-1 transition-transform">{module.title}</h3>
                                    <p className="text-zinc-400 text-sm font-medium leading-relaxed mb-8 opacity-80 group-hover:opacity-100 transition-opacity">
                                        {module.description}
                                    </p>
                                </div>

                                <div className="mt-auto flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white transition-all group-hover:gap-5">
                                    Acessar Agora
                                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <footer className="mt-20 text-center text-zinc-600 text-[10px] font-black uppercase tracking-[0.5em] animate-in fade-in duration-1000 delay-700">
                    RW TIPS &copy; 2026 • Advanced Analytics Platform
                </footer>
            </div>
        </div>
    );
};
