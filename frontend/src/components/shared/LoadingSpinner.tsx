import { cn } from '@/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }
  return (
    <svg
      className={cn('animate-spin text-primary', sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Carregando..."
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <LoadingSpinner size="lg" />
    </div>
  )
}
