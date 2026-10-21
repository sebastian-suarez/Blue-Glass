import * as React from 'react';

/**
 * True inside a Snackbar. Its root is already a live region that exists before
 * any message lands in it, so a nested Alert drops its own role instead of
 * announcing the same words twice.
 */
export const FeedbackLiveContext = React.createContext<boolean>(false);
