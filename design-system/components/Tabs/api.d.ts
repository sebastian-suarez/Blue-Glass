// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
