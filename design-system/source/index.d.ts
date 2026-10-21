// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';
// internal/position
export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'left-start' | 'left-end' | 'right' | 'right-start' | 'right-end';
export interface PositionOptions {
    placement?: Placement;
    /** Gap between the anchor and the floating element, px. */
    offset?: number;
    /** Flip to the opposite side when the preferred side overflows. */
    flip?: boolean;
    /** Keep the floating element inside the viewport on the cross axis. */
    shift?: boolean;
    /** Viewport padding kept clear, px. */
    padding?: number;
    /** Make the floating element at least as wide as the anchor (menus under a field). */
    matchWidth?: boolean;
    /** The box to stay inside; default the window. */
    viewport?: {
        width: number;
        height: number;
    };
}
export interface PositionResult {
    x: number;
    y: number;
    placement: Placement;
    /** transform-origin for origin-aware scale-in, relative to the floating box. */
    origin: string;
    maxHeight: number;
    minWidth?: number;
}
/**
 * position: fixed is relative to the viewport unless an ancestor creates a
 * containing block (transform, filter, backdrop-filter, contain, will-change).
 * Returns that block's box in viewport coordinates, or null for the viewport.
 */
export declare function containingBlock(el: Element | null): {
    x: number;
    y: number;
    width: number;
    height: number;
} | null;
/** computePosition for an element that is (or will be) position: fixed, in its own containing block's coordinates. */
export declare function positionFixed(anchor: DOMRect, floatingEl: HTMLElement, opts?: PositionOptions): PositionResult;
export declare function splitPlacement(p: Placement): [Side, Align];
/**
 * Position a fixed floating box against an anchor rect, viewport coordinates.
 * Flip on the main axis, shift on the cross axis, cap height to the space left.
 */
export declare function computePosition(anchor: DOMRect, floating: {
    width: number;
    height: number;
}, opts?: PositionOptions): PositionResult;

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

// inputs/Button
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** primary: the ink pill, once per view. glass: the frosted pill (default). text: a link-weight action. */
    variant?: 'primary' | 'glass' | 'text';
    /** danger for destructive actions. */
    tone?: 'default' | 'danger';
    /** md is the site's 46px pill; sm and lg are additions. */
    size?: 'sm' | 'md' | 'lg';
    /** Icon before the label. */
    startIcon?: React.ReactNode;
    /** Icon after the label; outbound links take the arrow-ne glyph. */
    endIcon?: React.ReactNode;
    /** Busy: shows a spinner, sets aria-busy and blocks clicks. */
    loading?: boolean;
    /** Stretch to the container width. */
    fullWidth?: boolean;
    /** Render an <a> instead of a <button>. */
    href?: string;
    target?: string;
    rel?: string;
    type?: 'button' | 'submit' | 'reset';
    children?: React.ReactNode;
}
/**
 * The site's pill button (.btn): primary is the ink pill for the one thing a
 * view is for, glass the frosted pill beside it, text a link-weight action.
 */
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;

// inputs/ButtonGroup
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * glass: the site's pill nav track (.identity-strip nav) holding nav-weight buttons, the default.
     * primary: one ink pill split by on-ink hairlines. text: link-weight actions split by short hairlines.
     * The group sets this variant on every child Button.
     */
    variant?: 'glass' | 'primary' | 'text';
    /** sm 36px, md 46px (the site's nav), lg 54px. The group sets this size on every child Button. */
    size?: 'sm' | 'md' | 'lg';
    /** A row (default) or a column. */
    orientation?: 'horizontal' | 'vertical';
    /** Stretch to the container width; the buttons share it equally. */
    fullWidth?: boolean;
    /** Disable every button in the group. */
    disabled?: boolean;
    /** Button elements. Name the group with aria-label or aria-labelledby. */
    children?: React.ReactNode;
}
/** Related Buttons in one track: the site's pill nav, an ink pill split into segments, or hairline-split text actions. */
export declare const ButtonGroup: React.ForwardRefExoticComponent<ButtonGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// inputs/Checkbox
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'children'> {
    /** Checked, controlled. */
    checked?: boolean;
    /** Initially checked, uncontrolled. */
    defaultChecked?: boolean;
    /** Called with the change event and the new checked state. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** The mixed state (a minus): some, not all, of a set is checked. Sets the input's indeterminate property. */
    indeterminate?: boolean;
    /** The visible label. Clicking it toggles the box. Without one, give the checkbox an aria-label. */
    label?: React.ReactNode;
    /** A line under the label, linked by aria-describedby. With error, it is the error message. */
    helperText?: React.ReactNode;
    /** Invalid: a danger border, aria-invalid, and helperText in danger with an error icon. */
    error?: boolean;
    /** md: a 20px box (default). sm: a 16px box. */
    size?: 'sm' | 'md';
    /** Disables the input and dims the row. */
    disabled?: boolean;
    /** Sets required on the input and marks the label with an asterisk. */
    required?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. */
    style?: React.CSSProperties;
}
/** A native checkbox drawn as a Blue Glass box: a 1.5px dg-edge outline on glass, filled with ink when checked or mixed. */
export declare const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;

// inputs/Fab
export interface FabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** primary: the ink circle (.btn-primary), the default. glass: the frosted circle (.btn-glass) for a second floating action. */
    variant?: 'primary' | 'glass';
    /** sm 36px, md 46px (the site's control height, default), lg 56px. */
    size?: 'sm' | 'md' | 'lg';
    /** A pill with an icon and a visible label instead of a circle (MUI's variant="extended"). */
    extended?: boolean;
    /** Accessible name. Required when the Fab shows only an icon; an extended Fab is named by its label. */
    'aria-label'?: string;
    /** Render an <a> instead of a <button>, e.g. "Back to top" with href="#top". */
    href?: string;
    /** Link target, with href. */
    target?: string;
    /** Link rel, with href. */
    rel?: string;
    /** Button type. Default "button". */
    type?: 'button' | 'submit' | 'reset';
    /** The icon, or the icon then the label when extended. */
    children?: React.ReactNode;
}
/** The floating action button: the site's ink or glass pill cut as a circle for a screen's one action, extended with a label, and safe inside Zoom. */
export declare const Fab: React.ForwardRefExoticComponent<FabProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;

// inputs/RadioGroup
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'value' | 'checked' | 'defaultChecked' | 'children'> {
    /** This option's value: what the group's value becomes when it is chosen. */
    value: string;
    /** The visible label. Clicking it chooses the option. */
    label?: React.ReactNode;
    /** A second line under the label, linked by aria-describedby. */
    helperText?: React.ReactNode;
    /** Checked, controlled. Inside a RadioGroup the group's value decides. */
    checked?: boolean;
    /** Initially checked, uncontrolled (outside a RadioGroup). */
    defaultChecked?: boolean;
    /** Called with the change event and true when this option becomes checked. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** md: a 20px circle (default). sm: a 16px circle. Inherits the group's. */
    size?: 'sm' | 'md';
    /** Invalid: a danger ring and aria-invalid. Inherits the group's. */
    error?: boolean;
    /** Disables this option. The group's disabled disables every option. */
    disabled?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. */
    style?: React.CSSProperties;
}
/** One native radio drawn as a Blue Glass circle: a dg-edge outline, then an ink ring and dot once chosen. */
export declare const Radio: React.ForwardRefExoticComponent<RadioProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The visible group label. It sits above the options and names the radiogroup. */
    label?: React.ReactNode;
    /** The name every radio shares; generated when omitted. */
    name?: string;
    /** The chosen value, controlled; null for none. */
    value?: string | null;
    /** The initially chosen value, uncontrolled. */
    defaultValue?: string | null;
    /** Called with the change event and the newly chosen value. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
    /** Lay the options out in a wrapping row instead of a column. */
    row?: boolean;
    /** A line under the options, linked by aria-describedby. With error, it is the error message. */
    helperText?: React.ReactNode;
    /** Invalid: danger rings, aria-invalid, and helperText in danger with an error icon. */
    error?: boolean;
    /** Required: an asterisk on the label, aria-required, and required on every radio. */
    required?: boolean;
    /** Disables every option. */
    disabled?: boolean;
    /** md: 20px circles (default). sm: 16px circles. */
    size?: 'sm' | 'md';
    /** The group's id; generated when omitted. The label and helper ids derive from it. */
    id?: string;
    /** Ids of more labels for the group; the visible label's id is added to them. */
    'aria-labelledby'?: string;
    /** Ids of more descriptions for the group; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the radiogroup element. */
    className?: string;
    /** Radio elements. */
    children?: React.ReactNode;
}
/** A labelled set of Radios sharing one name. The browser's own arrow keys move the choice; Tab leaves the group. */
export declare const RadioGroup: React.ForwardRefExoticComponent<RadioGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// inputs/Rating
export interface RatingProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue' | 'children'> {
    /** The rating, controlled; null for none. */
    value?: number | null;
    /** The initial rating, uncontrolled. */
    defaultValue?: number | null;
    /** Called with the event and the new rating; null when the reader presses the current star to clear it. */
    onChange?: (event: React.SyntheticEvent, value: number | null) => void;
    /** Called with the value under the mouse while it hovers, and -1 when it leaves: use it for live feedback. */
    onChangeActive?: (event: React.SyntheticEvent, value: number) => void;
    /** Number of stars. Default 5. */
    max?: number;
    /** The step: 1 for whole stars (default) or 0.5 for half stars. */
    precision?: number;
    /** Display only: no inputs; the stars become one image named by the value ("4 out of 5 stars"). */
    readOnly?: boolean;
    /** Shown but not operable; dimmed. */
    disabled?: boolean;
    /** Star size: sm 18px, md 24px (default), lg 32px. */
    size?: 'sm' | 'md' | 'lg';
    /** The radio inputs' name, for forms; generated when omitted. */
    name?: string;
    /** Visible text beside the stars: the value, or what it means. */
    label?: React.ReactNode;
    /** Accessible text for a value. Default: "4 out of 5 stars". */
    getLabelText?: (value: number) => string;
    /** Accessible text for no rating. Default: "No rating". */
    emptyLabelText?: string;
    /** The root's id; the inputs' ids derive from it. */
    id?: string;
    /** Names the stars (default "Rating"); read-only prefixes it to the value: "VSebCode: 4.5 out of 5 stars". */
    'aria-label'?: string;
    /** Names the stars by another element's id (interactive only). */
    'aria-labelledby'?: string;
    /** Classes on the root. */
    className?: string;
}
/**
 * Stars for a score. Each step is a visually hidden native radio, so arrow keys work as in any radio
 * group; the mouse previews before it commits, and pressing the current star clears it.
 */
export declare const Rating: React.ForwardRefExoticComponent<RatingProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// inputs/Select
export type SelectValue = string | number;
export type SelectCloseReason = 'escapeKeyDown' | 'backdropClick' | 'select' | 'tabKeyDown';
/** One entry of Select's `options` array. */
export interface SelectOption {
    /** The value stored when this row is chosen. */
    value: SelectValue;
    /** What the row and the trigger show. Default: the value. */
    label?: React.ReactNode;
    /** Plain text for typeahead and native mode when the label is not a string. */
    textValue?: string;
    /** Not selectable; the keyboard skips it. */
    disabled?: boolean;
    /** A second line in color-muted. */
    secondary?: React.ReactNode;
    /** A leading icon (16px). */
    icon?: React.ReactNode;
}
export interface OptionProps extends Omit<React.HTMLAttributes<HTMLLIElement>, 'value'> {
    /** The value stored when this row is chosen. */
    value: SelectValue;
    /** Not selectable; the keyboard skips it. */
    disabled?: boolean;
    /** Plain text for typeahead and native mode when children is not a string. */
    textValue?: string;
    /** A second line in color-muted. */
    secondary?: React.ReactNode;
    /** A leading icon (16px, color-muted). */
    icon?: React.ReactNode;
    /** Set by Select: the raised row with a check. */
    selected?: boolean;
    /** The label. Default: the value. */
    children?: React.ReactNode;
}
/** One row of a Select: a gl-option with role="option"; Select injects its id, state and handlers. */
export declare const Option: React.ForwardRefExoticComponent<OptionProps & {
    ref?: React.Ref<HTMLLIElement> | undefined;
}>;
export interface SelectProps extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The chosen value (controlled): one value, or an array with `multiple`. Use null or '' for none. */
    value?: SelectValue | SelectValue[] | null;
    /** The starting value (uncontrolled). */
    defaultValue?: SelectValue | SelectValue[] | null;
    /** Called with the new value (an array with `multiple`). */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
    /** Choose several: chips in the trigger, rows toggle, the list stays open. */
    multiple?: boolean;
    /** Shown in color-muted while nothing is chosen. Never a substitute for the label. */
    placeholder?: string;
    /** The rows as data, instead of <Option> children. */
    options?: ReadonlyArray<SelectValue | SelectOption>;
    /** <Option value="…"> rows. */
    children?: React.ReactNode;
    /** Render a styled native <select> (the platform's own list) instead of the listbox. */
    native?: boolean;
    /** Form field name: hidden inputs carry the value. */
    name?: string;
    /** The trigger's id. Generated when omitted. */
    id?: string;
    /** Focusable but can't be opened or changed. */
    readOnly?: boolean;
    /** Open state (controlled). */
    open?: boolean;
    /** Start open (uncontrolled). Opening on mount doesn't move focus. */
    defaultOpen?: boolean;
    /** Called when the list asks to open. */
    onOpen?: (event: React.SyntheticEvent) => void;
    /** Called when the list asks to close, with the reason. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: SelectCloseReason) => void;
    /** Custom trigger content for the current value. */
    renderValue?: (value: any) => React.ReactNode;
    /** Inside the pill before the value: an InputAdornment or Icon. */
    startAdornment?: React.ReactNode;
    /** Passed to the Popover that holds the list (disablePortal, disableScrollLock, container…). */
    PopoverProps?: Partial<PopoverProps>;
}
/**
 * A select-only combobox in the field's pill that opens a glass Popover listbox
 * (the side selector's rows), with the APG keyboard, typeahead, the site's chips
 * for `multiple` and a styled native select for `native`.
 */
