
import React from 'react';
import { Gamepad2, Trophy, Dribbble, ChevronRight, Sparkles } from 'lucide-react';

interface ModuleOption {
    id: 'fifa' | 'futebol' | 'basquete';
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    bgImage: string;
}

const MODULES: ModuleOption[] = [
    {
        id: 'fifa',
        title: 'FIFA PRO',
        subtitle: 'E-Soccer Live Radar',
        description: 'Monitoramento em tempo real de confrontos e-soccer com inteligência preditiva avançada.',
        icon: <Gamepad2 className="w-7 h-7" />,
        bgImage: 'https://i.redd.it/pfvj8rw1r0gf1.jpeg'
    },
    {
        id: 'futebol',
        title: 'FUTEBOL',
        subtitle: 'Global Analysis',
        description: 'Análise detalhada de ligas mundiais, tendências de gols e performance de times.',
        icon: <Trophy className="w-7 h-7" />,
        bgImage: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1586&auto=format&fit=crop'
    },
    {
        id: 'basquete',
        title: 'BASQUETE',
        subtitle: 'NBA Analytics',
        description: 'Estatísticas avançadas da NBA, projeções de pontuação e análise de matchups.',
        icon: <Dribbble className="w-7 h-7" />,
        bgImage: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1490&auto=format&fit=crop'
    }
];

interface ModuleSelectorProps {
    onSelect: (moduleId: 'fifa' | 'futebol' | 'basquete') => void;
    userName?: string;
    allowedModules?: string[];
    onAdminClick?: () => void;
    onLogout?: () => void;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect, userName, allowedModules = ['fifa', 'futebol', 'basquete'], onAdminClick, onLogout }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% -20%, #13131A 0%, #07070A 60%)' }}>

            {/* Subtle background grid */}
            <div className="absolute inset-0 opacity-[0.015]"
                style={{ backgroundImage: 'linear-gradient(#1E1E28 1px, transparent 1px), linear-gradient(90deg, #1E1E28 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

            {/* Accent glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.06] blur-[120px] pointer-events-none"
                style={{ background: '#C8A96E', borderRadius: '50%' }}></div>

            <div className="max-w-5xl w-full z-10">
                {/* Header */}
                <header className="text-center mb-14 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
                        style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.25)' }}>
                        <Sparkles className="w-3.5 h-3.5" style={{ color: '#C8A96E' }} />
                        <span className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: '#C8A96E' }}>RW TIPS — Analytics Platform</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3" style={{ color: '#F0F0F4' }}>
                        Selecione o <span style={{ color: '#C8A96E' }}>Módulo</span>
                    </h1>
                    <p className="text-sm" style={{ color: '#8888A0', maxWidth: '480px', margin: '0 auto' }}>
                        Escolha a modalidade de análise para iniciar sua sessão de trading esportivo.
                    </p>
                </header>

                {/* Module Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {MODULES.map((module, idx) => {
                        const isAllowed = allowedModules?.includes(module.id);
                        return (
                            <button
                                key={module.id}
                                onClick={() => {
                                    if (!isAllowed) {
                                        alert(`Seu plano atual não inclui acesso ao módulo ${module.title}. Entre em contato com o suporte para fazer um upgrade.`);
                                        return;
                                    }
                                    onSelect(module.id);
                                }}
                                className={`group relative flex flex-col text-left h-[420px] rounded-2xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-6 ${!isAllowed ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-80' : 'hover:scale-[1.02]'}`}
                                style={{
                                    background: '#0D0D12',
                                    border: '1px solid #1E1E28',
                                    animationDelay: `${idx * 120}ms`,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                                }}
                                onMouseEnter={e => { if (isAllowed) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,169,110,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,169,110,0.1)'; } }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E28'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)'; }}
                            >
                                {/* Background Image */}
                                <div className="absolute inset-0">
                                    <img src={module.bgImage} alt={module.title}
                                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105 opacity-20 group-hover:opacity-30" />
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #0D0D12 25%, transparent 100%)' }}></div>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 mt-auto p-7 flex flex-col">
                                    {/* Icon */}
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                                        style={{ background: '#13131A', border: '1px solid #1E1E28', color: '#8888A0' }}>
                                        {module.icon}
                                    </div>

                                    {/* Tag */}
                                    <span className="text-[9px] font-medium uppercase tracking-[0.2em] mb-2" style={{ color: '#44445A' }}>
                                        {module.subtitle}
                                    </span>

                                    {/* Title */}
                                    <h3 className="text-2xl font-bold tracking-tight mb-3 transition-transform group-hover:translate-x-0.5"
                                        style={{ color: '#F0F0F4' }}>
                                        {module.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm leading-relaxed mb-6" style={{ color: '#8888A0' }}>
                                        {module.description}
                                    </p>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2.5 text-xs font-medium transition-all group-hover:gap-4"
                                        style={{ color: '#C8A96E' }}>
                                        {isAllowed ? 'Acessar módulo' : 'Sem acesso'}
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                                            style={{ border: '1px solid rgba(200,169,110,0.25)', background: 'rgba(200,169,110,0.1)' }}>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <footer className="mt-12 text-center animate-in fade-in duration-700 delay-500 flex flex-col items-center gap-4">
                    {(onAdminClick || onLogout) && (
                        <div className="flex items-center gap-3">
                            {onAdminClick && (
                                <button onClick={onAdminClick}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all"
                                    style={{ background: 'rgba(200,169,110,0.1)', border: '1px solid rgba(200,169,110,0.2)', color: '#C8A96E' }}>
                                    <i className="fa-solid fa-shield-halved text-xs"></i>
                                    Painel Admin
                                </button>
                            )}
                            {onLogout && (
                                <button onClick={onLogout}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-medium uppercase tracking-widest transition-all"
                                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171' }}>
                                    <i className="fa-solid fa-power-off text-xs"></i>
                                    Sair
                                </button>
                            )}
                        </div>
                    )}
                    <p className="text-[10px] font-medium tracking-[0.4em]" style={{ color: '#44445A' }}>
                        RW TIPS © 2026 • Advanced Analytics Platform
                    </p>
                </footer>
            </div>
        </div>
    );
};
