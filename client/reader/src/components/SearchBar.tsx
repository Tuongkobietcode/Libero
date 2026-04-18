import type { FormEvent, ReactNode } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  buttonLabel?: string;
  children?: ReactNode;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Tim theo ten sach, tac gia, ISBN...',
  buttonLabel = 'Tim kiem',
  children,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-row">
        <input
          className="search-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
        <button className="button" type="submit">
          {buttonLabel}
        </button>
      </div>
      {children ? <div className="filter-row">{children}</div> : null}
    </form>
  );
}
