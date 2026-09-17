import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={4}
        className={`border bg-paper-surface px-3 py-2 text-ink outline-none transition
          focus-visible:outline-2 focus-visible:outline-offset-2
          ${error ? 'border-carmim-500' : 'border-ink/40 focus:border-ink'} ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-carmim-700">{error}</span>}
    </div>
  );
}
