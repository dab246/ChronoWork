import { useEffect, useRef, type RefObject } from 'react';

/** Calls onDismiss on Escape or on a pointer press outside the given elements. */
export function useDismiss(active: boolean, refs: RefObject<HTMLElement | null>[], onDismiss: () => void) {
  const latest = useRef({ refs, onDismiss });
  latest.current = { refs, onDismiss };

  useEffect(() => {
    if (!active) return;
    const onPointer = (e: PointerEvent) => {
      if (latest.current.refs.every((ref) => !ref.current?.contains(e.target as Node))) latest.current.onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        latest.current.onDismiss();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [active]);
}
