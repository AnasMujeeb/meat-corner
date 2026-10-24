/**
 * Toggle switch component.
 * Usage: <Toggle id="my-toggle" checked={val} onChange={handler} label="Active" />
 */
export default function Toggle({ id, checked, onChange, label, disabled = false }) {
  return (
    <label className="toggle-wrap" htmlFor={id} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <span className="toggle">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          aria-label={label}
        />
        <span className="toggle-track" aria-hidden="true" />
        <span className="toggle-thumb" aria-hidden="true" />
      </span>
      {label && <span className="toggle-label">{label}</span>}
    </label>
  );
}
