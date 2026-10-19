export function Brand({ compact = false }) {
    return <div className={`brand ${compact ? 'brand--compact' : ''}`}><span className="brand__mark">Z+X</span>{!compact && <strong>Zuratax</strong>}</div>;
}
