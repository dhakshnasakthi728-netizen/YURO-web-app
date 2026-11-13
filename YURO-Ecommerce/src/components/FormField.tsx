import type { InputHTMLAttributes } from 'react';

type FormFieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'type'
  | 'autoComplete'
  | 'inputMode'
  | 'placeholder'
  | 'maxLength'
  | 'disabled'
>;

export function FormField({
  id,
  label,
  value,
  error,
  onChange,
  onBlur,
  type = 'text',
  autoComplete,
  inputMode,
  placeholder,
  maxLength,
  disabled,
}: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={`form-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
