/** Skeleton loading placeholders */

export function SkeletonText({ width = '100%', className = '' }) {
  return (
    <div
      className={`skeleton skeleton-text ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ height = 80 }) {
  return (
    <div
      className="skeleton"
      style={{ height, borderRadius: 'var(--radius-lg)' }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td><div className="skeleton skeleton-text" style={{ width: '40px', height: '40px', borderRadius: '8px' }} /></td>
      <td><SkeletonText width="140px" /></td>
      <td><SkeletonText width="80px" /></td>
      <td><SkeletonText width="60px" /></td>
      <td><SkeletonText width="50px" /></td>
      <td><SkeletonText width="80px" /></td>
    </tr>
  );
}

export function SkeletonCategoryRow() {
  return (
    <div
      style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '8px' }}
      aria-hidden="true"
    >
      <div className="skeleton" style={{ width: '52px', height: '52px', borderRadius: '8px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonText width="160px" />
        <div style={{ marginTop: '6px' }}><SkeletonText width="100px" /></div>
      </div>
      <SkeletonText width="80px" />
    </div>
  );
}
