import { checkPasswordStrength } from '@/utils/password'
import { Check, X } from 'lucide-react'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const { score, label, color, checks } = checkPasswordStrength(password)
  const widthMap = ['0%', '20%', '40%', '70%', '100%']

  const requirements = [
    { label: 'Mínimo 8 caracteres', ok: checks.minLength },
    { label: '1 letra maiúscula', ok: checks.hasUppercase },
    { label: '1 letra minúscula', ok: checks.hasLowercase },
    { label: '1 número', ok: checks.hasNumber },
    { label: '1 caractere especial', ok: checks.hasSpecial },
  ]

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de progresso */}
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: widthMap[score], backgroundColor: color }}
        />
      </div>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req) => (
          <div key={req.label} className="flex items-center gap-1.5">
            {req.ok ? (
              <Check className="h-3 w-3 text-success shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <span
              className={`text-xs ${req.ok ? 'text-success' : 'text-muted-foreground'}`}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
