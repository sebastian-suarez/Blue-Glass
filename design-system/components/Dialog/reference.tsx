import * as React from 'react';
import { cx } from '../internal/cx';
import { useForkRef, useId, useIsoLayoutEffect } from '../internal/hooks';
import { Modal, ModalCloseReason } from '../utils/Modal';
import { Grow, Transition } from '../utils/Transitions';
import { Paper, PaperProps } from '../surfaces/Paper';
import type { BackdropProps } from './Backdrop';

export type DialogScroll = 'paper' | 'body';

interface DialogContextValue {
  scroll: DialogScroll;
  registerTitle: (id: string) => () => void;
  registerDescription: (id: string) => () => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function ms(timeout: DialogProps['transitionDuration'], which: 'enter' | 'exit', fallback: number): number {
  if (typeof timeout === 'number') return timeout;
  return timeout?.[which] ?? fallback;
}

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
  transitionDuration?: number | { enter?: number; exit?: number };
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
export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(function Dialog(props, ref) {
  const {
    open, onClose, maxWidth = 'sm', fullWidth = false, fullScreen = false, scroll = 'paper', transitionDuration,
    PaperProps, keepMounted, hideBackdrop, BackdropProps: backdropProps, disableEscapeKeyDown, disableAutoFocus,
    disableEnforceFocus, disableRestoreFocus, disableScrollLock, disablePortal, container, className, style,
    role = 'dialog', children, 'aria-labelledby': labelledByProp, 'aria-describedby': describedByProp, ...rest
  } = props;

  const [titleIds, setTitleIds] = React.useState<string[]>([]);
  const [descriptionIds, setDescriptionIds] = React.useState<string[]>([]);
  const ctx = React.useMemo<DialogContextValue>(() => {
    const register = (set: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) => {
      set((list) => (list.includes(id) ? list : [...list, id]));
      return () => set((list) => list.filter((x) => x !== id));
    };
    return { scroll, registerTitle: register(setTitleIds), registerDescription: register(setDescriptionIds) };
  }, [scroll]);

  // A press that starts and ends on the layer around the surface is a press on the scrim.
  const downOnLayer = React.useRef(false);
  const timeout = { enter: ms(transitionDuration, 'enter', 200), exit: ms(transitionDuration, 'exit', 140) };
  const screen = fullScreen === true ? 'fullscreen' : fullScreen === 'phone' ? 'fullscreen-phone' : null;
  const named = labelledByProp != null || rest['aria-label'] != null;

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={onClose}
      keepMounted={keepMounted}
      hideBackdrop={hideBackdrop}
      BackdropProps={backdropProps}
      disableEscapeKeyDown={disableEscapeKeyDown}
      disableAutoFocus={disableAutoFocus}
      disableEnforceFocus={disableEnforceFocus}
      disableRestoreFocus={disableRestoreFocus}
      disableScrollLock={disableScrollLock}
      disablePortal={disablePortal}
      container={container}
      className={cx('gl-dialog', className)}
      style={style}
    >
      {/* Transition keeps Modal mounted through the exit. Grow runs on the surface itself, not on
          the layer: opacity on an ancestor would cut the glass off from what it blurs. */}
      <Transition timeout={timeout}>
        {(status, surfaceRef) => (
          <div
            role="presentation"
            className={cx('gl-dialog-container', `gl-dialog-scroll-${scroll}`, screen && `gl-dialog-container-${screen}`)}
            data-transition={status}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
              downOnLayer.current = e.target === e.currentTarget;
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (downOnLayer.current && e.target === e.currentTarget) onClose?.(e, 'backdropClick');
              downOnLayer.current = false;
            }}
          >
            <Grow in={open} origin="center" timeout={timeout}>
              <Paper
                ref={surfaceRef}
                role={role}
                aria-modal="true"
                aria-labelledby={labelledByProp ?? (!named && titleIds.length ? titleIds[0] : undefined)}
                aria-describedby={describedByProp ?? (descriptionIds.length ? descriptionIds.join(' ') : undefined)}
                tabIndex={-1}
                {...PaperProps}
                {...(rest as React.HTMLAttributes<HTMLElement>)}
                radius={screen === 'fullscreen' ? 'none' : PaperProps?.radius ?? 'panel'}
                className={cx(
                  'gl-dialog-paper',
                  maxWidth && `gl-dialog-paper-${maxWidth}`,
                  fullWidth && 'gl-dialog-paper-full-width',
                  screen && `gl-dialog-paper-${screen}`,
                  PaperProps?.className,
                )}
              >
                <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>
              </Paper>
            </Grow>
          </div>
        )}
      </Transition>
    </Modal>
  );
});

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** The dialog's name: a question or a verb phrase ("Delete the RS50 bridge draft?"). */
  children?: React.ReactNode;
}

