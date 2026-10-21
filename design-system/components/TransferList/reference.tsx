import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useId } from '../internal/hooks';
import { Paper } from '../surfaces/Paper';
import { Button } from './Button';
import { Icon } from '../data-display/Icon';
import { edgeIndex, isPrintableKey, scrollIntoViewNearest, stepIndex, useTypeahead } from './_inputs-b-list';

/** One item: a string, or an object with a value (its identity) and a label. */
export type TransferListItem = string | { value: string; label?: React.ReactNode; secondary?: React.ReactNode; disabled?: boolean };

export interface TransferListValue {
  /** Items in the first list. */
  left: TransferListItem[];
  /** Items in the second list. */
  right: TransferListItem[];
}

export interface TransferListSelection {
  /** Values selected in the first list. */
  left: string[];
  /** Values selected in the second list. */
  right: string[];
}

export interface TransferListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Both lists (controlled). */
  value?: TransferListValue;
  /** Both lists at the start (uncontrolled). */
  defaultValue?: TransferListValue;
  /** Called with both lists after every move. */
  onChange?: (event: React.SyntheticEvent, value: TransferListValue) => void;
  /** Selected values in each list (controlled). */
  selected?: TransferListSelection;
  /** Selected values at the start (uncontrolled). */
  defaultSelected?: Partial<TransferListSelection>;
  /** Called when the selection in either list changes. */
  onSelectionChange?: (selection: TransferListSelection) => void;
  /** Heading of the first list. Default "Choices". */
  leftTitle?: React.ReactNode;
  /** Heading of the second list. Default "Chosen". */
  rightTitle?: React.ReactNode;
  /** Show the move-all buttons. Default true. */
  showMoveAll?: boolean;
  /** Height of each list in px; longer lists scroll. Default 232 (five rows). */
  listHeight?: number;
  /** Shown in an empty list. Default "No items". */
  emptyText?: React.ReactNode;
  /** Dims everything and blocks changes. */
  disabled?: boolean;
}

type Side = 'left' | 'right';

const keyOf = (item: TransferListItem) => (typeof item === 'string' ? item : item.value);
const labelOf = (item: TransferListItem): React.ReactNode => (typeof item === 'string' ? item : item.label ?? item.value);
const textOf = (item: TransferListItem): string => {
  if (typeof item === 'string') return item;
  return typeof item.label === 'string' || typeof item.label === 'number' ? String(item.label) : item.value;
};
const isItemDisabled = (item: TransferListItem) => typeof item !== 'string' && !!item.disabled;

interface PaneProps {
  side: Side;
  id: string;
  title: React.ReactNode;
  items: TransferListItem[];
  selected: string[];
  onToggle: (side: Side, values: string[], mode: 'toggle' | 'all' | 'none') => void;
  listHeight: number;
  emptyText: React.ReactNode;
  disabled: boolean;
}

