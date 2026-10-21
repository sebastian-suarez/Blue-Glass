// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