export declare const Select: React.ForwardRefExoticComponent<SelectProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// inputs/Slider
export interface SliderMark {
    /** Where the mark sits, in the slider's units. */
    value: number;
    /** Text under the mark (12px, color-muted; ink inside the filled range). */
    label?: React.ReactNode;
}
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue'> {
    /** The value (controlled): a number, or [low, high] for a range with two thumbs. */
    value?: number | number[];
    /** The starting value (uncontrolled). An array makes a range. Default: min. */
    defaultValue?: number | number[];
    /** Called on every change, while dragging too, with the new value and the thumb that moved. */
    onChange?: (event: React.SyntheticEvent, value: number | number[], activeThumb: number) => void;
    /** Called once a drag ends or a key changes the value: the moment to save. */
    onChangeCommitted?: (event: React.SyntheticEvent, value: number | number[]) => void;
    /** Lowest value. Default 0. */
    min?: number;
    /** Highest value. Default 100. */
    max?: number;
    /** Granularity. Default 1. null snaps to the marks only. */
    step?: number | null;
    /** The jump for Page Up/Down and Shift+arrow. Default 10 steps. */
    shiftStep?: number;
    /** true puts a dot at every step; an array places labelled marks. */
    marks?: boolean | SliderMark[];
    /** Default horizontal. Vertical fills its parent's height, so give the parent one. */
    orientation?: 'horizontal' | 'vertical';
    /** Dims to 50%; no pointer or keyboard changes. */
    disabled?: boolean;
    /** Which part is filled in color-blue: up to the value (normal), from it (inverted), or none. */
    track?: 'normal' | 'inverted' | false;
    /** The ink value pill over the thumb: auto shows it while dragging, hovered or keyboard-focused; on always; off never. */
    valueLabelDisplay?: 'auto' | 'on' | 'off';
    /** Format the value pill, e.g. (v) => `${v} ms`. A returned string also becomes aria-valuetext. */
    valueLabelFormat?: string | ((value: number, index: number) => React.ReactNode);
    /** The text a screen reader says for a value, e.g. "120 milliseconds". */
    getAriaValueText?: (value: number, index: number) => string;
    /** Names each thumb of a range, e.g. (i) => (i ? 'Highest' : 'Lowest'). */
    getAriaLabel?: (index: number) => string;
    /** Form field name: one hidden input per thumb. */
    name?: string;
}
/**
 * A slider on a 4px pill track (color-line rail, color-blue fill, a white thumb
 * with the dg-edge edge, an ink value pill) for one value or a range, with marks,
 * steps, a vertical orientation, pointer capture and the APG slider keyboard.
 */
export declare const Slider: React.ForwardRefExoticComponent<SliderProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// inputs/Switch
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'role' | 'children'> {
    /** On, controlled. */
    checked?: boolean;
    /** Initially on, uncontrolled. */
    defaultChecked?: boolean;
    /** Called with the change event and the new state. A switch acts at once: apply the setting here. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** The visible label: what the switch turns on. Without one, give the switch an aria-label. */
    label?: React.ReactNode;
    /** end: the label after the switch (default). start: the label first, the switch pushed to the far end. */
    labelPlacement?: 'start' | 'end';
    /** A line under the label, linked by aria-describedby. */
    helperText?: React.ReactNode;
    /** md: a 40 × 24 track (default). sm: 32 × 20. */
    size?: 'sm' | 'md';
    /** Disables the input and dims the row. */
    disabled?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. Give it width: 100% with labelPlacement="start" for a settings row. */
    style?: React.CSSProperties;
}
/** An on/off setting that applies at once: a native checkbox with role="switch", drawn as a pill track and a sliding thumb. */
export declare const Switch: React.ForwardRefExoticComponent<SwitchProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;

// inputs/TextField
/** Props every Blue Glass field shares: TextField, Select and Autocomplete. */
export interface FieldBaseProps {
    /** Visible label above the field (13px, weight 600). Always give one, or an aria-label: a placeholder is not a label. */
    label?: React.ReactNode;
    /** One line under the field in color-muted, linked with aria-describedby. Under `error` it turns danger and gains the error icon. */
    helperText?: React.ReactNode;
    /** Error state: danger border and aria-invalid. Say what to fix in helperText; colour alone is not enough. */
    error?: boolean;
    /** Adds an asterisk to the label and marks the control required. */
    required?: boolean;
    /** Dims the field to 50% and blocks input. */
    disabled?: boolean;
    /** Stretch to the container's width. */
    fullWidth?: boolean;
    /** md is the site's 46px control height (size-control); sm is 36px. */
    size?: 'sm' | 'md';
    /** outlined: glass-control fill with the dg-edge border (default). filled: a glass-inset well whose edge darkens on hover and focus. */
    variant?: 'outlined' | 'filled';
}
export interface InputAdornmentProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The side of the input it sits on. */
    position: 'start' | 'end';
    /** An Icon (shown at 16px in color-muted), a unit such as "ms", or a small button. */
    children?: React.ReactNode;
}
/** A slot inside a field's pill, before or after the text: an icon, a unit or a small button. */
export declare const InputAdornment: React.ForwardRefExoticComponent<InputAdornmentProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TextFieldProps extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'onInput'> {
    /** The text (controlled). */
    value?: string;
    /** The starting text (uncontrolled). */
    defaultValue?: string;
    /** Called on every edit with the new text. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, value: string) => void;
    /** Input type. Number hides the spin buttons (arrow keys still step). Ignored when multiline. */
    type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
    /** Hint inside the empty field, in color-muted. Never a substitute for the label. */
    placeholder?: string;
    /** Form field name. */
    name?: string;
    /** The input's id; the label points at it. Generated when omitted. */
    id?: string;
    /** Browser autofill hint, e.g. "email". */
    autoComplete?: string;
    /** Focus the input on mount. */
    autoFocus?: boolean;
    /** Focusable and selectable, but not editable. Shown as an inset well. */
    readOnly?: boolean;
    /** A textarea that grows with its content (TextareaAutosize), on radius-well. */
    multiline?: boolean;
    /** Multiline: height floor in rows. Default 1. */
    minRows?: number;
    /** Multiline: height ceiling in rows; scrolls past it. */
    maxRows?: number;
    /** Multiline: a fixed number of rows. */
    rows?: number;
    /** Character limit, passed to the input. */
    maxLength?: number;
    /** Show a counter under the field: "42/280" with maxLength, else the length. */
    showCount?: boolean;
    /** Inside the pill before the text: an InputAdornment, an Icon or a word. */
    startAdornment?: React.ReactNode;
    /** Inside the pill after the text: an InputAdornment, an Icon, a unit or a small button. */
    endAdornment?: React.ReactNode;
    /** Extra attributes for the <input> or <textarea> (inputMode, pattern, min, max, step…). */
    inputProps?: Record<string, unknown>;
    /** Ref to the <input> or <textarea>. */
    inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}
/**
 * A labelled text field in the site's language: the 46px glass pill with a 3:1
 * edge, the label above, helper or error text below; multiline grows on radius-well.
 */
export declare const TextField: React.ForwardRefExoticComponent<TextFieldProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

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

// inputs/ToggleButton
type Selection = string | string[] | null;
export interface ToggleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type'> {
    /** The value this button stands for: required, and unique within its group. */
    value: string;
    /** Pressed, controlled (standalone). In a group, the group's value decides. */
    selected?: boolean;
    /** Initially pressed, uncontrolled (standalone). */
    defaultSelected?: boolean;
    /** Called on every press with the click event and this button's value. */
    onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: string) => void;
    /** sm, md (default) or lg. Inherits the group's. */
    size?: 'sm' | 'md' | 'lg';
    /** Stretch to the container width (standalone). */
    fullWidth?: boolean;
    /** Disables this button. The group's disabled disables every button. */
    disabled?: boolean;
    /** Called first on every press; call event.preventDefault() to stop the toggle. */
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    /** Called on focus. */
    onFocus?: React.FocusEventHandler<HTMLButtonElement>;
    /** Tab order (standalone). In a group the group manages it: one tab stop. */
    tabIndex?: number;
    /** Classes on the button. */
    className?: string;
    /** The label: text, an Icon, or both. An icon-only button needs an aria-label. */
    children?: React.ReactNode;
}
/** A button that stays pressed (aria-pressed): alone, a glass pill; in a ToggleButtonGroup, a segment of the site's pill track. */
export declare const ToggleButton: React.ForwardRefExoticComponent<ToggleButtonProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
export interface ToggleButtonGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The pressed value, controlled: a string or null when exclusive, an array of strings otherwise. */
    value?: Selection;
    /** The initially pressed value, uncontrolled. */
    defaultValue?: Selection;
    /**
     * Called with the click event and the new value: when exclusive, the pressed string, or null when the
     * pressed button is pressed again (ignore null to keep one always pressed); otherwise the new array.
     */
    onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: any) => void;
    /** One button pressed at a time. */
    exclusive?: boolean;
    /** A row (default) or a column. Arrow keys follow it. */
    orientation?: 'horizontal' | 'vertical';
    /** sm 36px, md 46px (the site's nav track, default), lg 54px. Sets every button's size. */
    size?: 'sm' | 'md' | 'lg';
    /** Disables every button. */
    disabled?: boolean;
    /** Stretch to the container width; the buttons share it equally. */
    fullWidth?: boolean;
    /** Called before the group's own arrow-key handling; call event.preventDefault() to take over. */
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    /** Classes on the group. */
    className?: string;
    /** ToggleButton elements. Name the group with aria-label or aria-labelledby. */
    children?: React.ReactNode;
}
/**
 * The site's segmented pill: ToggleButtons in the nav track, the pressed one raised. One tab stop;
 * arrow keys, Home and End move between buttons; Space or Enter presses.
 */
export declare const ToggleButtonGroup: React.ForwardRefExoticComponent<ToggleButtonGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// data-display/Avatar
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarVariant = 'circle' | 'tile';
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** Image URL. While it loads the orb shows through; if it fails, the avatar falls back to children, then initials from alt, then the user glyph. */
    src?: string;
    /** Responsive image candidates, as on <img>. */
    srcSet?: string;
    /** Sizes for srcSet, as on <img>. */
    sizes?: string;
    /** The person's or the company's name: the image's alt text, the source of the initials, and the name read for a lettered avatar. */
    alt?: string;
    /** circle: initials on the site's orb gradient (default). tile: the monogram glass tile (.signature). */
    variant?: AvatarVariant;
    /** xs 24px · sm 32px · md 40px, the signature tile's size (default) · lg 56px. */
    size?: AvatarSize;
    /** Which of the site's three orbs the circle uses (.tab-orb, .orb-1, .orb-2). Default: picked from alt, so a name always gets the same orb. */
    orb?: 0 | 1 | 2;
    /** Extra attributes for the <img>, e.g. loading="lazy" or referrerPolicy. */
    imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
    /** Render as another element. Default span, so an avatar can sit inside a button or a chip. */
    component?: React.ElementType;
    /** Initials or an icon, shown when there is no image. */
    children?: React.ReactNode;
}
/** A person or a company: initials on one of the site's orbs, the monogram glass tile, or a photo. */
export declare const Avatar: React.ForwardRefExoticComponent<AvatarProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Most avatars shown, counting the "+N" one. Default 5. */
    max?: number;
    /** The real total when you pass only some of the avatars; the "+N" counts from it. */
    total?: number;
    /** Size of every avatar in the group (an avatar's own size wins). */
    size?: AvatarSize;
    /** Shape of every avatar in the group (an avatar's own variant wins). */
    variant?: AvatarVariant;
    /** Overlap: md, a fifth of the avatar (default), or sm, tighter. */
    spacing?: 'md' | 'sm';
    /** Render the surplus yourself, e.g. a link to the full list. */
    renderSurplus?: (surplus: number) => React.ReactNode;
    /** Render as another element. Default div. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A row of overlapping avatars, each cut out of the canvas by a 2px ring, with the rest counted as "+N". */
export declare const AvatarGroup: React.ForwardRefExoticComponent<AvatarGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// data-display/Badge
export type BadgeTone = 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
export type BadgeAnchor = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The count or a short word in the pill. Numbers above max show as "max+". */
    badgeContent?: React.ReactNode;
    /** standard: the count pill (18px, 11px text). dot: an 8px dot, no text. */
    variant?: 'standard' | 'dot';
    /** Fill: default is color-ink; accent and the status tones fill under on-ink. Pair a status with a word. */
    tone?: BadgeTone;
    /** Cap for a numeric count. Default 99, shown as "99+". */
    max?: number;
    /** Show the pill when the count is 0 (hidden by default). */
    showZero?: boolean;
    /** Hide the pill; it fades and scales out. */
    invisible?: boolean;
    /** The child's corner the pill sits on. Default top-right. */
    anchor?: BadgeAnchor;
    /** circular pulls the pill in onto a round child such as an Avatar. Default rectangular. */
    overlap?: 'rectangular' | 'circular';
    /**
     * What the badge means, read by screen readers instead of the bare count, e.g. "4 unread".
     * Rendered as visually hidden text after the child; the visible pill is always aria-hidden.
     * Defaults to the visible count. Pass "" when the child's own name already says it.
     */
    label?: string;
    /**
     * The child's full name with the count, e.g. "Messages, 4 unread". Passed through to the child element,
     * so focus on a button reads it; no hidden text is added then.
     */
    'aria-label'?: string;
    /** Render as another element. Default span. */
    component?: React.ElementType;
    /** The element the badge sits on. Without one, the pill renders inline. */
    children?: React.ReactNode;
}
/** A count pill or a dot on a corner of its child: unread messages, pending reviews, presence. */
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// data-display/Chip
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
export declare const Chip: React.ForwardRefExoticComponent<ChipProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// data-display/Divider
export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
    /** horizontal (default) or vertical. A vertical divider is one line of text tall unless it's a flexItem. */
    orientation?: 'horizontal' | 'vertical';
    /** full width (default), inset past a list row's icon (42px, or --gl-divider-inset), or middle (16px in from both ends). */
    variant?: 'full' | 'inset' | 'middle';
    /** Stretch a vertical divider to the full height of its flex row. */
    flexItem?: boolean;
    /** Where a label sits: centred between two lines (default) or at the start, the line after it. */
    textAlign?: 'center' | 'left';
    /** Render as another element. Default hr, or div when there is a label. Use "li" inside a List. */
    component?: React.ElementType;
    /** An optional label, set in 12px color-muted. */
    children?: React.ReactNode;
}
/** A 1px color-line hairline that separates content, as the site's rows, strips and footer do. */
export declare const Divider: React.ForwardRefExoticComponent<DividerProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// data-display/Icon
/**
 * Glyphs on a 24-unit grid, 1.5 stroke, round caps and joins: the spec of the
 * site's one icon, the north-east arrow (src/components/Icons.tsx), which is
 * `arrow-ne` here verbatim. Every other glyph is drawn to match it.
 */
type Part = {
    d: string;
    fill?: boolean;
} | {
    c: [number, number, number];
    fill?: boolean;
} | {
    r: [number, number, number, number, number];
    fill?: boolean;
};
export declare const GLYPHS: Record<string, Part[]>;
export type IconName = keyof typeof GLYPHS;
export declare const iconNames: IconName[];
export interface SvgIconProps extends React.SVGProps<SVGSVGElement> {
    /** Box size in px. Default 18 (the site's .icon). */
    size?: number | string;
    /** Accessible name. Without it the icon is decorative (aria-hidden). */
    title?: string;
    /** Stroke width on the 24-unit grid. Default 1.5. */
    strokeWidth?: number;
    viewBox?: string;
    children?: React.ReactNode;
}
/** The SVG shell every glyph uses: currentColor stroke, round caps and joins. */
export declare const SvgIcon: React.ForwardRefExoticComponent<SvgIconProps & {
    ref?: React.Ref<SVGSVGElement> | undefined;
}>;
export interface IconProps extends Omit<SvgIconProps, 'children'> {
    /** Glyph name, e.g. "arrow-ne", "check", "chevron-down". See iconNames. */
    name: IconName | string;
    /** Fill closed shapes (a filled star in Rating). */
    filled?: boolean;
}
/** A named glyph from the Blue Glass set. */
export declare const Icon: React.ForwardRefExoticComponent<IconProps & {
    ref?: React.Ref<SVGSVGElement> | undefined;
}>;

