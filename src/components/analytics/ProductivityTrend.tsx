'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { DailyStats } from '@/lib/analytics';
import { format, parseISO } from 'date-fns';

export default function ProductivityTrend({ data }: { data: DailyStats[] }) {
    if (data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-zinc-400">
                No trend data available yet
            </div>
        );
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-gold)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                    <XAxis
                        dataKey="date"
                        tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                        tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={30}
                    />
                    <Tooltip
                        labelFormatter={(label) => format(parseISO(label), 'EEEE, MMM d')}
                        contentStyle={{
                            background: 'var(--color-surface)',
                            borderColor: 'var(--color-border)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-soft)'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="productivityScore"
                        name="Productivity"
                        stroke="var(--color-gold)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorProd)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
