import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden="true" className={cn('animate-spin', className)} />;
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn('btn btn-ghost btn-icon', className)}
      {...props}
    >
      {children}
    </button>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', disabled && 'opacity-60')}>
      <div className="min-w-0">
        <span className="block text-[12.5px] font-semibold leading-snug text-slate-200">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-200 before:absolute before:-inset-2 before:rounded-full before:content-[""]',
          checked
            ? 'border-amber-400/50 bg-amber-500/90'
            : 'border-white/10 bg-white/[0.08] hover:bg-white/[0.12]'
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>
    </div>
  );
}

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const TOAST_STYLES: Record<ToastKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-300 border-emerald-400/25' },
  error: { icon: AlertTriangle, className: 'text-rose-300 border-rose-400/25' },
  info: { icon: Info, className: 'text-sky-300 border-sky-400/25' },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.kind];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'anim-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#0b1019]/95 px-3.5 py-3 text-[12px] font-medium text-slate-200 shadow-2xl shadow-black/50 backdrop-blur-xl',
              style.className
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar notificação"
              className="rounded p-0.5 text-slate-500 transition-colors hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