/** The dialog's name in text-title-sm, wired to the surface's aria-labelledby. */
export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(function DialogTitle(
  { id: idProp, className, children, ...rest },
  ref,
) {
  const id = useId(idProp);
  const ctx = React.useContext(DialogContext);
  useIsoLayoutEffect(() => ctx?.registerTitle(id), [ctx, id]);
  return (
    <h2 ref={ref} id={id} className={cx('gl-dialog-title', className)} {...rest}>
      {children}
    </h2>
  );
});

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Hairlines (color-line) above and below, for long content between the title and the actions. */
  dividers?: boolean;
  /** Body copy (DialogContentText), fields, lists. */
  children?: React.ReactNode;
}

type Edges = { top: boolean; bottom: boolean };

/** The dialog's body, which with scroll="paper" scrolls on its own and fades at whichever edge has more. */
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { dividers = false, className, children, onScroll, ...rest },
  ref,
) {
  const ctx = React.useContext(DialogContext);
  const scrolls = (ctx?.scroll ?? 'paper') === 'paper';
  const node = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(node, ref);
  const [edges, setEdges] = React.useState<Edges>({ top: false, bottom: false });

  const measure = React.useCallback(() => {
    const el = node.current;
    const top = !!el && scrolls && el.scrollTop > 1;
    const bottom = !!el && scrolls && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, [scrolls]);

  useIsoLayoutEffect(() => {
    measure();
  });
  // Re-measure when the box or anything in it changes size (a textarea growing, an image loading).
  React.useEffect(() => {
    const el = node.current;
    if (!el || !scrolls || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    Array.from(el.children).forEach((child) => ro.observe(child));
    return () => ro.disconnect();
  });

  const overflowing = edges.top || edges.bottom;
  return (
    <div
      ref={handleRef}
      className={cx('gl-dialog-content', dividers && 'gl-dialog-content-dividers', className)}
      data-fade-top={edges.top ? '' : undefined}
      data-fade-bottom={edges.bottom ? '' : undefined}
      // A scrolling region with nothing focusable inside still has to be reachable by keyboard.
      tabIndex={overflowing ? 0 : undefined}
      onScroll={(e: React.UIEvent<HTMLDivElement>) => {
        measure();
        onScroll?.(e);
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

export interface DialogContentTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** One or two sentences: what happens, and what stays as it is. */
  children?: React.ReactNode;
}

/** Body copy in color-muted (text-body-sm), wired to the surface's aria-describedby. */
export const DialogContentText = React.forwardRef<HTMLParagraphElement, DialogContentTextProps>(function DialogContentText(
  { id: idProp, className, children, ...rest },
  ref,
) {
  const id = useId(idProp);
  const ctx = React.useContext(DialogContext);
  useIsoLayoutEffect(() => ctx?.registerDescription(id), [ctx, id]);
  return (
    <p ref={ref} id={id} className={cx('gl-dialog-content-text', className)} {...rest}>
      {children}
    </p>
  );
});

export interface DialogActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Buttons, the primary one last. */
  children?: React.ReactNode;
}

/** The button row: right-aligned, space-sm apart, the primary action last. */
export const DialogActions = React.forwardRef<HTMLDivElement, DialogActionsProps>(function DialogActions(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('gl-dialog-actions', className)} {...rest}>
      {children}
    </div>
  );
});
