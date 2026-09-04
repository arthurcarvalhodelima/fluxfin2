import { InputHTMLAttributes } from "react";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function FormField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: FormFieldProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="fluxfin-label">
        {label}
      </label>
      <input
        id={inputId}
        className={`fluxfin-input ${error ? "border-danger focus:border-danger focus:ring-danger/20" : ""} ${className || ""}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && !error && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}
