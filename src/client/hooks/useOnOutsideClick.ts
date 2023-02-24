import { MutableRefObject, useEffect } from "react"

/**
 * Hooks that calls a function when the user clicks outside of the element.
 *
 * Doesn't fire if the click is on the headbar.
 */
export default function useOnOutsideClick(
  ref: MutableRefObject<Element>,
  callback: () => void
): void {
  useEffect(() => {
    // handler that checks for the click outside of the element
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node) && // the target is not in the element
        !document.querySelector(".headbar")?.contains(event.target as Node) // the target is not in the headbar
      )
        callback()
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref, callback])
}
