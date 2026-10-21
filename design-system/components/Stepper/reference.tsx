import * as React from 'react';
import { cx } from '../internal/cx';
import { useEventCallback } from '../internal/hooks';
import { Icon } from '../data-display/Icon';
import { Collapse } from '../utils/Transitions';

interface StepperContextValue {
  activeStep: number;
  orientation: 'horizontal' | 'vertical';
  alternativeLabel: boolean;
  nonLinear: boolean;
  onChange: (event: React.SyntheticEvent, step: number) => void;
}
const StepperContext = React.createContext<StepperContextValue>({
  activeStep: 0,
  orientation: 'horizontal',
  alternativeLabel: false,
  nonLinear: false,
  onChange: () => {},
});

/** Where a Step sits, set by Stepper: its index, whether it's last, and whether the step before it is done. */
interface StepPosition {
  index: number;
  last: boolean;
  prevCompleted: boolean;
}
const StepPositionContext = React.createContext<StepPosition>({ index: 0, last: true, prevCompleted: false });

interface StepContextValue {
  index: number;
  last: boolean;
  active: boolean;
  completed: boolean;
  disabled: boolean;
  expanded: boolean;
}
const StepContext = React.createContext<StepContextValue>({
  index: 0,
  last: true,
  active: false,
  completed: false,
  disabled: false,
  expanded: false,
});

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
  transitionDuration?: number | { enter?: number; exit?: number };
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
export const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(function Stepper(
  { activeStep = 0, orientation = 'horizontal', alternativeLabel = false, nonLinear = false, onChange, className, children, ...rest },
  ref,
) {
  const handleChange = useEventCallback((event: React.SyntheticEvent, step: number) => onChange?.(event, step));
  const alt = orientation === 'horizontal' && alternativeLabel;
  const context = React.useMemo<StepperContextValue>(
    () => ({ activeStep, orientation, alternativeLabel: alt, nonLinear, onChange: handleChange }),
    [activeStep, orientation, alt, nonLinear, handleChange],
  );
  const steps = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[];
  const completedAt = (i: number): boolean => {
    const completed = (steps[i].props as StepProps).completed;
    return completed !== undefined ? completed : !nonLinear && activeStep > i;
  };
  return (
    <StepperContext.Provider value={context}>
      <ol
        ref={ref}
        role="list"
        className={cx('gl-stepper', `gl-stepper-${orientation}`, alt && 'gl-stepper-alt', nonLinear && 'gl-stepper-nonlinear', className)}
        {...rest}
      >
        {steps.map((step, index) => (
          <StepPositionContext.Provider
            key={step.key ?? index}
            value={{ index, last: index === steps.length - 1, prevCompleted: index > 0 && completedAt(index - 1) }}
          >
            {step}
          </StepPositionContext.Provider>
        ))}
      </ol>
    </StepperContext.Provider>
  );
});

/** One step: an <li> holding its StepLabel (and StepContent when vertical), with the connector from the step before. */
export const Step = React.forwardRef<HTMLLIElement, StepProps>(function Step(
  { active: activeProp, completed: completedProp, disabled = false, expanded = false, className, children, ...rest },
  ref,
) {
  const stepper = React.useContext(StepperContext);
  const { index, last, prevCompleted } = React.useContext(StepPositionContext);
  const active = activeProp !== undefined ? activeProp : stepper.activeStep === index;
  const completed = completedProp !== undefined ? completedProp : !stepper.nonLinear && stepper.activeStep > index;
  const context = React.useMemo<StepContextValue>(
    () => ({ index, last, active, completed, disabled, expanded }),
    [index, last, active, completed, disabled, expanded],
  );
  return (
    <li
      ref={ref}
      className={cx('gl-step', active && 'gl-step-active', completed && 'gl-step-completed', last && 'gl-step-last', className)}
      aria-current={active && !stepper.nonLinear ? 'step' : undefined}
      {...rest}
    >
      {index > 0 ? (
        <span className={cx('gl-step-connector', prevCompleted && 'gl-step-connector-completed')} aria-hidden="true" />
      ) : null}
      <StepContext.Provider value={context}>{children}</StepContext.Provider>
    </li>
  );
});

