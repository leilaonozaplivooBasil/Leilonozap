import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

// Versão sem Radix: quem agenda o auto-fechamento e liga o X é a gente.
// Sem isso a notificação ficava presa na tela e o X não fazia nada (bug 25/07).
const DEFAULT_DURATION = 4000;

function AutoDismiss({ id, duration, open, dismiss }) {
  const timerRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    timerRef.current = setTimeout(() => dismiss(id), duration || DEFAULT_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [id, duration, open, dismiss]);
  return null;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, open, onOpenChange, ...props }) {
        return (
          <Toast key={id} data-state={open ? "open" : "closed"} {...props}>
            <AutoDismiss id={id} duration={duration} open={open} dismiss={dismiss} />
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => dismiss(id)} />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
