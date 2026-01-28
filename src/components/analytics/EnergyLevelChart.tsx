'use client';

import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    Tooltip,
    Cell
} from 'recharts';
import { DailyStats } from '@/lib/analytics';
import { format, parseISO } from 'date-fns';

export default function EnergyLevelChart({ data }: { data: DailyStats[] }) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-zinc-400">
                No energy data available yet
            </div>
        );
    }

    // Filter out days with no energy data recorded (keep 0 if it means low, but undefined is no data)
    // Assuming 0 means no data in this context if not set
    const energyData = data.map(d => ({
        ...d,
        energy: d.energy || 0, // 0 will be gray or hidden
        displayDate: format(parseISO(d.date), 'MMM d')
    })).filter(d => d.energy > 0 || d.productivityScore > 0); // Show days with activity

    const getColor = (level: number) => {
        if (level >= 4) return 'var(--color-green-500)'; // High energy
        if (level === 3) return 'var(--color-gold)';      // Medium
        if (level <= 2) return 'var(--color-red-400)';   // Low
        return 'var(--color-mist)';
    };

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <XAxis
                        dataKey="date"
                        name="Date"
                        tickFormatter={(str) => format(parseISO(str), 'MM/dd')}
                        tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
                        minTickGap={30}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        type="number"
                        dataKey="energy"
                        name="Energy Level"
                        domain={[0, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                    />
                    <ZAxis type="number" dataKey="productivityScore" range={[50, 400]} name="Productivity" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        boxShadow: 'var(--shadow-soft)'
                                    }}>
                                        <p style={{ fontWeight: 500 }}>{format(parseISO(data.date), 'EEEE, MMM d')}</p>
                                        <p>Energy: {data.energy}/5</p>
                                        <p>Productivity: {data.productivityScore}%</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Scatter name="Energy" data={energyData} shape="circle">
                        {energyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.energy)} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