// data-display/List
export interface ListProps extends React.HTMLAttributes<HTMLElement> {
    /** Compact rows: 32px instead of 40px, 13px text. Passed down to every row. */
    dense?: boolean;
    /** A color-line hairline between rows, as the site's career list (.career-row). */
    divided?: boolean;
    /** A ListSubheader (or any node) rendered first. */
    subheader?: React.ReactNode;
    /** Render as another element. Default ul; use "ol" for an ordered list. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A vertical list of rows: static rows like the site's career list, or interactive rows on the shared option row. */
export declare const List: React.ForwardRefExoticComponent<ListProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemProps extends React.HTMLAttributes<HTMLElement> {
    /** End slot: meta text, a chip or an action button. On a row that holds a ListItemButton it sits over the row's end. */
    secondaryAction?: React.ReactNode;
    /** A hairline under this row. */
    divider?: boolean;
    /** Compact row. Default from the List. */
    dense?: boolean;
    /** No padding. Automatic when the item holds a ListItemButton. */
    disablePadding?: boolean;
    /** No side padding: the row lines up with its surface's padding, as the career list does. */
    disableGutters?: boolean;
    /** center (default), or flex-start for rows whose text runs to several lines. */
    alignItems?: 'center' | 'flex-start';
    /** Render as another element. Default li. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** One static row: an icon, primary and secondary text, and an end slot. */
export declare const ListItem: React.ForwardRefExoticComponent<ListItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemButtonProps extends React.HTMLAttributes<HTMLElement> {
    /** The raised state of the site's selected tab. A button gets aria-pressed, a link aria-current="page". */
    selected?: boolean;
    disabled?: boolean;
    /** Compact row. Default from the List. */
    dense?: boolean;
    /** Render a link instead of a button. */
    href?: string;
    target?: string;
    rel?: string;
    /** End slot inside the row: a count, a shortcut, a chevron. */
    end?: React.ReactNode;
    /** center (default), or flex-start for multi-line rows. */
    alignItems?: 'center' | 'flex-start';
    /** Focus the row on mount. */
    autoFocus?: boolean;
    type?: 'button' | 'submit' | 'reset';
    /** Render as another element. Default button, or a when href is set. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * An interactive row on the shared option row (.gl-option, the side selector's tab):
 * hover, focus ring, press and the raised selected state. Inside a List it brings its own <li>.
 */
export declare const ListItemButton: React.ForwardRefExoticComponent<ListItemButtonProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemIconProps extends React.HTMLAttributes<HTMLSpanElement> {
    children?: React.ReactNode;
}
/** The leading icon (or small avatar) of a row, in color-muted; color-ink on a selected row. */
export declare const ListItemIcon: React.ForwardRefExoticComponent<ListItemIconProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface ListItemTextProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The main line, in the row's ink. Children work too. */
    primary?: React.ReactNode;
    /** A second line in 12px color-muted. */
    secondary?: React.ReactNode;
    /** Indent to line up with rows that have an icon. */
    inset?: boolean;
    /** Keep each line to one, cut with an ellipsis. */
    noWrap?: boolean;
    children?: React.ReactNode;
}
/** A row's text: primary over an optional muted secondary line. */
export declare const ListItemText: React.ForwardRefExoticComponent<ListItemTextProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface ListSubheaderProps extends React.HTMLAttributes<HTMLElement> {
    /** Indent to line up with text after an icon. */
    inset?: boolean;
    /** Stick to the top of a scrolling list, on glass-solid. */
    sticky?: boolean;
    /** Render as another element. Default li. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A group label inside a list: 12px, weight 600, color-muted (.gl-option-group). */
export declare const ListSubheader: React.ForwardRefExoticComponent<ListSubheaderProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// data-display/Table
export type TableSize = 'md' | 'sm';
export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    /** surface: the site's career list surface (.career-surface), default. plain: only the scroll box. */
    variant?: 'surface' | 'plain';
    /** Cap the height so the body scrolls under a stickyHeader: px or any CSS length. */
    maxHeight?: number | string;
    /** Render as another element. Default div. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The glass surface a table sits on (.career-surface), scrolling sideways when the table is wider.
 * When it does scroll it joins the tab order, so the keyboard can scroll it too; name it with aria-label.
 */
export declare const TableContainer: React.ForwardRefExoticComponent<TableContainerProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    /** md: 14px rows with room (default). sm: dense 13px rows. */
    size?: TableSize;
    /** Header cells stick to the top of a scrolling TableContainer (give it maxHeight). */
    stickyHeader?: boolean;
    /** Names the table, rendered as its <caption> in 12px color-muted. */
    caption?: React.ReactNode;
    /** Caption above or below the table. Default bottom, like the site's figure captions. */
    captionSide?: 'top' | 'bottom';
    children?: React.ReactNode;
}
/** A data table: 12px muted headers, color-line hairlines between rows, tabular figures for numbers. */
export declare const Table: React.ForwardRefExoticComponent<TableProps & {
    ref?: React.Ref<HTMLTableElement> | undefined;
}>;
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children?: React.ReactNode;
}
/** The header rows: cells inside render as th scope="col" in the header style. */
export declare const TableHead: React.ForwardRefExoticComponent<TableHeadProps & {
    ref?: React.Ref<HTMLTableSectionElement> | undefined;
}>;
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children?: React.ReactNode;
}
/** The body rows. */
export declare const TableBody: React.ForwardRefExoticComponent<TableBodyProps & {
    ref?: React.Ref<HTMLTableSectionElement> | undefined;
}>;
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    /** Highlight the row under a fine pointer (for rows that do something). */
    hover?: boolean;
    /** The raised selected state (glass-raised). Sets aria-selected; also show the state in a cell. */
    selected?: boolean;
    children?: React.ReactNode;
}
/** One row. */
export declare const TableRow: React.ForwardRefExoticComponent<TableRowProps & {
    ref?: React.Ref<HTMLTableRowElement> | undefined;
}>;
export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
    /** Text alignment. Default start; right for numeric cells. */
    align?: 'inherit' | 'left' | 'center' | 'right';
    /** A number: right-aligned, tabular figures. Set it on the column's header cell too. */
    numeric?: boolean;
    /** head or body look. Default from the section: head inside TableHead. */
    variant?: 'head' | 'body';
    /** Override the table's size for this cell. */
    size?: TableSize;
    /** normal, checkbox (tight, for a selection control) or none. */
    padding?: 'normal' | 'checkbox' | 'none';
    /** The column is sorted: sets aria-sort on the header cell. */
    sortDirection?: 'asc' | 'desc' | false;
    /** th or td. Default th in TableHead, td elsewhere; pass "th" for a row header. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A cell: th scope="col" in the head, td in the body, th scope="row" when you ask for a row header. */
export declare const TableCell: React.ForwardRefExoticComponent<TableCellProps & {
    ref?: React.Ref<HTMLTableCellElement> | undefined;
}>;
export interface TableSortLabelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** This column is the sorted one. */
    active?: boolean;
    /** asc (arrow up) or desc (arrow down). Default asc. */
    direction?: 'asc' | 'desc';
    /** No arrow at all on inactive columns, not even under the pointer. */
    hideSortIcon?: boolean;
    children?: React.ReactNode;
}
/**
 * A header label that sorts its column: a button with a direction arrow. Put it in a TableCell
 * with sortDirection so the th carries aria-sort.
 */
export declare const TableSortLabel: React.ForwardRefExoticComponent<TableSortLabelProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;

// data-display/Tooltip
export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
    /** The hint: a few words. Empty ('' or null) shows no tooltip. */
    title: React.ReactNode;
    /** One element that can hold a ref and takes pointer and focus handlers (a button, a link, an Avatar…). */
    children: React.ReactElement;
    /** Side and alignment. Default top. Flips when there is no room. */
    placement?: Placement;
    /** A small arrow pointing at the child. */
    arrow?: boolean;
    /** Wait before showing on hover, ms. Default 500. */
    enterDelay?: number;
    /** Wait before hiding once the pointer leaves, ms. Default 0. */
    leaveDelay?: number;
    /** Long-press time on touch, ms. Default 700. */
    enterTouchDelay?: number;
    /** How long it stays after the finger lifts, ms. Default 1500. */
    leaveTouchDelay?: number;
    /**
     * true (default): the title describes the child (aria-describedby while open).
     * false: the title names the child (aria-label), for icon-only buttons.
     */
    describeChild?: boolean;
    /** Controlled open state. */
    open?: boolean;
    /** Asked to open (hover after the delay, keyboard focus, long press). */
    onOpen?: (event: React.SyntheticEvent | Event) => void;
    /** Asked to close (pointer left, blur, Escape, press). */
    onClose?: (event: React.SyntheticEvent | Event) => void;
    disableHoverListener?: boolean;
    disableFocusListener?: boolean;
    disableTouchListener?: boolean;
    /** The tooltip ignores the pointer and closes as soon as it leaves the child. */
    disableInteractive?: boolean;
    /** Render in place instead of in document.body (inside a showcase stage). */
    disablePortal?: boolean;
    /** Props for the inner parts: the Popper layer and the role="tooltip" surface. */
    slotProps?: {
        popper?: Partial<PopperProps>;
        tooltip?: React.HTMLAttributes<HTMLDivElement>;
    };
}
/**
 * A short ink label for its child. It opens on hover after 500ms (at once when moving from another
 * tooltip), on keyboard focus and on a long press; Escape, blur and leaving close it.
 */
export declare const Tooltip: React.ForwardRefExoticComponent<TooltipProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// data-display/Typography
/** Every type token (tokens.json "type"), named without the `text-` prefix. */
export type TypographyVariant = 'display' | 'title-xl' | 'title-lg' | 'title-md' | 'statement' | 'heading' | 'card-title' | 'title-sm' | 'subtitle' | 'lede' | 'lede-sm' | 'body-lg' | 'body' | 'body-sm' | 'small' | 'caption' | 'micro' | 'nano' | 'button' | 'kicker' | 'label' | 'name' | 'code' | 'diagram-node' | 'diagram-label';
export type TypographyColor = 'inherit' | 'ink' | 'muted' | 'ink-soft' | 'accent' | 'link' | 'blue-deep' | 'danger' | 'warning' | 'success' | 'info';
export interface TypographyProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
    /** The type token to set, without `text-`: display, heading, body, micro, code… Default body. */
    variant?: TypographyVariant;
    /** Render as another element; the variant's look stays. Default from the variant (heading → h2, body → p, micro → span…). */
    component?: React.ElementType;
    /** Text colour token. Default inherit. */
    color?: TypographyColor;
    /** Text alignment. Default inherit. */
    align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
    /** One line, cut with an ellipsis. */
    noWrap?: boolean;
    /** A bottom margin of half a line (0.5em). The root has no margin otherwise. */
    gutterBottom?: boolean;
    /** Line breaking: balance (default on h1–h6, as the site), pretty (default on p) or plain wrap. */
    textWrap?: 'balance' | 'pretty' | 'wrap';
    /** Use the site's fluid size for the display group, e.g. display = clamp(44px, 5.6vw, 80px). */
    fluid?: boolean;
    children?: React.ReactNode;
}
/** Text set in one of the Blue Glass type tokens, on the element that variant means. */
export declare const Typography: React.ForwardRefExoticComponent<TypographyProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// feedback/Alert
export type AlertSeverity = 'success' | 'info' | 'warning' | 'error';
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The state it reports. Sets the icon, the status colour, the role and the word read before the message. Default info. */
    severity?: AlertSeverity;
    /** standard: the soft status tint (default). outlined: glass-control with a 1px status border. filled: the status fill under on-ink. */
    variant?: 'standard' | 'outlined' | 'filled';
    /** Replace the severity glyph. false hides it: do that only when the title or message names the state. */
    icon?: React.ReactNode | false;
    /** Actions after the message, usually one text Button at size sm ("Retry", "Undo"). */
    action?: React.ReactNode;
    /** Shows a close button after the action and is called when it's pressed. */
    onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    /** Accessible name (and tooltip) of the close button. Default "Close". */
    closeText?: string;
    /** The word screen readers hear before the message. Default Success, Info, Warning or Error. */
    severityText?: string;
    /** The message. Start it with an AlertTitle for a two-part message. */
    children?: React.ReactNode;
}
/** A status message with its icon and word: success, info, warning or error, on a soft tint, an outline or a status fill. */
export declare const Alert: React.ForwardRefExoticComponent<AlertProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface AlertTitleProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The title text: a few words that name the state ("Upload failed"). */
    children?: React.ReactNode;
}
/** The alert's first line: weight 600 in the status colour. */
export declare const AlertTitle: React.ForwardRefExoticComponent<AlertTitleProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// feedback/Backdrop
export interface BackdropProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Show the backdrop. */
    open: boolean;
    /** Transparent: still catches clicks (popovers, menus). */
    invisible?: boolean;
    /** Fade duration in ms. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Keep in the DOM while closed. */
    keepMounted?: boolean;
    children?: React.ReactNode;
}
/** The scrim behind a modal task: dims and frosts the page so the dialog reads first. Also a loading cover. */
export declare const Backdrop: React.ForwardRefExoticComponent<BackdropProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// feedback/Dialog
export type DialogScroll = 'paper' | 'body';
export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClose'> {
    /** Show the dialog. */
    open: boolean;
    /** Called with the reason (backdropClick or escapeKeyDown); you decide whether to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** Width cap: xs 444px, sm 600px, md 900px, or false for none. Default sm. */
    maxWidth?: 'xs' | 'sm' | 'md' | false;
    /** Take the whole maxWidth (less the side margins) instead of fitting the content. */
    fullWidth?: boolean;
    /** Fill the viewport with square corners. "phone" does it only at 700px and below. */
    fullScreen?: boolean | 'phone';
    /** paper: the content scrolls between a fixed title and actions, fading at its edges (default). body: the whole dialog scrolls in its layer. */
    scroll?: DialogScroll;
    /** Grow timing in ms, or { enter, exit }. Default 200 in, 140 out. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Extra props for the glass surface, the element with role="dialog". */
    PaperProps?: Partial<PaperProps>;
    /** Stay in the DOM while closed. */
    keepMounted?: boolean;
    /** No scrim: the page stays undimmed (a press outside still closes). */
    hideBackdrop?: boolean;
    /** Props for the scrim (Backdrop). */
    BackdropProps?: Partial<BackdropProps>;
    /** Escape does nothing. Keep it on unless leaving would lose work. */
    disableEscapeKeyDown?: boolean;
    /** Don't move focus into the dialog on open. */
    disableAutoFocus?: boolean;
    /** Let focus leave the dialog while it's open. */
    disableEnforceFocus?: boolean;
    /** Don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    /** Leave the page scrollable underneath. */
    disableScrollLock?: boolean;
    /** Render in place (inside a showcase Stage) instead of in document.body. */
    disablePortal?: boolean;
    /** Where the portal mounts. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** DialogTitle, DialogContent and DialogActions. */
    children?: React.ReactNode;
}
/**
 * A modal task on a glass panel: Modal underneath (scrim, focus kept in, Escape,
 * scroll lock, the page made inert), Grow from the centre, title and description
 * wired to the surface's aria-labelledby and aria-describedby.
 */
