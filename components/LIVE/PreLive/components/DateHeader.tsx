
import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateHeaderProps {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
}

const DateHeader: React.FC<DateHeaderProps> = ({ selectedDate, setSelectedDate }) => {

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 min-w-[120px] justify-center">
                <Calendar className="w-3 h-3 text-emerald-500" />
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
    );
};

export default DateHeader;
