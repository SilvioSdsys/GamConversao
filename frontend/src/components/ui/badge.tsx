/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white',
        success: 'border-transparent bg-success/10 text-success border-success/20',
        danger: 'border-transparent bg-danger/10 text-danger border-danger/20',
        warning: 'border-transparent bg-warning/10 text-warning border-warning/20',
        outline: 'text-foreground border-border',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        blue: 'border-transparent bg-blue-100 text-blue-800 border-blue-200',
        gray: 'border-transparent bg-gray-100 text-gray-700 border-gray-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
