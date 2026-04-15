"use client";

/**
 * ActionButton — premium button with built-in state machine.
 *
 * Two usage modes:
 *
 * 1. Self-managed  →  pass `onAction: () => Promise<void>`
 *    The button handles pending/success/error internally and auto-resets.
 *
 * 2. External control  →  pass `isPending` + `actionStatus` from useActionState
 *    The button renders whatever state the parent provides, no internal state.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────

export type ActionButtonVariant = "neon" | "ghost" | "danger" | "subtle";
type BtnStatus = "idle" | "pending" | "success" | "error";

export interface ActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ActionButtonVariant;
  /** Self-managed mode: async action to run on click */
  onAction?: () => Promise<void>;
  /** How long to show success/error state before resetting (ms) */
  successDuration?: number;
  /** External control: pending flag from useActionState */
  isPending?: boolean;
  /** External control: result status from server action */
  actionStatus?: "success" | "error" | null;
  /** Text overrides per state */
  loadingText?: string;
  successText?: string;
  errorText?: string;
  children: React.ReactNode;
}

// ── Spinner ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      style={{ animation: "a51-spin 0.65s linear infinite" }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Track */}
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.8" />
      {/* Arc */}
      <path
        d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Check icon (stroke-draw animation) ────────────────────────────

function CheckIcon() {
  return (
    <svg
      style={{
        animation: "a51-check-draw 0.28s ease-out both",
        strokeDasharray: 22,
        strokeDashoffset: 0,
      }}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M 2.5 7 L 5.8 10.5 L 11.5 3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── X icon ────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M 2.5 2.5 L 10.5 10.5 M 10.5 2.5 L 2.5 10.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Style maps ────────────────────────────────────────────────────

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-[20px] px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed";

const IDLE_CLASSES: Record<ActionButtonVariant, string> = {
  neon: "neon-button text-[#07130a] disabled:opacity-60",
  ghost: "ghost-button disabled:opacity-60",
  danger:
    "border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:border-rose-400/60 hover:bg-rose-500/16 disabled:opacity-60",
  subtle:
    "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-60",
};

const SUCCESS_CLASSES: Record<ActionButtonVariant, string> = {
  neon: "border border-[#8cff59]/40 bg-[#8cff59]/14 text-[#8cff59]",
  ghost: "border border-[#8cff59]/40 bg-[#8cff59]/10 text-[#8cff59]",
  danger: "border border-[#8cff59]/35 bg-[#8cff59]/10 text-[#8cff59]",
  subtle: "border border-[#8cff59]/30 bg-[#8cff59]/8 text-[#8cff59]",
};

const ERROR_CLASSES: Record<ActionButtonVariant, string> = {
  neon: "border border-rose-500/40 bg-rose-500/14 text-rose-200",
  ghost: "border border-rose-500/40 bg-rose-500/10 text-rose-300",
  danger: "border border-rose-500/55 bg-rose-500/20 text-rose-100",
  subtle: "border border-rose-500/35 bg-rose-500/10 text-rose-300",
};

// ── Component ─────────────────────────────────────────────────────

export default function ActionButton({
  variant = "neon",
  onAction,
  successDuration = 2200,
  isPending: externalPending,
  actionStatus,
  loadingText,
  successText = "Listo",
  errorText = "Error",
  children,
  disabled,
  className = "",
  onClick,
  ...props
}: ActionButtonProps) {
  const [internalStatus, setInternalStatus] = useState<BtnStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // External status changes → update internal display
  useEffect(() => {
    if (externalPending === undefined && actionStatus === undefined) return;
    if (actionStatus === "success") {
      setInternalStatus("success");
      resetTimerRef.current = setTimeout(() => setInternalStatus("idle"), successDuration);
    } else if (actionStatus === "error") {
      setInternalStatus("error");
      resetTimerRef.current = setTimeout(() => setInternalStatus("idle"), 2600);
    }
  }, [actionStatus, externalPending, successDuration]);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onAction) {
        if (internalStatus === "pending") return;
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        setInternalStatus("pending");
        try {
          await onAction();
          setInternalStatus("success");
          resetTimerRef.current = setTimeout(() => setInternalStatus("idle"), successDuration);
        } catch {
          setInternalStatus("error");
          resetTimerRef.current = setTimeout(() => setInternalStatus("idle"), 2600);
        }
      } else if (onClick) {
        onClick(e);
      }
    },
    [onAction, onClick, internalStatus, successDuration],
  );

  // Derive the effective display status
  const status: BtnStatus =
    externalPending ? "pending"
    : internalStatus;

  const isDisabled = disabled || status === "pending";

  // Pick style classes
  const stateClasses =
    status === "success" ? SUCCESS_CLASSES[variant]
    : status === "error" ? ERROR_CLASSES[variant]
    : IDLE_CLASSES[variant];

  // Flash animation (injected via inline style to avoid Tailwind purge issues with dynamic class names)
  const flashStyle: React.CSSProperties =
    status === "success"
      ? { animation: "a51-btn-success 0.45s ease-out both" }
      : status === "error"
        ? { animation: "a51-btn-error 0.45s ease-out both" }
        : {};

  const label =
    status === "pending" ? (loadingText ?? children)
    : status === "success" ? successText
    : status === "error" ? errorText
    : children;

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={isDisabled}
      style={{ ...flashStyle, ...props.style }}
      className={`${BASE_CLASSES} ${stateClasses} ${className}`.trim()}
    >
      {status === "pending" && <Spinner />}
      {status === "success" && <CheckIcon />}
      {status === "error" && <XIcon />}
      <span>{label}</span>
    </button>
  );
}