/** The 28px step mark: ink check when done, ink ring when current, dg-edge ring when upcoming, danger ring on error. */
function StepIcon({ state, icon }: { state: 'upcoming' | 'active' | 'completed' | 'error'; icon: React.ReactNode }) {
  let glyph: React.ReactNode = icon;
  // The error glyph's own circle, cropped to the 28px box so it reads as the same ring as the other states.
  if (state === 'error') glyph = <Icon name="error" size={28} viewBox="2.31 2.31 19.38 19.38" strokeWidth={1.385} />;
  else if (state === 'completed') glyph = <Icon name="check" size={16} strokeWidth={2} />;
  return (
    <span className={cx('gl-step-icon', `gl-step-icon-${state}`)} aria-hidden="true">
      {glyph}
    </span>
  );
}

/** A step's icon, label and optional caption; a button when the Stepper is nonLinear. */
export const StepLabel = React.forwardRef<HTMLElement, StepLabelProps>(function StepLabel(
  { error = false, optional, icon, className, children, onClick, ...rest },
  ref,
) {
  const stepper = React.useContext(StepperContext);
  const step = React.useContext(StepContext);
  const state = error ? 'error' : step.completed ? 'completed' : step.active ? 'active' : 'upcoming';
  const status = error ? 'error' : step.completed ? 'completed' : '';
  const inner = (
    <>
      <StepIcon state={state} icon={icon ?? step.index + 1} />
      <span className="gl-step-text">
        <span className="gl-step-title">
          {children}
          {status ? <span className="gl-sr-only">, {status}</span> : null}
        </span>
        {optional ? <span className="gl-step-optional">{optional}</span> : null}
      </span>
    </>
  );
  const classes = cx('gl-step-label', `gl-step-label-${state}`, stepper.nonLinear && 'gl-step-label-button', className);
  if (stepper.nonLinear) {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={classes}
        disabled={step.disabled}
        aria-current={step.active ? 'step' : undefined}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) stepper.onChange(event, step.index);
        }}
        {...rest}
      >
        {inner}
      </button>
    );
  }
  return (
    <span ref={ref as React.Ref<HTMLSpanElement>} className={classes} onClick={onClick} {...rest}>
      {inner}
    </span>
  );
});

/** Vertical steppers only: the active step's detail, revealed with Collapse along the connector line. */
export const StepContent = React.forwardRef<HTMLDivElement, StepContentProps>(function StepContent(
  { transitionDuration, className, children, ...rest },
  ref,
) {
  const stepper = React.useContext(StepperContext);
  const step = React.useContext(StepContext);
  if (stepper.orientation !== 'vertical') return null;
  return (
    <div ref={ref} className={cx('gl-step-content', className)} {...rest}>
      <Collapse in={step.active || step.expanded} timeout={transitionDuration}>
        <div className="gl-step-content-body">{children}</div>
      </Collapse>
    </div>
  );
});

function defaultStepText(step: number, steps: number): string {
  return `Step ${step} of ${steps}`;
}

/** A compact stepper for narrow screens: back, the position as dots, a bar or text, then next. */
export const MobileStepper = React.forwardRef<HTMLDivElement, MobileStepperProps>(function MobileStepper(
  { steps, activeStep = 0, variant = 'dots', position = 'static', backButton, nextButton, getStepText = defaultStepText, className, ...rest },
  ref,
) {
  const total = Math.max(0, Math.floor(steps));
  const current = Math.min(Math.max(activeStep, 0), Math.max(total - 1, 0));
  const percent = total > 1 ? (current / (total - 1)) * 100 : 100;
  return (
    <div ref={ref} role="group" className={cx('gl-mobile-stepper', `gl-mobile-stepper-${position}`, className)} {...rest}>
      {backButton}
      <div className="gl-mobile-stepper-status">
        {variant === 'dots' ? (
          <span className="gl-mobile-stepper-dots" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={cx('gl-mobile-stepper-dot', i === current && 'gl-mobile-stepper-dot-active')} />
            ))}
          </span>
        ) : null}
        {variant === 'progress' ? (
          <span className="gl-mobile-stepper-track" aria-hidden="true">
            <span className="gl-mobile-stepper-bar" style={{ transform: `translateX(${percent - 100}%)` }} />
          </span>
        ) : null}
        <span className={variant === 'text' ? 'gl-mobile-stepper-text' : 'gl-sr-only'} aria-live="polite" aria-atomic="true">
          {getStepText(current + 1, total)}
        </span>
      </div>
      {nextButton}
    </div>
  );
});
