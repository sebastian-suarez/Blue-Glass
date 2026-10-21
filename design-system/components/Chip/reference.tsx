import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from './Icon';

export type ChipTone = 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';

export interface ChipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  /** The text. Keep it to a word or two. */
  label: React.ReactNode;
  /** chip: the site's stack tag (.chip, default). plate: the employer plate (.plate), larger and lifted. */
  variant?: 'chip' | 'plate';
  /** md (default) or sm (.chip-sm). */
  size?: 'sm' | 'md';
  /** A status or accent fill: the *-soft ground with status text. Pair a status with a word or icon. */
  tone?: ChipTone;
  /** An icon before the label (14px; 12px at sm). */
  icon?: React.ReactNode;
  /** An Avatar before the label, shrunk to 20px. Leave its alt off when the label already names it. */
  avatar?: React.ReactNode;
  /** Makes the chip a button. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Hover and press styling without onClick, e.g. inside your own button. */
  clickable?: boolean;
  /** Makes the chip a link. */
  href?: string;
  target?: string;
  rel?: string;
  /** Adds a trailing close button; Backspace or Delete on the chip calls it too. */
  onDelete?: (event: React.SyntheticEvent) => void;
  /** The close button's name. Default "Remove {label}". */
  deleteLabel?: string;
  /** Replace the close glyph. */
  deleteIcon?: React.ReactNode;
  /** Pressed: ink fill with on-ink text. Sets aria-pressed on a button chip (aria-current on a link). */
  selected?: boolean;
  disabled?: boolean;
  /** Element for a static chip. Default span; use "li" inside a list of chips. */
  component?: React.ElementType;
}

/** A compact tag: the site's stack chip, the employer plate, a filter you toggle or a value you remove. */
export const Chip = React.forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    label, variant = 'chip', size = 'md', tone = 'default', icon, avatar, onClick, clickable = false, href, target, rel,
    onDelete, deleteLabel, deleteIcon, selected, disabled = false, component, className, onKeyDown, ...rest
  },
  ref,
) {
  const interactive = !!onClick || clickable || href !== undefined;
  const deletable = typeof onDelete === 'function';
  const named = typeof label === 'string' || typeof label === 'number' ? String(label) : '';

  const start = avatar ? (
    <span className="gl-chip-avatar">{avatar}</span>
  ) : icon ? (
    <span className="gl-chip-icon">{icon}</span>
  ) : null;
  const inner = (
    <>
      {start}
      <span className="gl-chip-label">{label}</span>
    </>
  );

  const classes = cx(
    'gl-chip',
    variant === 'plate' && 'gl-chip-plate',
    size === 'sm' && 'gl-chip-sm',
    tone !== 'default' && `gl-chip-${tone}`,
    tone !== 'default' && 'gl-chip-toned',
    interactive && 'gl-chip-clickable',
    deletable && 'gl-chip-deletable',
    interactive && deletable && 'gl-chip-split',
    selected && 'gl-chip-selected',
    disabled && 'gl-chip-disabled',
    className as string | undefined,
  );

  // Backspace / Delete on the chip removes it (MUI); Escape lets go of focus.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    (onKeyDown as React.KeyboardEventHandler<HTMLElement> | undefined)?.(e);
    if (e.defaultPrevented || disabled) return;
    if (deletable && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      onDelete?.(e);
    } else if (e.key === 'Escape') {
      (e.target as HTMLElement).blur();
    }
  };

  const action = (extra: Record<string, unknown>, content: React.ReactNode) => {
    if (href !== undefined) {
      return (
        <a
          href={disabled ? undefined : href}
          target={target}
          rel={rel}
          aria-current={selected ? 'page' : undefined}
          aria-disabled={disabled || undefined}
          role={disabled ? 'link' : undefined}
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
            if (disabled) {
              e.preventDefault();
              return;
            }
            onClick?.(e);
          }}
          {...extra}
        >
          {content}
        </a>
      );
    }
    return (
      <button type="button" disabled={disabled} aria-pressed={selected === undefined ? undefined : selected} onClick={onClick} {...extra}>
        {content}
      </button>
    );
  };

  const deleteButton = deletable ? (
    <button
      type="button"
      className="gl-chip-delete"
      aria-label={deleteLabel ?? (named ? `Remove ${named}` : 'Remove')}
      disabled={disabled}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onDelete?.(e);
      }}
    >
      {deleteIcon ?? <Icon name="close" />}
    </button>
  ) : null;

  // A clickable chip with a delete button: two sibling buttons in one pill, never one inside the other.
  if (interactive && deletable) {
    const Root: React.ElementType = component ?? 'span';
    return (
      <Root ref={ref} className={classes} onKeyDown={handleKeyDown} {...rest}>
        {action({ className: 'gl-chip-action' }, inner)}
        {deleteButton}
      </Root>
    );
  }
  if (interactive) {
    return action({ ref, className: classes, onKeyDown: handleKeyDown, ...rest }, inner);
  }
  const Root: React.ElementType = component ?? 'span';
  return (
    <Root ref={ref} className={classes} onKeyDown={deletable ? handleKeyDown : onKeyDown} {...rest}>
      {inner}
      {deleteButton}
    </Root>
  );
});
