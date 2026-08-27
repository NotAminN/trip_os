import { uid } from '../utils/helpers.js'

export function createToggle({ label = '', checked = false, onChange } = {}) {
  const inputId = uid('switch')

  const el = document.createElement('label')
  el.className = 'switch'
  el.innerHTML = `
    <input type="checkbox" role="switch" class="switch-input" id="${inputId}" />
    <span class="switch-track"><span class="switch-thumb"></span></span>
    <span class="switch-text"></span>
  `

  const input = el.querySelector('.switch-input')
  input.checked = checked
  el.querySelector('.switch-text').textContent = label
  input.addEventListener('change', () => onChange?.(input.checked))

  return {
    el,
    input,
    getChecked: () => input.checked,
    setChecked(value, { silent = false } = {}) {
      input.checked = Boolean(value)
      if (!silent) onChange?.(input.checked)
    },
  }
}
