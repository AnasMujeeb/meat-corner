import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Chip (tag) input with autocomplete suggestions.
 * value: string[]
 * onChange: (values: string[]) => void
 * suggestions: string[]  — shown as autocomplete
 */
export default function ChipInput({
  id,
  label,
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add...',
  error,
}) {
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(inputVal.toLowerCase()) && !value.includes(s)
  );

  function addChip(chip) {
    const trimmed = chip.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputVal('');
    setShowSuggestions(false);
    setHighlighted(-1);
  }

  function removeChip(chip) {
    onChange(value.filter((v) => v !== chip));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) {
        addChip(filtered[highlighted]);
      } else if (inputVal.trim()) {
        addChip(inputVal);
      }
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!wrapRef.current?.contains(e.target)) setShowSuggestions(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <div
        className={`chip-input-wrap${error ? ' error' : ''}`}
        onClick={() => inputRef.current?.focus()}
        role="group"
        aria-label={label}
      >
        {value.map((chip) => (
          <span key={chip} className="chip">
            {chip}
            <button
              type="button"
              className="chip-remove"
              onClick={(e) => { e.stopPropagation(); removeChip(chip); }}
              aria-label={`Remove ${chip}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="chip-input-field"
          value={inputVal}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowSuggestions(true);
            setHighlighted(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && filtered.length > 0}
          aria-controls={`${id}-suggestions`}
          autoComplete="off"
        />
      </div>
      {error && <p className="field-error">{error}</p>}

      {showSuggestions && filtered.length > 0 && (
        <div className="chip-suggestions" id={`${id}-suggestions`} role="listbox">
          {filtered.map((s, i) => (
            <div
              key={s}
              className={`chip-suggestion-item${i === highlighted ? ' highlighted' : ''}`}
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => { e.preventDefault(); addChip(s); }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
