/**
 * Focus management utilities for dialogs and modals
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
}

/**
 * Get the first focusable element, preferring form inputs
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container)
  if (elements.length === 0) return null

  // Prefer form inputs over buttons
  const firstInput = elements.find(
    el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
  )

  return firstInput || elements[0]
}

/**
 * Create a focus trap within a container
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = getFocusableElements(container)
  if (focusableElements.length === 0) return null

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return

    // Shift + Tab: moving backwards
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Store and restore focus
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null

  storeFocus() {
    this.previousFocus = document.activeElement as HTMLElement
  }

  restoreFocus() {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      setTimeout(() => {
        this.previousFocus?.focus()
      }, 50)
    }
  }
}
