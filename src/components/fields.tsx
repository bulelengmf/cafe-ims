"use client";

import { type ReactNode, useActionState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = {
  fieldErrors?: Record<string, string>;
  formError?: string;
  values?: Record<string, string>;
};
export type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export function useEntityForm(action: FormAction) {
  return useActionState(action, {} as FormState);
}

const base =
  "block w-full min-h-[44px] rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 read-only:bg-slate-100 read-only:text-slate-600";
const cls = (err?: string) => `${base} ${err ? "border-red-600" : "border-slate-300"}`;

function Shell({
  name,
  label,
  required,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

interface CommonProps {
  name: string;
  label: string;
  state: FormState;
  required?: boolean;
  hint?: string;
}

export function TextField({
  name,
  label,
  state,
  required,
  hint,
  defaultValue = "",
  readOnly,
  inputMode,
  maxLength,
}: CommonProps & {
  defaultValue?: string;
  readOnly?: boolean;
  inputMode?: "text" | "decimal" | "numeric" | "tel";
  maxLength?: number;
}) {
  const error = state.fieldErrors?.[name];
  return (
    <Shell name={name} label={label} required={required} hint={hint} error={error}>
      <input
        id={name}
        name={name}
        defaultValue={state.values?.[name] ?? defaultValue}
        required={required}
        readOnly={readOnly}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined
        }
        className={cls(error)}
      />
    </Shell>
  );
}

export function TextAreaField({
  name,
  label,
  state,
  hint,
  defaultValue = "",
}: CommonProps & { defaultValue?: string }) {
  const error = state.fieldErrors?.[name];
  return (
    <Shell name={name} label={label} hint={hint} error={error}>
      <textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={state.values?.[name] ?? defaultValue}
        aria-invalid={error ? true : undefined}
        className={cls(error)}
      />
    </Shell>
  );
}

export function SelectField({
  name,
  label,
  state,
  required,
  hint,
  options,
  defaultValue = "",
  disabled,
}: CommonProps & {
  options: { value: string; label: string }[];
  defaultValue?: string;
  disabled?: boolean;
}) {
  const error = state.fieldErrors?.[name];
  return (
    <Shell name={name} label={label} required={required} hint={hint} error={error}>
      <select
        key={state.values?.[name] ?? "initial"}
        id={name}
        name={name}
        defaultValue={state.values?.[name] ?? defaultValue}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={cls(error)}
      >
        <option value="">Pilih…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

export function CheckboxField({
  name,
  label,
  state,
  hint,
  defaultChecked = false,
}: Omit<CommonProps, "required"> & { defaultChecked?: boolean }) {
  const checked = state.values ? state.values[name] === "on" : defaultChecked;
  return (
    <div>
      <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-slate-800">
        <input
          key={String(checked)}
          type="checkbox"
          name={name}
          defaultChecked={checked}
          className="h-5 w-5 rounded border-slate-300 accent-emerald-700"
        />
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function FormError({ state }: { state: FormState }) {
  if (!state.formError && !Object.keys(state.fieldErrors ?? {}).length) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
    >
      {state.formError ?? "Periksa kembali isian yang ditandai merah."}
    </div>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-[44px] rounded-md bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : children}
    </button>
  );
}

/** Tombol submit dengan konfirmasi untuk tindakan yang berdampak (mis. menonaktifkan). */
export function ConfirmButton({
  message,
  children,
  tone = "neutral",
}: {
  message: string;
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className={`min-h-[44px] rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
        tone === "danger"
          ? "border-red-300 text-red-700 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
