export function parseDeviceFromUA(ua: string | null | undefined): string {
  if (!ua) return 'Dispositivo desconhecido'
  const u = ua.toLowerCase()
  if (u.includes('mobile') || u.includes('android')) return '📱 Mobile'
  if (u.includes('ipad') || u.includes('tablet')) return '📱 Tablet'
  if (u.includes('windows')) return '🖥️ Windows'
  if (u.includes('mac')) return '🖥️ Mac'
  if (u.includes('linux')) return '🖥️ Linux'
  return '🖥️ Desktop'
}

export function parseBrowserFromUA(ua: string | null | undefined): string {
  if (!ua) return ''
  const u = ua.toLowerCase()
  if (u.includes('chrome') && !u.includes('edg')) return 'Chrome'
  if (u.includes('firefox')) return 'Firefox'
  if (u.includes('safari') && !u.includes('chrome')) return 'Safari'
  if (u.includes('edg')) return 'Edge'
  return 'Navegador desconhecido'
}