function Pane({ side, id, title, items, selected, onToggle, listHeight, emptyText, disabled }: PaneProps) {
  const [active, setActive] = React.useState(-1);
  const [focused, setFocused] = React.useState(false);
  const [keyboard, setKeyboard] = React.useState(false);
  const pressing = React.useRef(false);
  const typeahead = useTypeahead();
  const n = items.length;
  const enabled = (i: number) => i >= 0 && i < n && !isItemDisabled(items[i]);
  const activeIdx = active < n ? active : n ? n - 1 : -1;
  const titleId = `${id}-${side}-title`;
  const countId = `${id}-${side}-count`;
  const optionId = (i: number) => `${id}-${side}-item-${i}`;
  const isSel = (item: TransferListItem) => selected.includes(keyOf(item));
  const selectable = items.filter((it) => !isItemDisabled(it));
  const count = items.filter(isSel).length;

  React.useEffect(() => {
    if (!focused || activeIdx < 0) return;
    scrollIntoViewNearest(document.getElementById(optionId(activeIdx)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, activeIdx]);

  const toggle = (i: number) => {
    if (!enabled(i) || disabled) return;
    onToggle(side, [keyOf(items[i])], 'toggle');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (disabled) return;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        next = stepIndex(activeIdx, e.key === 'ArrowDown' ? 1 : -1, n, enabled);
        if (e.shiftKey && next >= 0 && next !== activeIdx) toggle(next);
        break;
      }
      case 'Home':
        next = edgeIndex(1, n, enabled);
        break;
      case 'End':
        next = edgeIndex(-1, n, enabled);
        break;
      case ' ':
        e.preventDefault();
        setKeyboard(true);
        if (activeIdx >= 0) toggle(activeIdx);
        return;
      default:
        if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const all = selectable.every(isSel);
          onToggle(side, selectable.map(keyOf), all ? 'none' : 'all');
          return;
        }
        if (isPrintableKey(e)) {
          const i = typeahead(e.key, items.map(textOf), activeIdx, enabled);
          if (i >= 0) next = i;
        }
    }
    if (next !== null) {
      e.preventDefault();
      setKeyboard(true);
      if (next >= 0) setActive(next);
    }
  };

  return (
    <Paper variant="inset" className="gl-transfer-list-pane">
      <div className="gl-transfer-list-head">
        <span id={titleId} className="gl-transfer-list-title">
          {title}
        </span>
        <span id={countId} className="gl-transfer-list-count">
          <span aria-hidden="true">{`${count}/${n} selected`}</span>
          <span className="gl-sr-only">{`${count} of ${n} selected`}</span>
        </span>
      </div>
      <div className="gl-transfer-list-body" style={{ height: listHeight }}>
      <ul
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby={titleId}
        aria-describedby={countId}
        aria-disabled={disabled || undefined}
        aria-activedescendant={focused && activeIdx >= 0 ? optionId(activeIdx) : undefined}
        tabIndex={disabled || n === 0 ? -1 : 0}
        className="gl-listbox gl-transfer-list-list"
        onKeyDown={onKeyDown}
        onFocus={() => {
          setFocused(true);
          // Reached by Tab (not a press): show the active row's ring straight away.
          setKeyboard(!pressing.current);
          if (active < 0 || active >= n) setActive(edgeIndex(1, n, enabled));
        }}
        onBlur={() => setFocused(false)}
        onPointerDown={() => {
          pressing.current = true;
          setKeyboard(false);
        }}
        onPointerUp={() => {
          pressing.current = false;
        }}
        onPointerCancel={() => {
          pressing.current = false;
        }}
      >
        {items.map((item, i) => {
          const sel = isSel(item);
          const dis = isItemDisabled(item);
          const secondary = typeof item === 'string' ? undefined : item.secondary;
          return (
            <li
              key={keyOf(item)}
              id={optionId(i)}
              role="option"
              aria-selected={sel}
              aria-disabled={dis || undefined}
              className="gl-option"
              data-active={focused && keyboard && i === activeIdx ? '' : undefined}
              onClick={() => {
                if (dis || disabled) return;
                setActive(i);
                toggle(i);
              }}
            >
              <span className="gl-option-text">
                <span>{labelOf(item)}</span>
                {secondary !== undefined && secondary !== null && secondary !== '' ? <span className="gl-option-secondary">{secondary}</span> : null}
              </span>
              {sel ? (
                <span className="gl-option-end">
                  <Icon name="check" size={16} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
      {n === 0 ? <span className="gl-transfer-list-empty">{emptyText}</span> : null}
      </div>
    </Paper>
  );
}

/**
 * Two inset wells of selectable rows with a column of glass buttons between them:
 * select rows on one side, then move them (or everything) to the other.
 */
export const TransferList = React.forwardRef<HTMLDivElement, TransferListProps>(function TransferList(props, ref) {
  const {
    value: valueProp, defaultValue, onChange, selected: selectedProp, defaultSelected, onSelectionChange,
    leftTitle = 'Choices', rightTitle = 'Chosen', showMoveAll = true, listHeight = 232, emptyText = 'No items',
    disabled = false, className, id: idProp, ...rest
  } = props;
  const id = useId(idProp as string | undefined);
  const [value, setValue] = useControlled<TransferListValue>(valueProp, defaultValue ?? { left: [], right: [] });
  const [selected, setSelected] = useControlled<TransferListSelection>(selectedProp, {
    left: defaultSelected?.left ?? [],
    right: defaultSelected?.right ?? [],
  });
  const [announcement, setAnnouncement] = React.useState('');
  const titleText = (node: React.ReactNode, fallback: string) => (typeof node === 'string' ? node : fallback);

  const changeSelection = (next: TransferListSelection) => {
    setSelected(next);
    onSelectionChange?.(next);
  };
  const onToggle = (side: Side, values: string[], mode: 'toggle' | 'all' | 'none') => {
    const cur = selected[side];
    let list: string[];
    if (mode === 'all') list = Array.from(new Set([...cur, ...values]));
    else if (mode === 'none') list = cur.filter((v) => !values.includes(v));
    else list = values.reduce((acc, v) => (acc.includes(v) ? acc.filter((x) => x !== v) : [...acc, v]), cur);
    changeSelection({ ...selected, [side]: list });
  };

  const move = (e: React.SyntheticEvent, from: Side, all: boolean) => {
    if (disabled) return;
    const to: Side = from === 'left' ? 'right' : 'left';
    const moving = value[from].filter((it) => !isItemDisabled(it) && (all || selected[from].includes(keyOf(it))));
    if (!moving.length) return;
    const keys = new Set(moving.map(keyOf));
    const next: TransferListValue = { ...value, [from]: value[from].filter((it) => !keys.has(keyOf(it))), [to]: [...value[to], ...moving] } as TransferListValue;
    setValue(next);
    onChange?.(e, next);
    changeSelection({ ...selected, [from]: selected[from].filter((v) => !keys.has(v)) });
    const dest = titleText(to === 'left' ? leftTitle : rightTitle, to === 'left' ? 'the first list' : 'the second list');
    setAnnouncement(`Moved ${moving.length} ${moving.length === 1 ? 'item' : 'items'} to ${dest}.`);
  };

  const movable = (side: Side, all: boolean) =>
    !disabled && value[side].some((it) => !isItemDisabled(it) && (all || selected[side].includes(keyOf(it))));
  const leftName = titleText(leftTitle, 'the first list');
  const rightName = titleText(rightTitle, 'the second list');
  const action = (label: string, icon: string, from: Side, all: boolean) => (
    <Button
      size="sm"
      className="gl-transfer-list-button"
      title={label}
      disabled={!movable(from, all)}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => move(e, from, all)}
    >
      <Icon name={icon} size={16} />
      <span className="gl-sr-only">{label}</span>
    </Button>
  );

  return (
    <div ref={ref} id={idProp as string | undefined} className={cx('gl-transfer-list', disabled && 'gl-transfer-list-disabled', className as string | undefined)} {...rest}>
      <div className="gl-transfer-list-grid">
        <Pane side="left" id={id} title={leftTitle} items={value.left} selected={selected.left} onToggle={onToggle} listHeight={listHeight} emptyText={emptyText} disabled={disabled} />
        <div className="gl-transfer-list-actions" role="group" aria-label="Move items">
          {showMoveAll ? action(`Move all to ${rightName}`, 'chevrons-right', 'left', true) : null}
          {action(`Move selected to ${rightName}`, 'chevron-right', 'left', false)}
          {action(`Move selected to ${leftName}`, 'chevron-left', 'right', false)}
          {showMoveAll ? action(`Move all to ${leftName}`, 'chevrons-left', 'right', true) : null}
        </div>
        <Pane side="right" id={id} title={rightTitle} items={value.right} selected={selected.right} onToggle={onToggle} listHeight={listHeight} emptyText={emptyText} disabled={disabled} />
      </div>
      <span className="gl-sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
});
