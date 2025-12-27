
import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { ChartDataPoint } from '../types';

interface BetChartProps {
  data: ChartDataPoint[];
}

export function BetChart({ data }: BetChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-white/20">
        <p className="text-[10px] font-black uppercase tracking-widest">Sem dados suficientes para o gráfico</p>
      </div>
    );
  }

  const isPositive = (data[data.length - 1]?.balance || 0) >= (data[0]?.balance || 0);

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 0,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#ffffff40" 
            tick={{fill: '#ffffff40', fontSize: 10, fontWeight: 700}}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis 
            stroke="#ffffff40" 
            tick={{fill: '#ffffff40', fontSize: 10, fontWeight: 700}}
            axisLine={false}
            tickLine={false}
            dx={-10}
            tickFormatter={(value) => 
              new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
            }
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0a0a0c', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '12px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
            formatter={(value: number) => [
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
              'Banca'
            ]}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke={isPositive ? "#10b981" : "#f43f5e"} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
