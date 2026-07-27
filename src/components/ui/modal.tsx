"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** When true, clicking the backdrop does not close the modal. */
  lockBackdrop?: boolean;
  /** Accessible label announced when the modal opens. */
  label?: string;
  /** Accessible label for the close button. */
  closeLabel?: string;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  lockBackdrop = false,
  label,
  closeLabel = "Close",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) {
        panel.querySelector<HTMLElement>(focusable)?.focus();
      }
    }, 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = panelRef.current?.querySelectorAll<HTMLElement>(focusable);
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-12 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={lockBackdrop ? undefined : onClose}
    >
      <div
        ref={panelRef}
        className={cn(
          "relative w-full max-w-lg rounded-xl bg-background shadow-xl ring-1 ring-foreground/10",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
