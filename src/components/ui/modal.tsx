"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
