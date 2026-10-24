import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = '',
    isLoading = false,
    className = '',
    ...props
  },
  ref
) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size ? `btn-${size}` : '',
    isLoading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={cls} disabled={isLoading || props.disabled} {...props}>
      {isLoading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
