// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

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
