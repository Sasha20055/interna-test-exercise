import { searchSelectOptions } from './search-select-match';
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './search-select.module.css';

interface ISearchSelectProps {
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  label: string;
  className?: string;
}

export function SearchSelect({
  value,
  onValueChange,
  children,
  label,
  className,
}: ISearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  const options = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ value: string | number; children: ReactNode }>(child) ||
      child.type !== 'option'
    )
      return [];
    return [
      {
        value: String(child.props.value),
        label: Children.toArray(child.props.children).join(''),
      },
    ];
  });
  const selected = options.find((option) => option.value === String(value));
  const filtered = searchSelectOptions(options, query);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const popup = panel.current;
    popup?.showPopover?.();
    const position = () => {
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds || !popup) return;
      popup.style.width = `${Math.min(Math.max(bounds.width, 220), window.innerWidth - 24)}px`;
      popup.style.left = `${Math.max(12, Math.min(bounds.left, window.innerWidth - popup.offsetWidth - 12))}px`;
      const availableBelow = window.innerHeight - bounds.bottom - 12;
      const below = availableBelow >= Math.min(260, bounds.top - 12);
      popup.style.maxHeight = `${Math.max(100, below ? availableBelow : bounds.top - 12)}px`;
      popup.style.top = below ? `${bounds.bottom + 4}px` : 'auto';
      popup.style.bottom = below
        ? 'auto'
        : `${window.innerHeight - bounds.top + 4}px`;
    };
    position();
    search.current?.focus();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      popup?.hidePopover?.();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <span
      ref={root}
      className={styles.root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        if (event.key === 'Tab' && open) {
          trigger.current?.focus();
          setOpen(false);
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) {
            setQuery('');
            setOpen(true);
            return;
          }
          const buttons = Array.from(
            panel.current?.querySelectorAll<HTMLButtonElement>(
              '[role="option"]',
            ) ?? [],
          );
          const index = buttons.findIndex(
            (button) => button === document.activeElement,
          );
          const next =
            event.key === 'ArrowDown'
              ? (index + 1) % buttons.length
              : index <= 0
                ? buttons.length - 1
                : index - 1;
          buttons[next]?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="listbox"
        className={`${styles.trigger} ${className ?? ''}`}
        onClick={() => {
          setQuery('');
          setOpen(!open);
        }}
      >
        <span>{selected?.label ?? String(value)}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div ref={panel} popover="manual" className={styles.panel}>
          <input
            ref={search}
            className={styles.search}
            aria-label={`Поиск: ${label}`}
            placeholder="Поиск…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && filtered[0]) {
                event.preventDefault();
                onValueChange(filtered[0].value);
                close();
              }
            }}
          />
          <div
            id={id}
            role="listbox"
            aria-label={label}
            className={styles.options}
          >
            {filtered.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === String(value)}
                key={option.value}
                className={styles.option}
                onClick={(event) => {
                  event.preventDefault();
                  onValueChange(option.value);
                  close();
                }}
              >
                {option.label}
                <span aria-hidden="true">
                  {option.value === String(value) ? '✓' : ''}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className={styles.empty} role="status">
              Ничего не найдено
            </p>
          )}
        </div>
      )}
    </span>
  );
}
