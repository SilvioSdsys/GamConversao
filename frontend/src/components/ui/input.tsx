import * as React from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus-visible:ring-danger',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
