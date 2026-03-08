export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Muito fraca' | 'Fraca' | 'Média' | 'Forte' | 'Muito forte'
  color: string
  checks: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password),
  }

  const passed = Object.values(checks).filter(Boolean).length

  const scoreMap: PasswordStrength['score'][] = [0, 1, 2, 3, 4]
  const labelMap: PasswordStrength['label'][] = [
    'Muito fraca',
    'Fraca',
    'Média',
    'Forte',
    'Muito forte',
  ]
  const colorMap = ['#DC2626', '#EA580C', '#EAB308', '#16A34A', '#059669']

  const score = (scoreMap[passed] ?? 0) as PasswordStrength['score']

  return {
    score,
    label: labelMap[score],
    color: colorMap[score],
    checks,
  }
}
