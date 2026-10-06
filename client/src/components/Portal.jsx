import { createPortal } from 'react-dom'

// Renders overlays at <body> level so animated (transformed/filtered) page wrappers
// can't trap `position: fixed` elements inside them
export default function Portal({ children }) {
  return createPortal(children, document.body)
}