export declare const Dialog: React.ForwardRefExoticComponent<DialogProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    /** The dialog's name: a question or a verb phrase ("Delete the RS50 bridge draft?"). */
    children?: React.ReactNode;
}
/** The dialog's name in text-title-sm, wired to the surface's aria-labelledby. */
export declare const DialogTitle: React.ForwardRefExoticComponent<DialogTitleProps & {
    ref?: React.Ref<HTMLHeadingElement> | undefined;
}>;
export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Hairlines (color-line) above and below, for long content between the title and the actions. */
    dividers?: boolean;
    /** Body copy (DialogContentText), fields, lists. */
    children?: React.ReactNode;
}
/** The dialog's body, which with scroll="paper" scrolls on its own and fades at whichever edge has more. */
export declare const DialogContent: React.ForwardRefExoticComponent<DialogContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface DialogContentTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
    /** One or two sentences: what happens, and what stays as it is. */
    children?: React.ReactNode;
}
/** Body copy in color-muted (text-body-sm), wired to the surface's aria-describedby. */
export declare const DialogContentText: React.ForwardRefExoticComponent<DialogContentTextProps & {
    ref?: React.Ref<HTMLParagraphElement> | undefined;
}>;
export interface DialogActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Buttons, the primary one last. */
    children?: React.ReactNode;
}
/** The button row: right-aligned, space-sm apart, the primary action last. */
export declare const DialogActions: React.ForwardRefExoticComponent<DialogActionsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// feedback/Progress
export interface LinearProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
    /** determinate: a bar for value. buffer: value plus valueBuffer. indeterminate (default): a bar slides while the length is unknown. */
    variant?: 'determinate' | 'indeterminate' | 'buffer';
    /** Progress from 0 to 100 (determinate and buffer). */
    value?: number;
    /** How much is ready ahead of value, 0 to 100 (buffer), drawn in color-ring at 40%. */
    valueBuffer?: number;
    /** Visible label above the track; it also names the progressbar. */
    label?: React.ReactNode;
    /** A readable value shown at the end of the label row and read as aria-valuetext ("3 of 5 files"). */
    valueText?: string;
    /** Show the rounded percentage at the end of the label row (determinate and buffer). */
    showValue?: boolean;
    /** default: color-blue on a color-line track. inherit: currentColor, for dark grounds. */
    color?: 'default' | 'inherit';
}
/** A 4px pill track in color-line with a color-blue bar: determinate, buffered, or sliding while the length is unknown. */
export declare const LinearProgress: React.ForwardRefExoticComponent<LinearProgressProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface CircularProgressProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
    /** determinate: an arc for value. indeterminate (default): a turning arc that grows and shrinks. */
    variant?: 'determinate' | 'indeterminate';
    /** Progress from 0 to 100 (determinate). */
    value?: number;
    /** xs 20px, sm 28px, md 40px (default), lg 56px, or a number of px. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | number;
    /** Ring stroke in px. Default 2.5, 3, 4 or 4.5 by size. */
    thickness?: number;
    /** Show the rounded percentage in the middle (determinate, 40px and up). */
    showValue?: boolean;
    /** default: color-blue on a color-line ring. inherit: currentColor, for dark grounds. */
    color?: 'default' | 'inherit';
}
/** An SVG ring: color-line track and a color-blue arc with round caps; determinate, or turning while the length is unknown. */
export declare const CircularProgress: React.ForwardRefExoticComponent<CircularProgressProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// feedback/Skeleton
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** text: one line at the current font size (default). rectangular: square corners. rounded: radius-well. circular: a circle. */
    variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
    /** Width: a number of px or any CSS length. Default the full line (text) or the children's width. */
    width?: number | string;
    /** Height: a number of px or any CSS length. Text takes its height from the font size. */
    height?: number | string;
    /** pulse: a slow opacity breath (default). wave: a light sheen moving across. false: still. */
    animation?: 'pulse' | 'wave' | false;
    /** Content to size the placeholder by; it stays invisible. */
    children?: React.ReactNode;
}
/** A color-line placeholder in the shape of what is loading, always aria-hidden (the region it stands in for carries aria-busy). */
export declare const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// feedback/Snackbar
export type SnackbarCloseReason = 'timeout' | 'clickaway' | 'escapeKeyDown' | 'closeButton';
export interface SnackbarOrigin {
    /** The edge it sits on and slides in from. */
    vertical: 'top' | 'bottom';
    /** Where along that edge. */
    horizontal: 'left' | 'center' | 'right';
}
export interface SnackbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClose'> {
    /** Show the snackbar. */
    open: boolean;
    /** Called with the reason: timeout, clickaway, escapeKeyDown or closeButton. You decide whether to close. */
    onClose?: (event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => void;
    /** The message: one short sentence. */
    message?: React.ReactNode;
    /** One action after the message, usually a text Button at size sm ("Undo", "View"). */
    action?: React.ReactNode;
    /** Add a close icon button after the action; it calls onClose with "closeButton". */
    closable?: boolean;
    /** Accessible name (and tooltip) of the close button. Default "Close". */
    closeText?: string;
    /** The edge and position. Default bottom center. */
    anchorOrigin?: SnackbarOrigin;
    /** Close after this many ms (reason "timeout"); null keeps it open. Paused while pointed at, focused, or the window is in the background. */
    autoHideDuration?: number | null;
    /** Time left after a pause ends. Default half of autoHideDuration. */
    resumeHideDuration?: number;
    /** Keep the timer running while the window is in the background. */
    disableWindowBlurListener?: boolean;
    /** Slide timing in ms, or { enter, exit }. Default 280 in, 220 out. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Render in place (inside a showcase Stage) instead of in document.body. */
    disablePortal?: boolean;
    /** Where the portal mounts. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** Replace the ink surface with your own element, e.g. an Alert. message, action and closable are then ignored. */
    children?: React.ReactElement;
}
/**
 * A brief message at the edge of the screen: the ink pill's ground and lift, sliding
 * in from its edge, read politely, closing itself after a pause-aware timeout.
 */
export declare const Snackbar: React.ForwardRefExoticComponent<SnackbarProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// surfaces/Accordion
export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** Open (controlled). Pair with onChange. */
    expanded?: boolean;
    /** Open on first render (uncontrolled). */
    defaultExpanded?: boolean;
    /** Called when the summary is pressed, with the requested state. */
    onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
    /** Dims the row; the summary can't be focused or pressed. */
    disabled?: boolean;
    /** Level of the heading that wraps the summary button. Default 3. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    /** Props for the Collapse that reveals the details: timeout ({ enter: 300, exit: 200 } by default), unmountOnExit. */
    TransitionProps?: Partial<Pick<CollapseProps, 'timeout' | 'unmountOnExit' | 'mountOnEnter' | 'onEntered' | 'onExited'>>;
    /** An AccordionSummary first, then the AccordionDetails. */
    children?: React.ReactNode;
}
/**
 * One row of the site's career list (.career-row): a summary button with the
 * plus/minus toggle, its details revealed with Collapse. Stack rows inside an
 * element with class "gl-accordion-surface" for the list's glass surface (.career-surface).
 */
export declare const Accordion: React.ForwardRefExoticComponent<AccordionProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface AccordionSummaryProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Second column, in color-muted (.career-position): a role, a short fact. */
    secondary?: React.ReactNode;
    /** Third column, right-aligned in color-muted (.career-date): a date, a count. */
    meta?: React.ReactNode;
    /** Replace the plus/minus toggle with an icon; it turns 180° when open (use chevron-down). */
    expandIcon?: React.ReactNode;
    /** The row's title (.career-employer): 17px, -0.02em. */
    children?: React.ReactNode;
}
/**
 * The row's header (.career-row summary): a full-width button in a heading,
 * columns for title, secondary and meta, and the plus that turns into a minus.
 */
export declare const AccordionSummary: React.ForwardRefExoticComponent<AccordionSummaryProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
export interface AccordionDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** A small closing line at 11px (.career-description > span), such as the role's location. */
    meta?: React.ReactNode;
    /** Indent the details under the second column (26% on the left), as the site does. Default true; false runs full width. */
    inset?: boolean;
    children?: React.ReactNode;
}
/** The revealed part of a row (.career-description): 14px copy in color-muted, paragraphs 10px apart. */
export declare const AccordionDetails: React.ForwardRefExoticComponent<AccordionDetailsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface PaneAccordionItem {
    /** Stable id: the React key and the base of the pane's ids. Default: the title, slugified (or the index). */
    id?: string;
    /** The pane's title (.pane-title), 22px. */
    title: React.ReactNode;
    /** The blurb, always visible (.pane-text). */
    text?: React.ReactNode;
    /** Tags revealed when the pane opens (.more > .chips). */
    chips?: React.ReactNode[];
    /** Other content to reveal instead of chips. */
    more?: React.ReactNode;
    /** default: glass-control. alt: fainter glass. accent: the ring-tinted pane with an accent title; one per set. */
    tone?: 'default' | 'alt' | 'accent';
}
export interface PaneAccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** The panes, left to right. */
    items: PaneAccordionItem[];
    /**
     * auto: the site's layout, panes side by side, stacked at 899px and below.
     * horizontal: side by side down to 701px, stacked on phones. vertical: always stacked.
     */
    orientation?: 'auto' | 'horizontal' | 'vertical';
    /** Ids of the open panes (controlled). Panes not listed are closed. */
    open?: string[];
    /** Ids of the panes open on first render (uncontrolled). */
    defaultOpen?: string[];
    /** Called when a pane is pressed, with the ids that are now open. */
    onChange?: (event: React.SyntheticEvent, open: string[]) => void;
    /** Level of the heading around each pane's button. Default 3. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
}
/**
 * The site's horizontal accordion (.acc): glass panes that widen to 2.6x on
 * hover, focus or press and reveal their chips. Narrow screens and touch get a
 * tap toggle with the chips shown, as scripts/accordion.ts does.
 */
export declare const PaneAccordion: React.ForwardRefExoticComponent<PaneAccordionProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// surfaces/AppBar
export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * static: in the flow with no fill, the site's header over the light field (default).
     * sticky: sticks to the top of its scroll container, on glass. fixed: fixed to the
     * viewport (or the nearest transformed ancestor), on glass. Both sit at z-app-bar.
     */
    position?: 'static' | 'sticky' | 'fixed';
    /** Sticky and fixed: lift the bar with a shadow only once its scroll container has scrolled. */
    elevateOnScroll?: boolean;
    /** The element to render. Default "header". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The page's top bar (.identity-strip's header). Static it is the site's header,
 * transparent over the light field; sticky and fixed put it on glass with blur-control.
 */
export declare const AppBar: React.ForwardRefExoticComponent<AppBarProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ToolbarProps extends React.HTMLAttributes<HTMLElement> {
    /** regular: the site's identity strip, 38px 5% (28px from 1000px down). dense: 12px tall padding, for sticky bars. */
    variant?: 'regular' | 'dense';
    /** Drop the 5% side padding. */
    disableGutters?: boolean;
    /** The element to render. Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The bar's row (.identity-strip): flex, centred items, space-between, 25px
 * gaps, capped at size-header (1380px). It wraps under 700px.
 */
export declare const Toolbar: React.ForwardRefExoticComponent<ToolbarProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// surfaces/Card
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * glass: the site's project card (.card.glass-panel), the default.
     * outlined: a hairline and no fill, for grouping without depth.
     * inset: a glass-inset well, for a card that sits inside a glass panel.
     */
    variant?: 'glass' | 'outlined' | 'inset';
    /** The element to render. The site's cards are "article". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The site's project card (.card.glass-panel): a glass panel stacking header, media, content and actions 26px apart. */
export declare const Card: React.ForwardRefExoticComponent<CardProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    /** The card title: 30px, weight 400, -0.04em (.card-head h3); 26px under 700px. */
    title?: React.ReactNode;
    /** One or two sentences under the title, in color-muted at 15px (.card-head p). */
    subheader?: React.ReactNode;
    /** Something before the text: an orb, a mark or an icon. */
    avatar?: React.ReactNode;
    /** Something at the end of the row: a status or an icon button. */
    action?: React.ReactNode;
    /** Heading level of the title. Default 3, as on the site. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
}
/** The card's title block (.card-head): the title, then a muted description. */
export declare const CardHeader: React.ForwardRefExoticComponent<CardHeaderProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The element to render. Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** Body copy for a card: 15px in color-muted, the site's card description, with children spaced 12px apart. */
export declare const CardContent: React.ForwardRefExoticComponent<CardContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface CardMediaProps extends React.HTMLAttributes<HTMLElement> {
    /** An image URL, rendered as an <img> filling the well. Leave it out to put a diagram or SVG in children. */
    image?: string;
    /** Alternative text for `image`. Use "" only when the image repeats nearby text. */
    alt?: string;
    /** Minimum height of the well, px or any CSS length. */
    height?: number | string;
    /** Let the content run to the well's edge (the default pads it 22px, 16px under 700px). */
    disablePadding?: boolean;
    /** The element to render, e.g. "figure". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** An inset well for the card's figure (.project-figure): glass-inset, a light edge, radius-well. */
export declare const CardMedia: React.ForwardRefExoticComponent<CardMediaProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Tags on the left. Strings render as the site's chips (.chip); elements render as given. */
    chips?: React.ReactNode[];
    /** Accessible name of the chip list. Default "Tags". */
    chipsLabel?: string;
    /** The links or buttons on the right: use Button variant="text" with an arrow-ne end icon for "Repository ↗". */
    children?: React.ReactNode;
}
/** The card's footer (.card-foot): chips on the left, link-weight actions on the right, wrapping on small screens. */
export declare const CardActions: React.ForwardRefExoticComponent<CardActionsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface CardActionAreaProps extends React.HTMLAttributes<HTMLElement> {
    /** Render a link to this URL; without it, a button (give it onClick). */
    href?: string;
    target?: string;
    rel?: string;
    /** Not interactive: the card dims and ignores presses. */
    disabled?: boolean;
    children?: React.ReactNode;
}
/**
 * Makes the whole card one target: wrap the title in it and its hit area and
 * focus ring stretch over the card. Links in CardActions stay separately clickable.
 */
export declare const CardActionArea: React.ForwardRefExoticComponent<CardActionAreaProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// surfaces/Paper
export interface PaperProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * glass: the frosted panel (.glass-panel), the default.
     * inset: a well inside a panel (.project-figure).
     * solid: glass-solid, no blur, for surfaces stacked on glass.
     * outlined: transparent with a hairline.
     */
    variant?: 'glass' | 'inset' | 'solid' | 'outlined';
    /** Shadow depth: 0 none, 1 shadow-pane, 2 shadow-panel (glass default). */
    elevation?: 0 | 1 | 2;
    /** Corner radius token. Default radius-panel for glass and solid, radius-well for inset, radius-pane for outlined. */
    radius?: 'panel' | 'pane' | 'well' | 'control' | 'none';
    /** Render as another element, e.g. "section" or "figure". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The surface every panel is cut from: translucent white over the light field, blurred, with a top highlight. */
export declare const Paper: React.ForwardRefExoticComponent<PaperProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// surfaces/LightField
export interface LightFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * The site's placements: top (behind the hero), middle (behind a long section),
     * bottom (behind the contact slab). compact fits any box: an addition for
     * dialogs, cards and previews.
     */
    variant?: 'top' | 'middle' | 'bottom' | 'compact';
}
/**
 * The blurred rings and fold the glass sits on (src/components/LightField.tsx).
 * Decorative only. Put it first inside a container with position: relative,
 * isolation: isolate and overflow: clip; it paints behind that container's content.
 */
