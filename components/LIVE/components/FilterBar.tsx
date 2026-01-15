import React from 'react';

interface FilterBarProps {
    leagues: string[];
    selectedLeague: string;
    onLeagueChange: (league: string) => void;
    selectedStatus: string;
    onStatusChange: (status: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
    leagues,
    selectedLeague,
    onLeagueChange,
    selectedStatus,
    onStatusChange
}) => {
    const statuses = [
        { id: 'ALL', label: 'Todos' },
        { id: 'LIVE', label: 'Ao Vivo' },
        { id: 'FT', label: 'Finalizados' },
        { id: 'NS', label: 'Agendados' }
    ];

    return (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 mb-6 sticky top-4 z-40 shadow-2xl shadow-black/50">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Status Filters */}
                <div className="flex bg-black/40 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar border border-zinc-800/50">
                    {statuses.map(status => (
                        <button
                            key={status.id}
                            onClick={() => onStatusChange(status.id)}
                            className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap
                ${selectedStatus === status.id
                                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-white/5'}
              `}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>

                {/* League Select */}
                <div className="relative w-full md:w-64">
                    <select
                        value={selectedLeague}
                        onChange={(e) => onLeagueChange(e.target.value)}
                        className="w-full appearance-none bg-black/40 border border-zinc-700 text-zinc-300 rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer hover:border-zinc-600"
                    >
                        <option value="ALL">Todas as Ligas</option>
                        {leagues.map((league) => (
                            <option key={league} value={league}>
                                {league}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FilterBar;
