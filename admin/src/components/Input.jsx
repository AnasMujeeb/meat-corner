import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, id, className = '', ...props }, ref) {
  return (
    <div className={`form-group ${className}`} style={{ margin: 0 }}>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`input${error ? ' error' : ''}`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
