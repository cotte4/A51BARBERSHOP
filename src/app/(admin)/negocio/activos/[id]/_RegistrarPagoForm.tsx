"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import HangarUploadField from "../_HangarUploadField";
import { registrarAssetPaymentAction, type AssetPaymentFormState } from "../actions";

const initialState: AssetPaymentFormState = {};

function getTodayArgentina() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function RegistrarPagoForm({
  assetId,
}: {
  assetId: string;
}) {
  const action = registrarAssetPaymentAction.bind(null, assetId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [uploadKey, setUploadKey] = useState(0);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    setUploadKey((prev) => prev + 1);
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="rounded-[22px] border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-3 text-sm text-[#b9ff96]">
          {state.success}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-300">Tipo de pago</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <PaymentTypeOption
            value="sena"
            title="Sena"
            helper="Primer compromiso para sacar el activo del radar y meterlo en curso."
            defaultChecked
          />
          <PaymentTypeOption
            value="cuota"
            title="Cuota"
            helper="Pago intermedio para seguir completando la compra."
          />
          <PaymentTypeOption
            value="saldo_final"
            title="Saldo final"
            helper="Cierra la compra y deja el activo completamente pagado."
          />
          <PaymentTypeOption
            value="ajuste"
            title="Ajuste"
            helper="Corrige o documenta un movimiento excepcional del activo."
          />
        </div>
        {state.fieldErrors?.tipo ? (
          <p className="text-xs text-red-400">{state.fieldErrors.tipo}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Monto (ARS)"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          required
          error={state.fieldErrors?.monto}
        />
        <Field
          label="Fecha"
          name="fecha"
          type="date"
          defaultValue={getTodayArgentina()}
          required
          error={state.fieldErrors?.fecha}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="descripcion">
          Nota corta
        </label>
        <input
          id="descripcion"
          name="descripcion"
          type="text"
          placeholder="Ej: transferencia al proveedor"
          className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
        />
      </div>

      <HangarUploadField
        key={uploadKey}
        name="comprobanteUrl"
        label="Comprobante del pago"
        helper="Opcional, pero deja trazabilidad visual dentro del mismo activo."
        kind="receipt"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        assetId={assetId}
      />

      <button
        type="submit"
        disabled={pending}
        className="neon-button inline-flex min-h-[50px] w-full items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar pago en Hangar"}
      </button>
    </form>
  );
}

function PaymentTypeOption({
  value,
  title,
  helper,
  defaultChecked = false,
}: {
  value: string;
  title: string;
  helper: string;
  defaultChecked?: boolean;
}) {
  const activeClass =
    value === "sena"
      ? "has-[:checked]:border-amber-400/30 has-[:checked]:bg-amber-400/10"
      : value === "cuota"
        ? "has-[:checked]:border-sky-400/30 has-[:checked]:bg-sky-400/10"
        : value === "saldo_final"
          ? "has-[:checked]:border-[#8cff59]/30 has-[:checked]:bg-[#8cff59]/10"
          : "has-[:checked]:border-zinc-600/50 has-[:checked]:bg-zinc-800/70";

  return (
    <label className={`rounded-[22px] border border-zinc-700 bg-zinc-900 px-4 py-4 ${activeClass}`}>
      <input
        type="radio"
        name="tipo"
        value={value}
        defaultChecked={defaultChecked}
        className="accent-[#8cff59]"
      />
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>
    </label>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  defaultValue,
  required = false,
  min,
  step,
  error,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  step?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
        className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
