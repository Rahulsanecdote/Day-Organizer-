export default function DashboardLoading() {
    return (
        <div
            className="flex items-center justify-center min-h-[60vh]"
            aria-label="Loading"
            role="status"
        >
            <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--color-gold)', borderTopColor: 'transparent' }}
            />
        </div>
    );
}
