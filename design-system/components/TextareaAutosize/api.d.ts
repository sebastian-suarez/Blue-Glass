// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
