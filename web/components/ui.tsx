import * as React from "react";

export function Card({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface placeholder:text-slate-400 focus:border-primary focus:outline-none ${className}`}
    />
  );
}

export function Badge({
  children,
  tone = "default",
}: React.PropsWithChildren<{ tone?: "default" | "peak" | "offpeak" | "taken" }>) {
  const toneClass = {
    default: "bg-slate-100 text-slate-600 border border-slate-200",
    peak: "bg-amber-50 text-amber-700 border border-amber-200",
    offpeak: "bg-green-50 text-green-700 border border-green-200",
    taken: "bg-rose-50 text-rose-700 border border-rose-200",
  }[tone];
  return (
    <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${toneClass}`}>
      {children}
    </span>
  );
}
