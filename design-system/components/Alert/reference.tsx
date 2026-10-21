import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from '../data-display/Icon';
import { FeedbackLiveContext } from './_feedback-live';

export type AlertSeverity = 'success' | 'info' | 'warning' | 'error';

const WORD: Record<AlertSeverity, string> = { success: 'Success', info: 'Info', warning: 'Warning', error: 'Error' };

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
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { severity = 'info', variant = 'standard', icon, action, onClose, closeText = 'Close', severityText, role, className, children, ...rest },
  ref,
) {
  const inLiveRegion = React.useContext(FeedbackLiveContext);
  // Errors and warnings interrupt; the rest wait their turn. Inside a Snackbar the snackbar announces.
  const resolvedRole = role ?? (inLiveRegion ? undefined : severity === 'error' || severity === 'warning' ? 'alert' : 'status');
  return (
    <div ref={ref} role={resolvedRole} className={cx('gl-alert', `gl-alert-${variant}`, `gl-alert-${severity}`, className)} {...rest}>
      {icon === false ? null : (
        <span className="gl-alert-icon" aria-hidden="true">
          {icon ?? <Icon name={severity} size={20} />}
        </span>
      )}
      <div className="gl-alert-message">
        <span className="gl-sr-only">{`${severityText ?? WORD[severity]}: `}</span>
        {children}
      </div>
      {action != null && action !== false ? <div className="gl-alert-action">{action}</div> : null}
      {onClose ? (
        <button type="button" className="gl-alert-close" aria-label={closeText} title={closeText} onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      ) : null}
    </div>
  );
});

export interface AlertTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The title text: a few words that name the state ("Upload failed"). */
  children?: React.ReactNode;
}

/** The alert's first line: weight 600 in the status colour. */
export const AlertTitle = React.forwardRef<HTMLDivElement, AlertTitleProps>(function AlertTitle({ className, children, ...rest }, ref) {
  return (
    <div ref={ref} className={cx('gl-alert-title', className)} {...rest}>
      {children}
    </div>
  );
});
