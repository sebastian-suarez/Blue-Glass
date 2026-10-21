// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Autocomplete
/** An option: a string, or an object with a label (plus anything else you need). */
export type AutocompleteOption = string | {
    label: string;
    value?: string | number;
    disabled?: boolean;
    secondary?: React.ReactNode;
    [key: string]: unknown;
};
export type AutocompleteChangeReason = 'selectOption' | 'removeOption' | 'createOption' | 'clear';
export type AutocompleteCloseReason = 'selectOption' | 'escape' | 'blur' | 'toggleInput';
export type AutocompleteInputChangeReason = 'input' | 'reset' | 'clear';
export interface AutocompleteProps<T = AutocompleteOption> extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The suggestions. Sort them by group when you use groupBy. */
    options: ReadonlyArray<T>;
    /** The chosen option (controlled); an array with `multiple`; a string is allowed with `freeSolo`. Null for none. */
    value?: T | string | Array<T | string> | null;
    /** The starting value (uncontrolled). */
    defaultValue?: T | string | Array<T | string> | null;
    /** Called with the new value and why it changed. */
    onChange?: (event: React.SyntheticEvent, value: any, reason: AutocompleteChangeReason) => void;
    /** The text in the input (controlled). */
    inputValue?: string;
    /** The starting text (uncontrolled). Default: the chosen option's label. */
    defaultInputValue?: string;
    /** Called when the text changes: typing (input), after a choice (reset) or the clear button (clear). */
    onInputChange?: (event: React.SyntheticEvent | null, value: string, reason: AutocompleteInputChangeReason) => void;
    /** Popup open state (controlled). */
    open?: boolean;
    /** Start with the popup open (uncontrolled), e.g. in a showcase. */
    defaultOpen?: boolean;
    /** Called when the popup asks to open. */
    onOpen?: (event: React.SyntheticEvent) => void;
    /** Called when the popup asks to close, with the reason. */
    onClose?: (event: React.SyntheticEvent, reason: AutocompleteCloseReason) => void;
    /** Choose several: removable chips before the input. */
    multiple?: boolean;
    /** Accept any text, not only an option: Enter commits what was typed. */
    freeSolo?: boolean;
    /** Hide the clear button. */
    disableClearable?: boolean;
    /** Keep the popup open after a choice (handy with multiple). */
    disableCloseOnSelect?: boolean;
    /** Open the popup when the input takes focus. */
    openOnFocus?: boolean;
    /** Highlight the first match while typing, so Enter takes it. */
    autoHighlight?: boolean;
    /** Escape on a closed popup clears the text and the value. */
    clearOnEscape?: boolean;
    /** Options are on their way: the popup says loadingText while the list is empty. */
    loading?: boolean;
    /** Default "Loading…". */
    loadingText?: React.ReactNode;
    /** Default "No options". */
    noOptionsText?: React.ReactNode;
    /** The text for an option. Default: the string itself, or `option.label`. */
    getOptionLabel?: (option: T | string) => string;
    /** Options that can't be chosen; the keyboard skips them. Default: `option.disabled`. */
    getOptionDisabled?: (option: T) => boolean;
    /** Match an option against the value. Default: same `value` field, else same label. */
    isOptionEqualToValue?: (option: T, value: T | string) => boolean;
    /** Group heading for an option; consecutive options with one heading form a group. */
    groupBy?: (option: T) => string;
    /** Replace the default filter (accent- and case-insensitive "contains" on the label). */
    filterOptions?: (options: ReadonlyArray<T>, state: {
        inputValue: string;
        getOptionLabel: (option: T | string) => string;
    }) => T[];
    /** Custom row content; `label` arrives with the match already highlighted. */
    renderOption?: (option: T, state: {
        selected: boolean;
        inputValue: string;
        label: React.ReactNode;
    }) => React.ReactNode;
    /** Hint in the empty input, in color-muted. Never a substitute for the label. */
    placeholder?: string;
    /** Form field name (the input's text; one hidden input per chip with multiple). */
    name?: string;
    /** The input's id. Generated when omitted. */
    id?: string;
    /** Focusable, not editable. */
    readOnly?: boolean;
    /** Focus the input on mount. */
    autoFocus?: boolean;
    /** Inside the pill before the input: an InputAdornment or Icon (search). */
    startAdornment?: React.ReactNode;
    /** Render the popup in place instead of in document.body (showcases, dialogs). */
    disablePortal?: boolean;
    /** Extra attributes for the <input>. */
    inputProps?: Record<string, unknown>;
    /** Ref to the <input>. */
    inputRef?: React.Ref<HTMLInputElement>;
}
/**
 * A text field with suggestions: the field's pill as an editable combobox over a
 * non-modal glass listbox that filters as you type and sets the match in 600,
 * with groups, free text, removable chips, and loading and empty states.
 */
export declare const Autocomplete: <T = AutocompleteOption>(props: AutocompleteProps<T> & {
    ref?: React.Ref<HTMLDivElement>;
}) => React.ReactElement | null;
