// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
