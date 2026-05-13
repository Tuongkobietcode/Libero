import { type FormEvent, type ReactNode, useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';

import { cn } from '../../utils/cn';

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  onSubmit: (query: string) => void;
  size?: 'md' | 'lg';
  trailing?: ReactNode;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Tìm sách theo tên, tác giả, ISBN...',
  onSubmit,
  size = 'md',
  trailing,
  autoFocus,
  className,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn(
        'flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition-colors focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100',
        size === 'lg' ? 'h-14' : 'h-12',
        className,
      )}
    >
      <SearchIcon className="h-5 w-5 text-slate-400 shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border-0 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-400"
        aria-label="Tìm kiếm sách"
      />
      {trailing}
      <button
        type="submit"
        className={cn(
          'inline-flex items-center justify-center rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors',
          size === 'lg' ? 'h-10 px-5 text-sm' : 'h-9 px-4 text-sm',
        )}
      >
        Tìm kiếm
      </button>
    </form>
  );
}
