'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { HabitStats } from '@/lib/analytics';

export default function HabitChart({ data }: { data: HabitStats[] }) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-zinc-400">
                No habit data available yet
            </div>
        );
    }

    // Sort by completion rate
    const sortedData = [...data]
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 5); // Top 5

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border-light)" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fill: 'var(--color-charcoal)', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{
                            background: 'var(--color-surface)',
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    />
                    <Bar dataKey="completionRate" radius={[0, 4, 4, 0]} barSize={20}>
                        {sortedData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.completionRate > 80 ? 'var(--color-gold)' : 'var(--color-gold-light)'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
