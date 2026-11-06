import { useId } from 'react';
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
  const descriptionId = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={description ? descriptionId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group flex w-full items-start justify-between gap-4 px-3.5 py-3 text-left transition-colors duration-150',
        'focus-visible:bg-white/[0.035] focus-visible:outline-none',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:bg-white/[0.025]'
      )}
    >
      <span className="min-w-0 flex-1 select-none">
        <span
          className={cn(
            'block text-[14.5px] font-semibold leading-snug transition-colors',
            checked ? 'text-slate-100' : 'text-slate-200',
            !disabled && 'group-hover:text-white'
          )}
        >
          {label}
        </span>
        {description && (
          <span
            id={descriptionId}
            className="mt-1 block text-[12px] leading-[1.55] text-slate-500 transition-colors group-hover:text-slate-400"
          >
            {description}
          </span>
        )}
      </span>

      {/* Switch track — visual only; the whole row is the control. */}
      <span
        aria-hidden="true"
        className={cn(
          'relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border px-[2px]',
          'transition-[background-color,border-color,box-shadow,filter] duration-200 ease-out',
          checked
            ? 'border-amber-300/45 bg-gradient-to-r from-amber-500 to-amber-400 shadow-[inset_0_1px_2px_rgba(120,53,15,0.28),0_0_0_3px_rgba(245,166,35,0.05)]'
            : 'border-white/[0.12] bg-[#0b0f16] shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]',
          !disabled && checked && 'group-hover:brightness-[1.04]',
          !disabled && !checked && 'group-hover:border-white/[0.22]',
          'group-focus-visible:ring-2 group-focus-visible:ring-amber-400/45 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#080b12]'
        )}
      >
        <span
          className={cn(
            'h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(0,0,0,0.08)]',
            'transition-transform duration-200 ease-out',
            checked ? 'translate-x-[16px]' : 'translate-x-0'
          )}
        />
      </span>
    </button>
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
              'anim-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#0b1019]/95 px-3.5 py-3 text-[14px] font-medium text-slate-200 shadow-2xl shadow-black/50 backdrop-blur-xl',
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
