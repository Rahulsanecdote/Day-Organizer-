export default function StatCard({
    label,
    value,
    trend, // percentage change or string description
    trendDirection = 'neutral',
    icon
}: {
    label: string,
    value: string | number,
    trend?: string,
    trendDirection?: 'up' | 'down' | 'neutral',
    icon: React.ReactNode
}) {
    const trendColors = {
        up: 'text-green-600',
        down: 'text-red-500',
        neutral: 'text-zinc-400'
    };

    return (
        <div
            className="rounded-xl p-6 flex flex-col justify-between h-full"
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-soft)'
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--color-ivory)' }}
                >
                    {icon}
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 ${trendColors[trendDirection]}`}>
                        {trend}
                    </span>
                )}
            </div>

            <div>
                <h3 className="text-3xl font-medium mb-1" style={{ color: 'var(--color-charcoal)' }}>
                    {value}
                </h3>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mist)' }}>
                    {label}
                </p>
            </div>
        </div>
    );
}