export declare const LightField: React.ForwardRefExoticComponent<LightFieldProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// navigation/BottomNavigation
export interface BottomNavigationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue'> {
    /** The selected action's value (controlled). Actions without a value use their index. */
    value?: any;
    /** The selected value when uncontrolled. */
    defaultValue?: any;
    /** Called with the event and the chosen action's value. */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
    /** Show every action's label. Default false: only the selected action shows its label. */
    showLabels?: boolean;
    /** Pin the bar bottom-centre in the viewport, above the safe-area inset, at z-app-bar. */
    fixed?: boolean;
    /** Three to five BottomNavigationAction elements. */
    children?: React.ReactNode;
}
export interface BottomNavigationActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
    /** The visible label. It stays the accessible name when hidden, so always pass one. */
    label?: React.ReactNode;
    /** An Icon, drawn at 20px above the label. */
    icon?: React.ReactNode;
    /** Identifies the action. Default its index. */
    value?: any;
    /** Render a link (<a href>) instead of a <button>: use it to move between pages. */
    href?: string;
    /** Render a router link component instead of <a>; it receives href and className. */
    component?: React.ElementType;
    /** Show the label even when not selected. Set by BottomNavigation from showLabels. */
    showLabel?: boolean;
    /** Set by BottomNavigation. */
    selected?: boolean;
    /** Set by BottomNavigation: called with the event and this action's value. */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
}
/**
 * The header's nav pill as a bottom bar: three to five icon-over-label actions, the
 * current one raised out of the track.
 */
export declare const BottomNavigation: React.ForwardRefExoticComponent<BottomNavigationProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
/** One destination in a BottomNavigation: an icon over its label; aria-current="page" when selected. */
export declare const BottomNavigationAction: React.ForwardRefExoticComponent<BottomNavigationActionProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;

// navigation/Breadcrumbs
export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
    /** The trail, in order: Link elements (or router links), with the current page last. */
    children?: React.ReactNode;
    /** Node between crumbs. Default a chevron-right Icon in color-muted, hidden from screen readers. */
    separator?: React.ReactNode;
    /** Collapse the middle of the trail when it has more crumbs than this. Default 8. */
    maxItems?: number;
    /** Crumbs kept before the "…" button when collapsed. Default 1. */
    itemsBeforeCollapse?: number;
    /** Crumbs kept after the "…" button when collapsed. Default 1. */
    itemsAfterCollapse?: number;
    /** Accessible name of the "…" button. Default "Show path". */
    expandText?: string;
    /** Treat the last crumb as the current page: color-ink and aria-current="page". Default true. */
    lastIsCurrent?: boolean;
    /** sm: 12px; md: 13px (text-caption). Default md. */
    size?: 'sm' | 'md';
}
/** The path to the current page, as a list of links; long trails fold into a "…" button. */
export declare const Breadcrumbs: React.ForwardRefExoticComponent<BreadcrumbsProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// navigation/Drawer
export type DrawerCloseReason = 'backdropClick' | 'escapeKeyDown' | 'closeButton' | 'swipe';
export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';
export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    /** Shown (temporary, persistent). A permanent drawer is always shown. */
    open?: boolean;
    /** Called with the reason: backdropClick, escapeKeyDown, closeButton or swipe. Set open to false to close. Shows the close button. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: DrawerCloseReason) => void;
    /** The edge it comes from. Default left. */
    anchor?: DrawerAnchor;
    /** temporary: a modal panel over a scrim (default). persistent: slides in and pushes the content beside it. permanent: a static panel. */
    variant?: 'temporary' | 'persistent' | 'permanent';
    /** true: floats 12px in from the edges on radius-panel (default). false: flush to the edge, only the inner corners rounded. */
    inset?: boolean;
    /** Panel width for left and right, a number in px or a CSS length. Default 320. Top and bottom size to their content. */
    width?: number | string;
    /** The heading in the header slot; it also names the drawer. */
    title?: React.ReactNode;
    /** Accessible name of the close button. Default "Close". */
    closeLabel?: string;
    /** temporary: no scrim; the page behind stays visible. */
    hideBackdrop?: boolean;
    /** temporary: keep the panel mounted while closed. */
    keepMounted?: boolean;
    /** temporary: render in place instead of in document.body. */
    disablePortal?: boolean;
    /** temporary: don't lock the page's scroll. */
    disableScrollLock?: boolean;
    /** temporary: don't move focus into the panel on open. */
    disableAutoFocus?: boolean;
    /** temporary: let focus leave the panel while open. */
    disableEnforceFocus?: boolean;
    /** temporary: don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    /** temporary: Escape doesn't close it. */
    disableEscapeKeyDown?: boolean;
    /** temporary: where to portal, default document.body. */
    container?: Element | (() => Element | null) | null;
    /** temporary: slide timing in ms (default 280 in, 220 out). */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Props for the glass surface (a Paper). */
    PaperProps?: React.HTMLAttributes<HTMLElement>;
    /** The drawer's content, in a scrolling body under the header. */
    children?: React.ReactNode;
}
/** A glass panel from an edge of the screen: temporary over a scrim, persistent beside the content it pushes, or permanent. */
export declare const Drawer: React.ForwardRefExoticComponent<DrawerProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// navigation/Link
export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'color'> {
    /**
     * always: the inline prose link, underlined 3px below the text (.hiw-asof a), the default.
     * hover: the "go" link (.replink, .figure-link): 13px, no underline until a fine-pointer
     * hover (5px offset), a 32px tap target. none: never underlined.
     */
    underline?: 'always' | 'hover' | 'none';
    /** Text colour: color-link, color-ink, color-muted or inherit. Default link for always, ink otherwise. */
    color?: 'link' | 'ink' | 'muted' | 'inherit';
    /**
     * Opens in a new tab: sets target="_blank" and rel="noopener noreferrer", adds the arrow-ne
     * icon and a screen-reader note. Turns on by itself when target="_blank".
     */
    external?: boolean;
    /** Icon after the text, e.g. `<Icon name="arrow-ne" />` on a same-tab "go" link. external adds arrow-ne unless you pass one. */
    endIcon?: React.ReactNode;
    /** The screen-reader note on external links. Default "(opens in a new tab)". */
    newTabLabel?: string;
    /** Render another element, e.g. a router link or "button"; it receives className, href and the rest. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The site's links: underlined prose links in color-link, and the "go" links that underline under a pointer. */
export declare const Link: React.ForwardRefExoticComponent<LinkProps & {
    ref?: React.Ref<HTMLAnchorElement> | undefined;
}>;

// navigation/Menu
export type MenuCloseReason = 'backdropClick' | 'escapeKeyDown' | 'itemClick' | 'tabKeyDown';
export interface MenuListProps extends React.HTMLAttributes<HTMLUListElement> {
    /** Move focus to the selected item, else the first enabled one, when this turns true. Menu sets it on open. */
    autoFocusItem?: boolean;
    /** Compact 32px rows for pointer-heavy screens. */
    dense?: boolean;
    /** Stop at the first and last item instead of wrapping around. */
    disableListWrap?: boolean;
    /** MenuItems, with separators between groups (`divider` on an item, or `<li role="separator" />`). */
    children?: React.ReactNode;
}
/** A role="menu" list with roving focus (Up and Down, Home and End, typeahead) that Menu renders, or that stands alone as an always-visible menu. */
export declare const MenuList: React.ForwardRefExoticComponent<MenuListProps & {
    ref?: React.Ref<HTMLUListElement> | undefined;
}>;
export interface MenuItemProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
    /** Icon before the label, 16px. */
    icon?: React.ReactNode;
    /** A second line under the label, in color-muted. */
    secondary?: React.ReactNode;
    /** Trailing slot: a shortcut ("⌘C"), a count, or arrow-ne on a link. Pair a shortcut with aria-keyshortcuts. */
    end?: React.ReactNode;
    /** The current choice in a set: the raised row, a check and aria-checked. Setting it, true or false, makes the item a menuitemradio. */
    selected?: boolean;
    /** Can't be chosen; still reachable with the arrows, as APG recommends, and announced as dimmed. */
    disabled?: boolean;
    /** A hairline separator after this item. */
    divider?: boolean;
    /** A 32px row. Inherits the list's dense. */
    dense?: boolean;
    /** danger for destructive items ("Delete"). */
    tone?: 'default' | 'danger';
    /** Render the item as a link: <a role="menuitem"> inside <li role="none">. */
    href?: string;
    /** Link target, with href. */
    target?: string;
    /** Link rel, with href. */
    rel?: string;
    /** Called on click, Enter or Space. The surrounding Menu then closes, unless you call event.preventDefault(). */
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    /** The label. */
    children?: React.ReactNode;
}
/** One row of a menu on the shared option row: an icon, a label with an optional second line, and an end slot. */
export declare const MenuItem: React.ForwardRefExoticComponent<MenuItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface MenuProps extends Omit<PopoverProps, 'onClose' | 'padding' | 'children'> {
    /** Called with the reason (backdropClick, escapeKeyDown, itemClick, tabKeyDown). Set open to false to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: MenuCloseReason) => void;
    /** Focus the selected item, else the first enabled one, when it opens. Default true. */
    autoFocus?: boolean;
    /** Compact 32px rows. */
    dense?: boolean;
    /** Id of the role="menu" list, for the button's aria-controls. */
    id?: string;
    /** Props for the inner MenuList. aria-labelledby defaults to the anchor's id. */
    MenuListProps?: Partial<MenuListProps>;
    /** MenuItems, with separators between groups. */
    children?: React.ReactNode;
}
/** A list of actions on a glass popover anchored to the button that opens it, closing on a choice, an outside press, Escape or Tab. */
export declare const Menu: React.ForwardRefExoticComponent<MenuProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// navigation/Pagination
export type PaginationItemType = 'page' | 'first' | 'last' | 'next' | 'previous' | 'start-ellipsis' | 'end-ellipsis';
/** What Pagination hands renderItem for each item; spread it onto a PaginationItem. */
export interface PaginationRenderItemParams {
    type: PaginationItemType;
    page: number | null;
    selected: boolean;
    disabled: boolean;
    size: 'sm' | 'md';
    variant: 'glass' | 'text';
    'aria-label'?: string;
    'aria-current'?: 'page';
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
}
export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
    /** Number of pages. Default 1. */
    count?: number;
    /** The current page, 1-based (controlled). */
    page?: number;
    /** The current page when uncontrolled. Default 1. */
    defaultPage?: number;
    /** Called with the event and the new page. */
    onChange?: (event: React.SyntheticEvent, page: number) => void;
    /** Pages shown on each side of the current one. Default 1. */
    siblingCount?: number;
    /** Pages always shown at each end. Default 1. */
    boundaryCount?: number;
    /** Disable every item. */
    disabled?: boolean;
    /** Add a first-page button. */
    showFirstButton?: boolean;
    /** Add a last-page button. */
    showLastButton?: boolean;
    /** Drop the previous-page button. */
    hidePrevButton?: boolean;
    /** Drop the next-page button. */
    hideNextButton?: boolean;
    /** glass: chip pills (glass-control with the chip hairline), the default. text: no fill until hover. */
    variant?: 'glass' | 'text';
    /** md: 36px pills; sm: 28px. Default md. */
    size?: 'sm' | 'md';
    /** Accessible name of each item. Default "Go to page 4", "Page 3" for the current one, "Go to next page". */
    getItemAriaLabel?: (type: PaginationItemType, page: number | null, selected: boolean) => string;
    /** Render each item yourself, e.g. `<PaginationItem {...item} href={…} />` for links. */
    renderItem?: (item: PaginationRenderItemParams) => React.ReactNode;
}
export interface PaginationItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** A page, a step button (first, previous, next, last) or an ellipsis. Default page. */
    type?: PaginationItemType;
    /** The page the item goes to; null for an ellipsis. */
    page?: number | null;
    /** The current page: the color-ink pill with on-ink text. Pair it with aria-current="page". */
    selected?: boolean;
    disabled?: boolean;
    /** glass (default) or text, as on Pagination. */
    variant?: 'glass' | 'text';
    /** md (36px, default) or sm (28px). */
    size?: 'sm' | 'md';
    /** Render a link instead of a button. */
    href?: string;
    /** Render a router link component instead; it receives href and className. */
    component?: React.ElementType;
}
/** One pill in a Pagination: a page, a previous/next/first/last chevron, or a non-interactive ellipsis. */
export declare const PaginationItem: React.ForwardRefExoticComponent<PaginationItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
/** Page links as a row of pills, the current page in ink; folds long ranges with ellipses (MUI's algorithm). */
export declare const Pagination: React.ForwardRefExoticComponent<PaginationProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// navigation/SpeedDial
export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right';
export type SpeedDialOpenReason = 'toggle' | 'mouseEnter' | 'keyboard';
export type SpeedDialCloseReason = 'toggle' | 'blur' | 'mouseLeave' | 'escapeKeyDown' | 'actionClick';
export interface SpeedDialProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'hidden' | 'children'> {
    /** Accessible name of the trigger, such as "Contact and share". Required: the trigger is icon-only. */
    ariaLabel: string;
    /** Open (controlled). */
    open?: boolean;
    /** Open at first (uncontrolled). */
    defaultOpen?: boolean;
    /** Called when it asks to open, with the reason: toggle, mouseEnter or keyboard. */
    onOpen?: (event: React.SyntheticEvent, reason: SpeedDialOpenReason) => void;
    /** Called when it asks to close, with the reason: toggle, blur, mouseLeave, escapeKeyDown or actionClick. */
    onClose?: (event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => void;
    /** The way the actions fan out from the trigger. Default up. */
    direction?: SpeedDialDirection;
    /** Zoom the whole dial out, closing it; for example while the reader scrolls down. */
    hidden?: boolean;
    /** The trigger's icon. Default a SpeedDialIcon: a plus that turns 45° into a close. */
    icon?: React.ReactNode;
    /** Also open on hover with a fine pointer, not only on click. Default true. */
    openOnHover?: boolean;
    /** Props for the trigger Fab, e.g. size. It stays the ink circle. */
    FabProps?: Partial<FabProps>;
    /** SpeedDialActions, the one nearest the trigger first. */
    children?: React.ReactNode;
}
/** A floating action button that fans out up to five related actions, each a small glass Fab with a label pill. */
export declare const SpeedDial: React.ForwardRefExoticComponent<SpeedDialProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface SpeedDialActionProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onClick'> {
    /** The action's icon. */
    icon: React.ReactNode;
    /** The action's name: shown in its label pill, and the button's accessible name. */
    tooltipTitle: React.ReactNode;
    /** Keep the label pill shown while the dial is open (touch screens have no hover). Otherwise it shows on hover and focus. */
    tooltipOpen?: boolean;
    /** Side the label sits on. Default left for up and down dials, top for left and right ones. */
    tooltipPlacement?: 'left' | 'right' | 'top' | 'bottom';
    /** Can't be chosen; skipped by the arrow keys. */
    disabled?: boolean;
    /** Called on click, Enter or Space. The dial then closes, unless you call event.preventDefault(). */
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    /** Entry delay in ms. SpeedDial sets it to stagger the actions; leave it unset. */
    delay?: number;
    /** Props for the action's glass Fab. */
    FabProps?: Partial<FabProps>;
}
/** One action of a SpeedDial: a small glass Fab with an ink label pill. */
export declare const SpeedDialAction: React.ForwardRefExoticComponent<SpeedDialActionProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface SpeedDialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The closed icon. Default a plus, which turns 45° into a close as the dial opens. */
    icon?: React.ReactNode;
    /** An icon to cross-fade to when open, instead of turning the plus. */
    openIcon?: React.ReactNode;
    /** Override the dial's open state. */
    open?: boolean;
}
/** The trigger's icon: a plus that turns 45° into a close, or a cross-fade to openIcon. */
export declare const SpeedDialIcon: React.ForwardRefExoticComponent<SpeedDialIconProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// navigation/Stepper
export interface StepperProps extends Omit<React.HTMLAttributes<HTMLOListElement>, 'onChange'> {
    /** The current step, 0-based. Steps before it are completed unless nonLinear. Default 0. */
    activeStep?: number;
    /** horizontal (default): a row of steps joined by connectors. vertical: a column, with StepContent under the active step. */
    orientation?: 'horizontal' | 'vertical';
    /** Horizontal only: labels centred under their icons. */
    alternativeLabel?: boolean;
    /** Steps can be visited in any order: every StepLabel becomes a button, and only Step's completed prop marks a step done. */
    nonLinear?: boolean;
    /** nonLinear: called with the event and the index of the step a person picked. */
    onChange?: (event: React.SyntheticEvent, step: number) => void;
    /** Step elements. */
    children?: React.ReactNode;
}
export interface StepProps extends React.HTMLAttributes<HTMLLIElement> {
    /** Override whether this is the current step. Default index === activeStep. */
    active?: boolean;
    /** The step is done: an ink check, and the connector after it turns ink. Default index < activeStep (linear only). */
    completed?: boolean;
    /** nonLinear: the step's button can't be pressed. */
    disabled?: boolean;
    /** Vertical: keep this step's StepContent open when it isn't active. */
    expanded?: boolean;
    /** A StepLabel, then a StepContent (vertical only). */
    children?: React.ReactNode;
}
export interface StepLabelProps extends React.HTMLAttributes<HTMLElement> {
    /** The step failed: the error icon, the label in danger, and "error" for screen readers. */
    error?: boolean;
    /** A caption under the label: "Optional", a date, a short status. */
    optional?: React.ReactNode;
    /** Replace the step number: a short string, a number or an Icon. */
    icon?: React.ReactNode;
    /** The label. */
    children?: React.ReactNode;
}
export interface StepContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Reveal timing in ms, or { enter, exit }. Default 450 in, 300 out (Collapse). */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    children?: React.ReactNode;
}
export interface MobileStepperProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Total number of steps. */
    steps: number;
    /** The current step, 0-based. Default 0. */
    activeStep?: number;
    /** dots (default): a dot per step, the current one a wider ink pill. progress: a bar. text: "Step 2 of 5". */
    variant?: 'dots' | 'progress' | 'text';
    /** static (default) sits in the flow; bottom and top pin a glass bar to the viewport at z-mobile-stepper. */
    position?: 'static' | 'bottom' | 'top';
    /** The back control: a glass Button with a chevron-left icon. */
    backButton?: React.ReactNode;
    /** The next control: a glass Button with a chevron-right icon. */
    nextButton?: React.ReactNode;
    /** The step text, announced politely on every change and shown by the text variant. Default "Step 2 of 5". */
    getStepText?: (step: number, steps: number) => string;
    /** Name the group (role="group") after the process, e.g. "Shipping a merged pull request". */
    'aria-label'?: string;
}
/** A sequence of steps: where a process is, what is done and what comes next. */
export declare const Stepper: React.ForwardRefExoticComponent<StepperProps & {
    ref?: React.Ref<HTMLOListElement> | undefined;
}>;
/** One step: an <li> holding its StepLabel (and StepContent when vertical), with the connector from the step before. */
export declare const Step: React.ForwardRefExoticComponent<StepProps & {
    ref?: React.Ref<HTMLLIElement> | undefined;
}>;
/** A step's icon, label and optional caption; a button when the Stepper is nonLinear. */
export declare const StepLabel: React.ForwardRefExoticComponent<StepLabelProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
/** Vertical steppers only: the active step's detail, revealed with Collapse along the connector line. */
export declare const StepContent: React.ForwardRefExoticComponent<StepContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
/** A compact stepper for narrow screens: back, the position as dots, a bar or text, then next. */
export declare const MobileStepper: React.ForwardRefExoticComponent<MobileStepperProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// navigation/Tabs
export type TabValue = string | number;
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The selected tab's value (controlled). false selects none. */
    value?: TabValue | false;
    /** The tab selected first (uncontrolled). Default: the first enabled tab. */
    defaultValue?: TabValue | false;
    /** Called with the new value when a tab is chosen by click or by the arrow keys. */
    onChange?: (event: React.SyntheticEvent, value: TabValue) => void;
    /** underline: tabs in a row over a sliding ink mark (default). pill: the site's nav pill. side: the client-work selector beside its panels. */
    variant?: 'underline' | 'pill' | 'side';
    /** Stretch the tabs to share the row (underline and pill). */
    fullWidth?: boolean;
    /** Names the tab list. */
    'aria-label'?: string;
    /** Names the tab list by another element's id. */
    'aria-labelledby'?: string;
    /** Tab elements, then the TabPanels (wrapped in a Paper or not). */
    children?: React.ReactNode;
}
/** A set of tabs and their panels, where Tab children form the tab list and every other child is the panel area. */
export declare const Tabs: React.ForwardRefExoticComponent<TabsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'type'> {
    /** Matches a TabPanel's value. Default: the tab's position (0, 1, 2…). */
    value?: TabValue;
    /** The label; children work too. */
    label?: React.ReactNode;
    /** Icon before the label, 16px. In the side variant it replaces the orb; null removes the orb. */
    icon?: React.ReactNode;
    /** The side variant's orb tint, the site's orb-0, orb-1 and orb-2. Default: by position. */
    orb?: 0 | 1 | 2;
    /** Can't be selected; the arrow keys skip it. */
    disabled?: boolean;
    /** The label, when label isn't set. */
    children?: React.ReactNode;
}
/** One tab inside Tabs: a button with role="tab" that selects its panel. */
export declare const Tab: React.ForwardRefExoticComponent<TabProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    /** The value of the Tab that shows this panel. */
    value: TabValue;
    /** Keep the content mounted while hidden, as the site does. false renders it only while selected. Default true. */
    keepMounted?: boolean;
    /** The panel's content. */
    children?: React.ReactNode;
}
/** The content for one tab: hidden until its tab is selected, then faded in with the site's 280ms crossfade. */
export declare const TabPanel: React.ForwardRefExoticComponent<TabPanelProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// layout/Box
/** Spacing token names: tokens.json `space-*`, e.g. "lg" is var(--space-lg), 24px. */
export type SpaceToken = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'section-sm' | 'section';
/** A spacing token name, or 0 for none. */
export type SpaceValue = SpaceToken | 0;
export interface BoxProps extends React.HTMLAttributes<HTMLElement> {
    /** The element to render, e.g. "section", "ul", "article", "figure". Default "div". */
    component?: React.ElementType;
    /** Padding on every side: a spacing token name ("xs" … "section"), or 0. */
    p?: SpaceValue;
    /** Padding top; wins over py and p. */
    pt?: SpaceValue;
    /** Padding right; wins over px and p. */
    pr?: SpaceValue;
    /** Padding bottom; wins over py and p. */
    pb?: SpaceValue;
    /** Padding left; wins over px and p. */
    pl?: SpaceValue;
    /** Padding left and right; wins over p. */
    px?: SpaceValue;
    /** Padding top and bottom; wins over p. */
    py?: SpaceValue;
    /** Margin on every side: a spacing token name, 0, or "auto". */
    m?: SpaceValue | 'auto';
    /** Margin top; wins over my and m. */
    mt?: SpaceValue | 'auto';
    /** Margin right; wins over mx and m. */
    mr?: SpaceValue | 'auto';
    /** Margin bottom; wins over my and m. */
    mb?: SpaceValue | 'auto';
    /** Margin left; wins over mx and m. */
    ml?: SpaceValue | 'auto';
    /** Margin left and right; "auto" centres a box that has a width. Wins over m. */
    mx?: SpaceValue | 'auto';
    /** Margin top and bottom; wins over m. */
    my?: SpaceValue | 'auto';
    /** Gap between children (flex or grid display): a spacing token name, or 0. */
    gap?: SpaceValue;
    /** Gap between rows; wins over gap. */
    rowGap?: SpaceValue;
    /** Gap between columns; wins over gap. */
    columnGap?: SpaceValue;
    /** CSS display. */
    display?: 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'contents' | 'none';
    children?: React.ReactNode;
}
/** A plain element with spacing on the token scale: padding, margin and gap by token name, plus display. */
export declare const Box: React.ForwardRefExoticComponent<BoxProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// layout/Container
export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * The cap on the content width. wrap: the site's page width (size-wrap, 1180px), the default.
     * header: the header's width (size-header, 1380px). prose: a reading measure (62ch).
     * false: no cap, only the side gutters.
     */
    maxWidth?: 'wrap' | 'header' | 'prose' | false;
    /** Drop the side gutters (5% each side, 6% under 700px) and run edge to edge up to maxWidth. */
    disableGutters?: boolean;
    /** The element to render, e.g. "main" or "section". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The site's page column (.wrap): centred, min(1180px, 90%) wide, 88% under 700px. */
