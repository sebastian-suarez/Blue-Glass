// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
