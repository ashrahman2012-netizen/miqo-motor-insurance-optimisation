import {useId, useState, type FormEvent} from "react";
import {Button} from "@miqo/ui";

const ALLOWED_ID = /^[A-Za-z0-9_-]{1,100}$/;

export function isAllowedDesktopIdentifier(value: string) {
  return ALLOWED_ID.test(value);
}

export function ExactIdLookup({
  label,
  placeholder,
  buttonLabel,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  buttonLabel: string;
  onSubmit: (value: string) => void;
}) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = value.trim();
    if (!isAllowedDesktopIdentifier(candidate)) {
      setError("Use an exact MIQOS identifier containing only letters, numbers, hyphen or underscore.");
      return;
    }
    setError(null);
    onSubmit(candidate);
  }

  return (
    <form className="desktop-id-lookup" onSubmit={submit}>
      <label htmlFor={inputId}>{label}</label>
      <div className="desktop-id-lookup__controls">
        <input
          id={inputId}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={error ? errorId : helpId}
          aria-invalid={Boolean(error)}
          onChange={event => setValue(event.currentTarget.value)}
        />
        <Button type="submit">{buttonLabel}</Button>
      </div>
      {error ? <p id={errorId} role="alert">{error}</p> : (
        <p id={helpId}>Exact identifier lookup only. Global case/entity search is not authorised.</p>
      )}
    </form>
  );
}
