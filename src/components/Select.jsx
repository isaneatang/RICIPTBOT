/**
 * Select — a custom, fully-JS dropdown (listbox pattern).
 *
 * Native <select> menus are rendered by the OS and frequently FAIL to open
 * inside mobile wallet browsers (Trust / MetaMask in-app browsers / WebViews).
 * This component expands its options via DOM + JS instead, so the list always
 * opens regardless of the host browser, while staying keyboard accessible.
 *
 * API mirrors the native select enough to drop in:
 *   value, onChange(value), options: [{ value, label, disabled? }], placeholder
 */
import { useEffect, useRef, useState } from 'react';

export default function Select({
  id,
  className,
  value,
  placeholder = 'Select…',
  options = [],
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return;
    setHighlighted(options.findIndex((o) => o.value === value));

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlighted((i) => enabled[(enabled.indexOf(i) + 1) % enabled.length]);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlighted((i) => {
          const idx = enabled.indexOf(i);
          return enabled[(idx - 1 + enabled.length) % enabled.length];
        });
      } else if (event.key === 'Home') {
        event.preventDefault();
        setHighlighted(enabled[0]);
      } else if (event.key === 'End') {
        event.preventDefault();
        setHighlighted(enabled[enabled.length - 1]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const option = options[highlighted];
        if (option && !option.disabled) {
          pick(option);
        }
      }
    };
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open, options, value]);

  const pick = (option) => {
    if (option.disabled || option.value === value) {
      return;
    }
    setOpen(false);
    onChange?.(option.value);
  };

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div className={['select', className].filter(Boolean).join(' ')} ref={containerRef}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className="select__control field__input"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="select__value">{selectedLabel}</span>
        <span className="select__arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="select__menu" role="listbox" ref={listRef}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const isHighlighted = index === highlighted;
            return (
              <li
                key={String(option.value)}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                className={
                  'select__option-wrapper' +
                  (selected ? ' select__option-wrapper--selected' : '') +
                  (option.disabled ? ' select__option-wrapper--disabled' : '')
                }
              >
                <button
                  type="button"
                  className={
                    'select__option' +
                    (isHighlighted ? ' select__option--highlighted' : '') +
                    (selected ? ' select__option--selected' : '') +
                    (option.disabled ? ' select__option--disabled' : '')
                  }
                  disabled={option.disabled}
                  onClick={() => pick(option)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
