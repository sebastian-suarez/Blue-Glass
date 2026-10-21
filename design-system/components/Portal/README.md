# Portal

Renders its children into another DOM node: `document.body` by default, or a `container` you pass. React context and events still flow from where it's written, which is how overlays escape `overflow: hidden` and stacking contexts.

**Source:** an addition, matching MUI's utility. It's a thin wrapper over `ReactDOM.createPortal`.

## What you provide

- `children`.
- `container`: an element or a function returning one. Default `document.body`.
- `disablePortal`: render in place instead.

## Notes

- It renders nothing without a DOM (a server build). Overlays mount on the client.
