export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}><span className="brand__mark">Z</span>{!compact && <strong>Zuratax</strong>}</div>
}
