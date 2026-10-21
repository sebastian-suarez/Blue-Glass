// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/TransferList
/** One item: a string, or an object with a value (its identity) and a label. */
export type TransferListItem = string | {
    value: string;
    label?: React.ReactNode;
    secondary?: React.ReactNode;
    disabled?: boolean;
};
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
/**
 * Two inset wells of selectable rows with a column of glass buttons between them:
 * select rows on one side, then move them (or everything) to the other.
 */
export declare const TransferList: React.ForwardRefExoticComponent<TransferListProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
