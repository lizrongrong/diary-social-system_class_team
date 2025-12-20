import React, { forwardRef, useRef } from 'react';

let __selectIdCounter = 0;
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({
  label,
  options = [],
  error,
  helperText,
  required = false,
  disabled = false,
  className = '',
  placeholder = '請選擇',
  ...props
}, ref) => {
  const idRef = useRef(props.id || `select-${props.name || 's'}-${++__selectIdCounter}`);
  const selectId = idRef.current;

  return (
    <div className={`input-wrapper ${className}`}>
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
          {required && <span className="required-mark"> *</span>}
        </label>
      )}
      <div className="select-container">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`input-field select-field ${error ? 'input-error' : ''}`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="select-icon" size={20} />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
