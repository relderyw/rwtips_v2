
import React from 'react';
import { ViewType } from '../../types';
import { Calendar, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import clsx from 'clsx';

interface HeaderProps {
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, selectedDate, setSelectedDate, onRefresh }) => {

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const navItems: { id: ViewType; label: string }[] = [
        { id: 'LIVE', label: 'AO VIVO' },
        { id: 'PRE_LIVE', label: 'PRÉ-LIVE' },
        { id: 'FINISHED', label: 'RESULTADOS' }
    ];

    return (
        <header className="sticky top-0 z-[50] w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-4">
                    <div
                        className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 cursor-pointer hover:scale-105 transition-transform"
                        onClick={onRefresh}
                    >
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm font-black text-white tracking-widest uppercase">MakeYourStats</h1>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Match Intelligence</div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    {navItems.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id)}
                            className={clsx(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all",
                                activeView === tab.id
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Date Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 min-w-[120px] justify-center">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span className="text-[11px] font-black text-white uppercase pt-0.5">
                            {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
