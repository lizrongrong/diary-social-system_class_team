import React, { forwardRef, useRef } from 'react';

// module-level counter to ensure generated ids are unique across instances
let __inputIdCounter = 0;

const Input = forwardRef(({
  type = 'text',
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  // Persist a stable id for this input instance to avoid duplicate ids
  const idRef = useRef(props.id || `input-${props.name || 'fld'}-${++__inputIdCounter}`);
  const inputId = idRef.current;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required-mark"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        className={`form-input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
