export default function SimpleBarChart({ data, height = 180, barColor = 'var(--primary)' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value));
  const barWidth = Math.max(12, Math.min(40, (600 / data.length) - 8));

  return (
    <div className="d-flex align-items-end gap-2" style={{ height, paddingTop: 10 }}>
      {data.map((d, i) => (
        <div key={i} className="d-flex flex-column align-items-center" style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            width: barWidth,
            height: max > 0 ? `${(d.value / max) * (height - 40)}px` : '4px',
            background: `linear-gradient(180deg, ${barColor}, ${barColor}88)`,
            borderRadius: '6px 6px 2px 2px',
            transition: 'height 0.6s ease',
            minHeight: '4px',
            opacity: d.value > 0 ? 0.9 : 0.3,
          }}></div>
          <small style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>{d.label}</small>
          <small style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text)' }}>{d.value}</small>
        </div>
      ))}
    </div>
  );
}

export function PieChart({ data, size = 140 }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumAngle = 0;
  const segments = data.map(d => {
    const angle = (d.value / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, start, angle };
  });

  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const toRad = (deg) => (deg - 90) * (Math.PI / 180);
  const toXY = (deg) => [cx + r * Math.cos(toRad(deg)), cy + r * Math.sin(toRad(deg))];

  const paths = segments.map(s => {
    if (s.angle >= 360) return <circle key={s.label} cx={cx} cy={cy} r={r} fill={s.color || '#6366f1'} />;
    if (s.angle <= 0) return null;
    const [x1, y1] = toXY(s.start);
    const [x2, y2] = toXY(s.start + s.angle);
    const large = s.angle > 180 ? 1 : 0;
    return <path key={s.label} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color || '#6366f1'} />;
  });

  return (
    <div className="d-flex flex-column align-items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.5} fill="var(--bg-card)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill="var(--text)">{total}</text>
      </svg>
      <div className="d-flex flex-wrap gap-2 justify-content-center">
        {data.map(d => (
          <div key={d.label} className="d-flex align-items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }}></div>
            <small style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{d.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
