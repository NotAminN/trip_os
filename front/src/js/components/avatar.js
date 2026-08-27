export function createAvatar({ name = '', src = null, size = 'md' } = {}) {
  const el = document.createElement('span')
  el.className = `avatar avatar-${size}`

  if (src) {
    const img = document.createElement('img')
    img.src = src
    img.alt = name
    img.loading = 'lazy'
    el.appendChild(img)
    return el
  }

  const initials = String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
  el.textContent = initials
  el.setAttribute('aria-label', name)
  el.setAttribute('role', 'img')
  return el
}
