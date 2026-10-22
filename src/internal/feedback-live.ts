"use client";
/**
Whether a component renders inside a feedback live region, ported from
design-system/shared/_feedback-live.ts. Snackbar provides true: its root is a live region that
exists before any message lands in it, so an Alert inside drops its own role instead of
announcing the same words twice.
*/
import * as React from "react";

// eslint-disable-next-line @typescript-eslint/naming-convention -- A React context, rendered as a JSX element.
export const FeedbackLiveContext = React.createContext<boolean>(false);