export declare const Container: React.ForwardRefExoticComponent<ContainerProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// layout/Grid
/**
 * The site's breakpoints, as min-width queries (the inverse of global.css's
 * max-width ones): xs 0, sm 361px, md 701px, lg 900px, xl 1001px.
 */
export type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** One value, or one per breakpoint. Mobile first: a breakpoint without a value takes the one below it. */
export type ResponsiveValue<T> = T | Partial<Record<LayoutBreakpoint, T>>;
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
    /** Lay the children out on the column grid. A Grid can be a container and an item at once. */
    container?: boolean;
    /** Container: the number of columns. Responsive values take 1–12; a single number can be any whole number. Default 12. */
    columns?: ResponsiveValue<number>;
    /** Container: gap between rows and columns, a spacing token name ("xs" … "section") or 0. */
    spacing?: SpaceValue;
    /** Container: gap between rows; wins over spacing. */
    rowSpacing?: SpaceValue;
    /** Container: gap between columns; wins over spacing. */
    columnSpacing?: SpaceValue;
    /** Item: how many columns it spans, 1–12, per breakpoint. With no size the item fills its row. */
    size?: ResponsiveValue<number>;
    /** Item: empty columns before it, 0–11, per breakpoint; it pushes from where the item would sit, as in MUI. */
    offset?: ResponsiveValue<number>;
    /** The element to render, e.g. "ul" or "section". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * A 12-column CSS grid on the site's breakpoints: a container sets the columns
 * and the gap token, its items span columns per breakpoint and can be offset.
 */
export declare const Grid: React.ForwardRefExoticComponent<GridProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// layout/Stack
export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
    /** Main axis, or one per breakpoint (xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default "column". */
    direction?: ResponsiveValue<StackDirection>;
    /** Gap between children: a spacing token name ("xs" … "section") or 0. Default 0. */
    spacing?: SpaceValue;
    /** Alias of spacing, the CSS name. spacing wins when both are set. */
    gap?: SpaceValue;
    /**
     * Put this element between each pair of children. true draws the built-in hairline
     * (color-line), which turns to match the direction at every breakpoint.
     */
    divider?: React.ReactNode;
    /** Cross-axis alignment. */
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline' | 'start' | 'end';
    /** Main-axis distribution. */
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' | 'start' | 'end';
    /** Let children wrap onto new lines. */
    wrap?: boolean;
    /** The element to render, e.g. "ul" or "nav". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** One-dimensional layout: children in a column or a row, a token gap between them, an optional divider. */
export declare const Stack: React.ForwardRefExoticComponent<StackProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// layout/ImageList
export type ImageListVariant = 'standard' | 'quilted' | 'woven' | 'masonry';
export interface ImageListProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * standard: equal cells on a grid. quilted: items span cols and rows. woven: every
     * second item is 70% tall, centred. masonry: CSS columns, each image at its own height.
     */
    variant?: ImageListVariant;
    /** Number of columns. Default 2. */
    cols?: number;
    /** Space between items: a spacing token name ("3xs" … "xl") or 0. Default "xs" (8px). */
    gap?: SpaceValue;
    /** Row height in px, or "auto" to follow the images (standard, quilted, woven). Default "auto". */
    rowHeight?: number | 'auto';
    /**
     * contain: the whole image shows, 12px inside its plate, the default for the brand's diagrams.
     * cover: the image fills the tile edge to edge and may be cropped.
     */
    fit?: 'contain' | 'cover';
    /** The element to render. Default "ul". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A grid of figures. The brand's imagery is diagrams, each in an inset plate. */
export declare const ImageList: React.ForwardRefExoticComponent<ImageListProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ImageListItemProps extends React.HTMLAttributes<HTMLElement> {
    /** Columns the item spans (standard, quilted, woven). Default 1. */
    cols?: number;
    /** Rows the item spans (standard, quilted, woven). Default 1. */
    rows?: number;
    /** The element to render. Default "li". */
    component?: React.ElementType;
    /** An <img> (it gets the fill styles), or any element such as an inline SVG; then an ImageListItemBar. */
    children?: React.ReactNode;
}
/** One tile: an inset plate (glass-inset, glass-edge, radius-control) the image fills. */
export declare const ImageListItem: React.ForwardRefExoticComponent<ImageListItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ImageListItemBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    /** The caption's first line: 13px, weight 500. */
    title?: React.ReactNode;
    /** A second line in color-muted. */
    subtitle?: React.ReactNode;
    /** bottom or top: a glass strip over the image. below: plain text under it. Default "bottom". */
    position?: 'bottom' | 'top' | 'below';
    /** An action at the end of the strip, e.g. a link with an arrow-ne icon. */
    actionIcon?: React.ReactNode;
    /** Which side the action sits on. Default "right". */
    actionPosition?: 'left' | 'right';
}
/** The tile's caption: a glass strip (glass-raised, blur-control) with a title and a muted subtitle. */
export declare const ImageListItemBar: React.ForwardRefExoticComponent<ImageListItemBarProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// lab/Masonry
export interface MasonryProps extends React.HTMLAttributes<HTMLElement> {
    /** Number of columns, or one per breakpoint (1–12; xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default { xs: 1, sm: 2, md: 3 }. */
    columns?: ResponsiveValue<number>;
    /** Space between items, both ways: a spacing token name ("3xs" … "xl") or 0. Default "md". */
    spacing?: SpaceValue;
    /** The element to render. Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * Items of uneven height in balanced columns: each item goes to the shortest
 * column, measured with ResizeObserver, while the DOM keeps reading order
 * (columns are built with flex `order`). Before it measures, CSS columns lay it out.
 */
export declare const Masonry: React.ForwardRefExoticComponent<MasonryProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;

// lab/Timeline
export type TimelinePosition = 'left' | 'right' | 'alternate' | 'alternate-reverse';
export interface TimelineProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * Which side the content sits on. right: content right of the line, dates left (default).
     * left: the mirror. alternate / alternate-reverse: sides alternate, and fall back to
     * right under 700px.
     */
    position?: TimelinePosition;
    /**
     * Width of the opposite (date) column, px or a CSS length, for left and right positions
     * (and alternate once it folds under 700px). Default: half the row, as in MUI.
     */
    oppositeWidth?: number | string;
    /** The element to render. Default "ul". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A vertical sequence of events: dots on a hairline, content on one side, dates on the other. */
export declare const Timeline: React.ForwardRefExoticComponent<TimelineProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface TimelineItemProps extends React.HTMLAttributes<HTMLElement> {
    /** The element to render. Default "li". */
    component?: React.ElementType;
    /** TimelineOppositeContent (optional), TimelineSeparator, TimelineContent. */
    children?: React.ReactNode;
}
/** One event: the opposite content, the separator (dot and connector) and the content, in a row. */
export declare const TimelineItem: React.ForwardRefExoticComponent<TimelineItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    /** A TimelineDot, then a TimelineConnector (leave the connector off the last item). */
    children?: React.ReactNode;
}
/** The column that holds the dot and the connector. */
export declare const TimelineSeparator: React.ForwardRefExoticComponent<TimelineSeparatorProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TimelineDotProps extends React.HTMLAttributes<HTMLSpanElement> {
    /**
     * filled: a solid dot (color-ink, or the tone). outlined: a 2px ring (dg-edge, or the tone).
     * orb: the site's glass orb (.tab-orb gradient); accent picks the bluer .orb-1.
     */
    variant?: 'filled' | 'outlined' | 'orb';
    /** State colour. Pair it with a word in the content; colour is never the only signal. */
    tone?: 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
    /** An icon inside the dot (16px); the dot grows to fit it. */
    children?: React.ReactNode;
}
/** The marker on the line. */
export declare const TimelineDot: React.ForwardRefExoticComponent<TimelineDotProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TimelineConnectorProps extends React.HTMLAttributes<HTMLSpanElement> {
}
/** The hairline between two dots (color-line, 2px). */
export declare const TimelineConnector: React.ForwardRefExoticComponent<TimelineConnectorProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}
/** The event itself: 15px copy; give its title more weight with your own markup. */
export declare const TimelineContent: React.ForwardRefExoticComponent<TimelineContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TimelineOppositeContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}
/** The other side of the line: the date, at 12px in color-muted (.career-date). */
export declare const TimelineOppositeContent: React.ForwardRefExoticComponent<TimelineOppositeContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// utils/ClickAwayListener
export interface ClickAwayListenerProps {
    /** One element that can hold a ref. */
    children: React.ReactElement;
    onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
    /** Event that counts as a click. Default "onPointerDown". false to ignore mouse. */
    mouseEvent?: 'onClick' | 'onPointerDown' | 'onPointerUp' | 'onMouseDown' | 'onMouseUp' | false;
    /** Default "onTouchEnd". false to ignore touch. */
    touchEvent?: 'onTouchStart' | 'onTouchEnd' | false;
}
/** Calls onClickAway when a press lands outside its child. Ignores the press that mounted it. */
export declare function ClickAwayListener({ children, onClickAway, mouseEvent, touchEvent }: ClickAwayListenerProps): React.ReactElement;

// utils/CssBaseline
export interface CssBaselineProps {
    children?: React.ReactNode;
}
/** Adds the element resets once per document while mounted; renders its children unchanged. */
export declare function CssBaseline({ children }: CssBaselineProps): React.ReactElement;

// utils/Modal
export type ModalCloseReason = 'backdropClick' | 'escapeKeyDown';
export interface ModalProps {
    open: boolean;
    /** Called with the reason; the parent decides whether to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** One element: usually a transition (Fade, Grow, Slide) wrapping the surface. */
    children: React.ReactElement;
    /** Keep the content mounted while closed. */
    keepMounted?: boolean;
    /** No backdrop at all (the page behind stays visible and clickable outside the content). */
    hideBackdrop?: boolean;
    /** A transparent backdrop that still catches outside clicks (popovers, menus). */
    invisibleBackdrop?: boolean;
    disableEscapeKeyDown?: boolean;
    /** Don't move focus into the content on open. */
    disableAutoFocus?: boolean;
    /** Let focus leave the content while open. */
    disableEnforceFocus?: boolean;
    /** Don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    disableScrollLock?: boolean;
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    BackdropProps?: Partial<BackdropProps>;
    className?: string;
    style?: React.CSSProperties;
    /** z-index; default the z-modal token. */
    zIndex?: string | number;
}
/**
 * The base of Dialog, Drawer, Popover and Menu: a portal layer with a backdrop,
 * focus moved in and kept in, Escape to close, page scroll locked and the rest
 * of the page made inert. Waits for the child's exit transition before unmounting.
 */
export declare const Modal: React.ForwardRefExoticComponent<ModalProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// utils/NoSsr
export interface NoSsrProps {
    children?: React.ReactNode;
    /** Wait one more frame after mount before rendering (heavy children). */
    defer?: boolean;
    /** Rendered until the children mount. */
    fallback?: React.ReactNode;
}
/** Renders its children only in the browser, after mount: for anything that reads window or the DOM. */
export declare function NoSsr({ children, defer, fallback }: NoSsrProps): React.ReactElement;

// utils/Popover
export interface PopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    open: boolean;
    /** The element the surface grows from. */
    anchorEl: AnchorEl;
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** Preferred side and alignment. Default "bottom-start". */
    placement?: Placement;
    /** Gap to the anchor in px. Default 8. */
    offset?: number;
    /** At least as wide as the anchor (selects). */
    matchWidth?: boolean;
    /** Surface padding: "none" for lists that pad themselves. Default "md". */
    padding?: 'none' | 'sm' | 'md';
    keepMounted?: boolean;
    disableAutoFocus?: boolean;
    disableRestoreFocus?: boolean;
    disableEnforceFocus?: boolean;
    disableScrollLock?: boolean;
    /** Render in place (inside a showcase stage) instead of in document.body. */
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    /** Transition timing in ms. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    children?: React.ReactNode;
}
/**
 * A glass surface anchored to an element, on a transparent modal layer: click
 * outside or Escape closes it, focus moves in and returns to the anchor. The
 * base of Menu and Select.
 */
export declare const Popover: React.ForwardRefExoticComponent<PopoverProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// utils/Popper
export type VirtualElement = {
    getBoundingClientRect(): DOMRect;
    contextElement?: Element;
};
export type AnchorEl = HTMLElement | VirtualElement | null | (() => HTMLElement | VirtualElement | null);
export interface PopperChildProps {
    placement: Placement;
    /** Spread into a transition (Grow, Fade) so the Popper unmounts after it exits. */
    TransitionProps: {
        in: boolean;
        onExited: () => void;
        appear: boolean;
    };
}
export interface PopperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    open: boolean;
    /** What to anchor to: an element, a virtual rect, or a function returning one. */
    anchorEl: AnchorEl;
    /** Preferred side and alignment. Default "bottom". Flips when it doesn't fit. */
    placement?: Placement;
    /** Gap to the anchor in px. Default 8. */
    offset?: number;
    /** At least as wide as the anchor. */
    matchWidth?: boolean;
    /** Children use a transition: the Popper stays mounted until TransitionProps.onExited. */
    transition?: boolean;
    keepMounted?: boolean;
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    /** z-index; default the z-modal token. */
    zIndex?: string | number;
    children?: React.ReactNode | ((props: PopperChildProps) => React.ReactNode);
}
/**
 * Floats content next to an anchor with fixed positioning: flips to the other
 * side when there is no room, shifts to stay on screen, follows scroll and
 * resize, and exposes --gl-transform-origin so transitions grow from the anchor.
 */
export declare const Popper: React.ForwardRefExoticComponent<PopperProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// utils/Portal
export interface PortalProps {
    children?: React.ReactNode;
    /** Mount point. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** Render in place instead. */
    disablePortal?: boolean;
}
/** Render children into another part of the DOM (default document.body). Renders nothing without a DOM. */
export declare function Portal({ children, container, disablePortal }: PortalProps): React.ReactElement | null;

// utils/TextareaAutosize
export interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Height floor in rows. Default 1. */
    minRows?: number;
    /** Height ceiling in rows; scrolls past it. */
    maxRows?: number;
}
/** A plain textarea that grows with its content between minRows and maxRows. Unstyled: TextField styles it. */
export declare const TextareaAutosize: React.ForwardRefExoticComponent<TextareaAutosizeProps & {
    ref?: React.Ref<HTMLTextAreaElement> | undefined;
}>;

// utils/Transitions
export type TransitionStatus = 'unmounted' | 'exited' | 'entering' | 'entered' | 'exiting';
export type Timeout = number | {
    enter?: number;
    exit?: number;
};
export interface TransitionProps {
    /** Show (true) or hide (false) the child. */
    in?: boolean;
    /** Run the enter transition on first mount when `in` starts true. Default true. */
    appear?: boolean;
    /** Mount the child only on first enter. */
    mountOnEnter?: boolean;
    /** Unmount the child after it exits. */
    unmountOnExit?: boolean;
    /** Duration in ms, or {enter, exit}. */
    timeout?: Timeout;
    onEnter?: (node: HTMLElement) => void;
    onEntered?: (node: HTMLElement) => void;
    onExit?: (node: HTMLElement) => void;
    onExited?: (node: HTMLElement) => void;
    /** One element that can hold a ref, or a render function of the status. */
    children: React.ReactElement | ((status: TransitionStatus, ref: React.Ref<HTMLElement>) => React.ReactNode);
}
/** Status machine behind every transition: exited -> entering -> entered -> exiting -> exited. */
export declare function useTransition(props: Omit<TransitionProps, 'children'>, nodeRef: React.MutableRefObject<HTMLElement | null>, defaults: {
    enter: number;
    exit: number;
}): TransitionStatus;
/** Base transition: no styles of its own; use the render function for custom states. */
export declare const Transition: React.ForwardRefExoticComponent<TransitionProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface FadeProps extends TransitionProps {
    easing?: string;
}
/** Opacity only. The reduced-motion fallback for every other transition. */
export declare const Fade: React.ForwardRefExoticComponent<TransitionProps & {
    easing?: string;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface GrowProps extends TransitionProps {
    origin?: string;
}
/** Scale from 0.96 plus opacity, from the trigger's side (origin-aware). For menus, popovers, tooltips. */
export declare const Grow: React.ForwardRefExoticComponent<TransitionProps & {
    origin?: string;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ZoomProps extends TransitionProps {
}
/** Scale from 0.85 plus opacity, centred. For floating action buttons. */
export declare const Zoom: React.ForwardRefExoticComponent<TransitionProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export type SlideDirection = 'up' | 'down' | 'left' | 'right';
export interface SlideProps extends TransitionProps {
    direction?: SlideDirection;
}
/** Enter and leave along the same path. For drawers and snackbars. */
export declare const Slide: React.ForwardRefExoticComponent<TransitionProps & {
    direction?: SlideDirection;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface CollapseProps extends Omit<TransitionProps, 'children'> {
    /** Height kept visible when collapsed, e.g. "48px". Default 0. */
    collapsedSize?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}
/**
 * Height reveal with the site's grid-rows technique (.pane .more): rows go from
 * 0fr to 1fr, so no measuring. Instant under reduced motion.
 */
export declare const Collapse: React.ForwardRefExoticComponent<CollapseProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// utils/useMediaQuery
/**
 * The site's own breakpoints (global.css): phones at 700px and below, the
 * one-column layout at 899px and below, desktop from 900px, compact desktop at
 * 1000px and below, tiny phones at 360px and below; plus the input and
 * preference queries the site gates behaviour on.
 */
export declare const media: {
    readonly tiny: "(max-width: 360px)";
    readonly phone: "(max-width: 700px)";
    readonly tablet: "(max-width: 899px)";
    readonly desktop: "(min-width: 900px)";
    readonly compact: "(max-width: 1000px)";
    readonly hover: "(hover: hover) and (pointer: fine)";
    readonly reducedMotion: "(prefers-reduced-motion: reduce)";
    readonly reducedTransparency: "(prefers-reduced-transparency: reduce)";
};
export interface UseMediaQueryOptions {
    /** Value before the first browser read (server render). Default false. */
    defaultMatches?: boolean;
}
/** Live boolean for a CSS media query, e.g. useMediaQuery(media.phone). */
export declare function useMediaQuery(query: string, options?: UseMediaQueryOptions): boolean;

// charts/Diagram
/** Edge and label tone: muted ink, or the accent blue that carries the travelling pulse. */
export type DiagramTone = 'muted' | 'accent';
/** Node tone: default glass box, accent outline, or accent fill with white text. */
export type DiagramNodeTone = 'default' | 'accent' | 'accent-fill';
export type DiagramShape = 'rect' | 'circle';
/** Region looks: a tinted glass panel, or the two rings of the architecture diagram. */
export type DiagramRegionTone = 'panel' | 'ring' | 'ring-inner';
/** A plain string is a regular line; an object can be bold. */
export type DiagramNodeLine = string | {
    text: string;
    bold?: boolean;
};
/** Background panel or ring. */
export interface DiagramRegion {
    shape?: DiagramShape;
    x: number;
    y: number;
    w: number;
    h: number;
    radius?: number;
    tone: DiagramRegionTone;
}
/** A labelled box (or disc). Lines are explicit: SVG text does not wrap. */
export interface DiagramNode {
    shape?: DiagramShape;
    x: number;
    y: number;
    w: number;
    h: number;
    lines: DiagramNodeLine[];
    tone?: DiagramNodeTone;
}
/** A polyline. Arrowhead on the last point unless `arrow` is false. Accent edges carry the pulse. */
export interface DiagramEdge {
    points: Array<[number, number]>;
    arrow?: boolean;
    dashed?: boolean;
    tone?: DiagramTone;
}
/** Free text, placed by its top-left. With `align: 'middle'` the text centres inside `w`. */
export interface DiagramLabel {
    x: number;
    y: number;
    w?: number;
    lines: string[];
    align?: 'start' | 'middle';
    tone?: DiagramTone;
}
export interface DiagramData {
    /** Names the dataset; namespaces the SVG ids together with React's id. */
    id: string;
    /** The coordinate space (viewBox) every position is written in. */
    width: number;
    height: number;
    /** Accessible name for the whole diagram. */
    label: string;
    /** One or two sentences spelling out the relationships the arrows encode. */
    description: string;
    regions?: DiagramRegion[];
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    labels?: DiagramLabel[];
}
export interface DiagramHostProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Id for the root element; also the base of the description's id. */
    id?: string;
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** Accessible name for the whole figure (role group: the text inside stays readable). */
    label: string;
    /** One or two sentences spelling out the relationships the marks encode; becomes the SVG's desc. */
    description: string;
    /** Width of the coordinate space (the viewBox). */
    width: number;
    /** Height of the coordinate space (the viewBox). */
    height: number;
    /** Floor for the scale: below `width × minScale` px the host scrolls sideways instead. 0 = pure scaling. */
    minScale?: number;
    /** Play the entrance when the figure scrolls into view. Default true. */
    reveal?: boolean;
    /** Text under a host that overflows. */
    scrollHint?: React.ReactNode;
    /** SVG content, in the viewBox's coordinates. */
    children?: React.ReactNode;
}
/**
 * The shell every diagram and chart from the site shares: one SVG that scales with its
 * host, a scroll floor for phones with its hint, and the entrance reveal.
 */
export declare const DiagramHost: React.ForwardRefExoticComponent<DiagramHostProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface DiagramProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** Regions, edges, nodes and labels in the data's own coordinate space, plus its label and description. */
    data: DiagramData;
    /** Floor for the scale: below `width × minScale` px the host scrolls sideways (the site uses 0.58–0.6). 0 = pure scaling. */
    minScale?: number;
    /** Play the entrance when the diagram scrolls into view. Default true. */
    reveal?: boolean;
    /** Run a pulse along every accent edge while the diagram is on screen. Default true; never under reduced motion. */
    pulses?: boolean;
}
/** The site's data-driven diagram: regions, edges with arrowheads, glass nodes, labels and travelling pulses. */
export declare const Diagram: React.ForwardRefExoticComponent<DiagramProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// charts/TimingChart
/** Before/after bars. Values in one unit (the site's are milliseconds); the axis is linear so the gap reads true. */
export interface TimingData {
    /** Names the dataset (kept on the root as data-chart). */
    id: string;
    /** Accessible name. */
    label: string;
    /** One or two sentences with the numbers, read by screen readers as the SVG's desc. */
    description: string;
    /** Right end of the axis, in the data's unit. */
    axisMax: number;
    /** Axis ticks: a value and its text ("2 s"). */
    ticks: Array<{
        value: number;
        text: string;
    }>;
    /** One bar per row: its name, value, the text at its tip, and muted or accent. */
    rows: Array<{
        name: string;
        value: number;
        text: string;
        tone?: 'muted' | 'accent';
    }>;
}
export interface TimingChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** Rows, axis and accessible text. Two rows is the site's layout; more rows stack the same way. */
    data: TimingData;
    /** Floor for the scale: below `820 × minScale` px the host scrolls sideways (the site uses 0.6). */
    minScale?: number;
    /** Grow the bars in when the chart scrolls into view. Default true. */
    reveal?: boolean;
}
/** The site's before/after timing bars on a linear axis, styled and revealed like the diagrams. */
export declare const TimingChart: React.ForwardRefExoticComponent<TimingChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// charts/BarChart
export interface BarChartSeries {
    /** Names the series in the legend, the tooltip and the table. */
    label: string;
    /** One value per category, in category order; null leaves the slot empty. */
    data: Array<number | null>;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
    color?: string;
}
export interface BarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The category names, one per bar group (years, employers, endpoints). */
    categories: string[];
    /** One to four series. Two or more get a legend and grouped bars with 2px gaps. */
    series: BarChartSeries[];
    /** vertical: columns rising from the baseline. horizontal: bars running right; better for long names. */
    layout?: 'vertical' | 'horizontal';
    /** Total height in px. Default 260 for columns; horizontal bars size to their rows. */
    height?: number;
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated range summary. */
    description?: string;
    /** Values printed at the bar ends: none, every bar (value), or each series' largest (max). */
    barLabel?: 'none' | 'value' | 'max';
    /** Formats values in labels, tooltips and the table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Formats axis ticks. Default: compact from 1,000 up (1K, 2K). */
    tickFormatter?: (value: number) => string;
    /** Header for the category column of the table. Default "Category". */
    categoryLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
}
/** Bars and columns for comparing magnitude: baseline-anchored, 4px rounded data ends, a recessive axis, a hover tooltip and a table twin. */
export declare const BarChart: React.ForwardRefExoticComponent<BarChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// charts/LineChart
export type LineChartX = string | number | Date;
export interface LineChartSeries {
    /** Names the series in the legend, the end label, the tooltip and the table. */
    label: string;
    /** One value per x position; null breaks the line. */
    data: Array<number | null>;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
    color?: string;
    /** Wash the area under this line at 10% of its hue. */
    area?: boolean;
}
export interface LineChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The x positions: strings (evenly spaced categories), numbers (a linear axis) or Dates (a time axis). */
    x: LineChartX[];
    /** One to four series on one y axis. Two or more get a legend and direct end labels. */
    series: LineChartSeries[];
    /** Wash every series' area at 10% of its hue. Clearest with one series. */
    area?: boolean;
    /** Total height in px, axis band included. */
    height?: number;
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated summary. */
    description?: string;
    /** The last value at each line's end, after the series name when there are two or more. Default true. */
    endLabels?: boolean;
    /** Formats values in the tooltip, end labels and table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Formats y-axis ticks. Default: compact from 1,000 up. */
    tickFormatter?: (value: number) => string;
    /** Formats an x value for ticks, tooltip and table. Default: dates by their spacing ("2024", "March 2024"). */
    xFormatter?: (x: LineChartX, where: 'tick' | 'tooltip') => string;
    /** Fixed y domain. Default: from 0 (or the data's minimum when negative) to a round maximum. */
    yDomain?: [number, number];
    /** Header for the x column of the table. Default "X". */
    xLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
}
/** Lines for trends: 2px strokes, an optional 10% wash, a crosshair that snaps to the nearest x, one tooltip for every series, direct end labels. */
export declare const LineChart: React.ForwardRefExoticComponent<LineChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// charts/DonutChart
export interface DonutChartDatum {
    /** Names the part in the legend, the centre readout and the table. */
    label: string;
    /** A positive amount; zero and negative parts are left out. */
    value: number;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position, then dg-edge. */
    color?: string;
}
export interface DonutChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The parts, in the order they run clockwise from 12 o'clock. Past five, the fifth on fold into Other. */
    data: DonutChartDatum[];
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway. Default: every part with its share. */
    description?: string;
    /** Diameter in px. */
    size?: number;
    /** Ring width in px. Default 13% of the diameter. */
    thickness?: number;
    /** Words under the centre figure ("months"). */
    centerLabel?: React.ReactNode;
    /** The centre figure. Default: the formatted total. */
    total?: React.ReactNode;
    /** Formats values in the centre, the legend and the table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Name for the folded tail. */
    otherLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
    /** The highlighted part (controlled): its segment stays full, the others dim, the centre reads it. */
    highlighted?: number | null;
    /** The part highlighted at first (uncontrolled). */
    defaultHighlighted?: number | null;
    /** Called when hover, a tap or the arrow keys move the highlight; null when it clears. */
    onHighlightChange?: (index: number | null) => void;
}
/** Part-to-whole at a glance: up to five segments with 2px gaps, the total in the centre, a legend with values, hover to read one part. */
export declare const DonutChart: React.ForwardRefExoticComponent<DonutChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

// charts/Sparkline
export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The values, oldest first. */
    data: number[];
    /** line (default) or bar. */
    plotType?: 'line' | 'bar';
    /** Width in px. */
    width?: number;
    /** Height in px, 24–32. */
    height?: number;
    /** What the values are, e.g. "Months using React per year, 2020–2026". Starts the accessible summary. */
    label: string;
    /** Replaces the generated summary (first, last, low and high). */
    summary?: string;
    /** Wash under the line at 10% of the accent. */
    area?: boolean;
    /** The accent for the last point. Default chart-1; the rest is the recessive dg-edge. */
    color?: string;
    /** Formats values in the summary and the hover readout. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Show the value under the pointer in a small ink pill. Default false: the summary and the number beside it carry the values. */
    showTooltip?: boolean;
}
/** A word-sized trend, 24–32px tall, in the de-emphasis grey with the last point in the accent; fits a table cell or sits beside a number. */
export declare const Sparkline: React.ForwardRefExoticComponent<SparklineProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;

// charts/Mermaid
/** A Mermaid config object (pass it to mermaid.initialize). */
export interface MermaidThemeConfig {
    theme: 'base';
    fontFamily: string;
    /** Mermaid's sequence diagrams measure every text at this size. */
    fontSize: number;
    /** Off, so labels break only where the source says `<br>`, as Diagram's do. */
    markdownAutoWrap: boolean;
    themeVariables: Record<string, string>;
    /** CSS Mermaid scopes under each diagram's id. The first rules size labels as Diagram sets them, so the layout fits its type. */
    themeCSS: string;
    flowchart: Record<string, unknown>;
    sequence: Record<string, unknown>;
}
/**
 * Blue Glass for Mermaid. The spacing and the label CSS make Mermaid lay boxes out at Diagram's
 * sizes: 15px node text on 20px lines with 16 units above and below (72-unit boxes for two lines),
 * 20 a side, 13px labels. MermaidDiagram then redraws flowcharts, state and sequence diagrams with
 * Diagram's marks. The theme variables (token values, as Mermaid does colour maths on literals)
 * dress every other diagram type, which Mermaid still draws itself.
 */
export declare const mermaidTheme: MermaidThemeConfig;
export interface MermaidDiagramProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The Mermaid source. Add `accTitle:` and `accDescr:` lines so the drawing is named and described. */
    chart: string;
    /** Accessible name for the drawing. Use it when the source has no accTitle. */
    title?: string;
    /** Mermaid config over mermaidTheme for this diagram: objects merge one level deep, themeCSS appends. */
    config?: Record<string, unknown>;
    /** Where Mermaid is loaded from, once per page. Default: jsDelivr, mermaid@11.16.1. */
    src?: string;
    /** Floor for the scale, as Diagram's: below this share of its drawn width the diagram scrolls sideways instead. */
    minScale?: number;
    /** Redraw flowcharts, state and sequence diagrams with Diagram's marks. Default true; false keeps Mermaid's own drawing, themed. */
    restyle?: boolean;
    /** Play Diagram's entrance when the drawing scrolls into view. Default true. */
    reveal?: boolean;
    /** Run a pulse along every accent edge (`==>`) while on screen. Default true; never under reduced motion. */
    pulses?: boolean;
}
/**
 * A Mermaid diagram drawn like Diagram. Mermaid loads once, on demand, and lays the diagram out;
 * flowcharts, state and sequence diagrams are then redrawn with Diagram's own marks (glass boxes,
 * right-angled edges, arrowheads, labels beside the lines, regions, the entrance and the pulses).
 * Other diagram types keep Mermaid's drawing in the theme. The source shows as a code block until
 * it draws, or if it can't.
 */
export declare const MermaidDiagram: React.ForwardRefExoticComponent<MermaidDiagramProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;

declare global {
  interface Window {
    BlueGlass: {
      Autocomplete: typeof Autocomplete;
      Button: typeof Button;
      ButtonGroup: typeof ButtonGroup;
      Checkbox: typeof Checkbox;
      Fab: typeof Fab;
      RadioGroup: typeof RadioGroup;
      Radio: typeof Radio;
      Rating: typeof Rating;
      Select: typeof Select;
      Option: typeof Option;
      Slider: typeof Slider;
      Switch: typeof Switch;
      TextField: typeof TextField;
      InputAdornment: typeof InputAdornment;
      TransferList: typeof TransferList;
      ToggleButton: typeof ToggleButton;
      ToggleButtonGroup: typeof ToggleButtonGroup;
      Avatar: typeof Avatar;
      AvatarGroup: typeof AvatarGroup;
      Badge: typeof Badge;
      Chip: typeof Chip;
      Divider: typeof Divider;
      Icon: typeof Icon;
      SvgIcon: typeof SvgIcon;
      iconNames: typeof iconNames;
      List: typeof List;
      ListItem: typeof ListItem;
      ListItemButton: typeof ListItemButton;
      ListItemIcon: typeof ListItemIcon;
      ListItemText: typeof ListItemText;
      ListSubheader: typeof ListSubheader;
      Table: typeof Table;
      TableContainer: typeof TableContainer;
      TableHead: typeof TableHead;
      TableBody: typeof TableBody;
      TableRow: typeof TableRow;
      TableCell: typeof TableCell;
      TableSortLabel: typeof TableSortLabel;
      Tooltip: typeof Tooltip;
      Typography: typeof Typography;
      Alert: typeof Alert;
      AlertTitle: typeof AlertTitle;
      Backdrop: typeof Backdrop;
      Dialog: typeof Dialog;
      DialogTitle: typeof DialogTitle;
      DialogContent: typeof DialogContent;
      DialogContentText: typeof DialogContentText;
      DialogActions: typeof DialogActions;
      LinearProgress: typeof LinearProgress;
      CircularProgress: typeof CircularProgress;
      Skeleton: typeof Skeleton;
      Snackbar: typeof Snackbar;
      Accordion: typeof Accordion;
      AccordionSummary: typeof AccordionSummary;
      AccordionDetails: typeof AccordionDetails;
      PaneAccordion: typeof PaneAccordion;
      AppBar: typeof AppBar;
      Toolbar: typeof Toolbar;
      Card: typeof Card;
      CardHeader: typeof CardHeader;
      CardContent: typeof CardContent;
      CardActions: typeof CardActions;
      CardMedia: typeof CardMedia;
      CardActionArea: typeof CardActionArea;
      Paper: typeof Paper;
      LightField: typeof LightField;
      BottomNavigation: typeof BottomNavigation;
      BottomNavigationAction: typeof BottomNavigationAction;
      Breadcrumbs: typeof Breadcrumbs;
      Drawer: typeof Drawer;
      Link: typeof Link;
      Menu: typeof Menu;
      MenuItem: typeof MenuItem;
      MenuList: typeof MenuList;
      Pagination: typeof Pagination;
      PaginationItem: typeof PaginationItem;
      SpeedDial: typeof SpeedDial;
      SpeedDialAction: typeof SpeedDialAction;
      SpeedDialIcon: typeof SpeedDialIcon;
      Stepper: typeof Stepper;
      Step: typeof Step;
      StepLabel: typeof StepLabel;
      StepContent: typeof StepContent;
      MobileStepper: typeof MobileStepper;
      Tabs: typeof Tabs;
      Tab: typeof Tab;
      TabPanel: typeof TabPanel;
      Box: typeof Box;
      Container: typeof Container;
      Grid: typeof Grid;
      Stack: typeof Stack;
      ImageList: typeof ImageList;
      ImageListItem: typeof ImageListItem;
      ImageListItemBar: typeof ImageListItemBar;
      Masonry: typeof Masonry;
      Timeline: typeof Timeline;
      TimelineItem: typeof TimelineItem;
      TimelineSeparator: typeof TimelineSeparator;
      TimelineDot: typeof TimelineDot;
      TimelineConnector: typeof TimelineConnector;
      TimelineContent: typeof TimelineContent;
      TimelineOppositeContent: typeof TimelineOppositeContent;
      ClickAwayListener: typeof ClickAwayListener;
      CssBaseline: typeof CssBaseline;
      Modal: typeof Modal;
      NoSsr: typeof NoSsr;
      Popover: typeof Popover;
      Popper: typeof Popper;
      computePosition: typeof computePosition;
      Portal: typeof Portal;
      TextareaAutosize: typeof TextareaAutosize;
      Transition: typeof Transition;
      Fade: typeof Fade;
      Grow: typeof Grow;
      Slide: typeof Slide;
      Collapse: typeof Collapse;
      Zoom: typeof Zoom;
      useMediaQuery: typeof useMediaQuery;
      media: typeof media;
      Diagram: typeof Diagram;
      DiagramHost: typeof DiagramHost;
      TimingChart: typeof TimingChart;
      BarChart: typeof BarChart;
      LineChart: typeof LineChart;
      DonutChart: typeof DonutChart;
      Sparkline: typeof Sparkline;
      MermaidDiagram: typeof MermaidDiagram;
      mermaidTheme: typeof mermaidTheme;
    };
  }
}
