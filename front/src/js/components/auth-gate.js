/**
 * Auth gate — a minimal full-screen overlay shown until the user has a
 * valid session. Supports login and register against the Django API.
 */

import { ApiError } from '../services/api.js'
import { authService } from '../services/auth.js'
import { icon } from '../shell/icons.js'

function template() {
  return `
  <div class="auth-gate" dir="rtl">
    <div class="auth-card" role="dialog" aria-modal="true" aria-label="ورود به Trip OS">
      <div class="auth-logo">${icon('map')}<span>Trip OS</span></div>
      <div class="auth-tabs" role="tablist">
        <button type="button" class="auth-tab is-active" data-mode="login">ورود</button>
        <button type="button" class="auth-tab" data-mode="register">ساخت حساب</button>
      </div>
      <form class="auth-form" novalidate>
        <label class="auth-field">
          <span>ایمیل</span>
          <input type="email" name="email" autocomplete="email" required placeholder="you@example.com" />
        </label>
        <label class="auth-field auth-field-username is-hidden">
          <span>نام کاربری</span>
          <input type="text" name="username" autocomplete="username" placeholder="مثلاً sara" />
        </label>
        <label class="auth-field">
          <span>رمز عبور</span>
          <input type="password" name="password" autocomplete="current-password" required placeholder="••••••••" />
        </label>
        <label class="auth-field auth-field-confirm is-hidden">
          <span>تکرار رمز عبور</span>
          <input type="password" name="password_confirm" autocomplete="new-password" placeholder="••••••••" />
        </label>
        <p class="auth-error" hidden></p>
        <button type="submit" class="auth-submit">ورود</button>
      </form>
    </div>
  </div>`
}

const STYLE_ID = 'auth-gate-style'

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
  .auth-gate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
    background:radial-gradient(1200px 600px at 50% -10%,#1d2b3a,#0f1620);font-family:Vazirmatn,sans-serif}
  .auth-card{width:min(400px,92vw);background:#fff;border-radius:20px;padding:32px 28px;
    box-shadow:0 30px 80px rgba(0,0,0,.45)}
  .auth-logo{display:flex;align-items:center;gap:10px;justify-content:center;font-weight:800;
    font-size:1.3rem;color:#173049;margin-bottom:22px}
  .auth-logo svg{width:26px;height:26px;color:#4D8FD8}
  .auth-tabs{display:grid;grid-template-columns:1fr 1fr;background:#eef2f6;border-radius:12px;padding:4px;margin-bottom:18px}
  .auth-tab{border:0;background:transparent;padding:9px;border-radius:9px;font-family:inherit;
    font-size:.92rem;color:#5b6b7c;cursor:pointer}
  .auth-tab.is-active{background:#fff;color:#173049;font-weight:700;box-shadow:0 2px 8px rgba(15,40,70,.08)}
  .auth-field{display:block;margin-bottom:14px}
  .auth-field span{display:block;font-size:.82rem;color:#5b6b7c;margin-bottom:6px}
  .auth-field input{width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #dbe3ea;
    border-radius:11px;font-family:inherit;font-size:.95rem;background:#fbfdff;transition:border-color .15s}
  .auth-field input:focus{outline:none;border-color:#4D8FD8;background:#fff}
  .auth-error{background:#fdecec;color:#b3373c;border:1px solid #f5c9cb;border-radius:10px;
    padding:10px 14px;font-size:.85rem;margin:0 0 14px}
  .auth-submit{width:100%;border:0;background:#4D8FD8;color:#fff;font-family:inherit;font-weight:700;
    font-size:1rem;padding:13px;border-radius:12px;cursor:pointer;transition:filter .15s}
  .auth-submit:hover{filter:brightness(1.06)}
  .auth-submit[disabled]{opacity:.65;cursor:wait}
  .is-hidden{display:none!important}`
  document.head.appendChild(style)
}

/**
 * Show the gate; resolves with the authenticated user after successful
 * login/register. Reuses an existing instance when called repeatedly.
 */
export function showAuthGate() {
  ensureStyles()

  let gate = document.querySelector('.auth-gate')
  if (!gate) {
    gate = document.createElement('div')
    gate.innerHTML = template()
    document.body.appendChild(gate.firstElementChild)
  }
  const root = gate

  return new Promise((resolve) => {
    const form = root.querySelector('.auth-form')
    const errorEl = root.querySelector('.auth-error')
    const submitBtn = root.querySelector('.auth-submit')
    const usernameField = root.querySelector('.auth-field-username')
    const confirmField = root.querySelector('.auth-field-confirm')

    let mode = 'login'
    let settled = false

    function setError(message) {
      errorEl.textContent = message
      errorEl.hidden = !message
    }

    root.querySelectorAll('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode
        root.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('is-active', t === tab))
        usernameField.classList.toggle('is-hidden', mode !== 'register')
        confirmField.classList.toggle('is-hidden', mode !== 'register')
        submitBtn.textContent = mode === 'login' ? 'ورود' : 'ساخت حساب'
        setError('')
      })
    })

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      setError('')
      const data = Object.fromEntries(new FormData(form).entries())

      submitBtn.disabled = true
      try {
        if (mode === 'login') {
          await authService.login(data.email, data.password)
        } else {
          await authService.register({
            email: data.email,
            username: data.username,
            password: data.password,
            password_confirm: data.password_confirm,
          })
        }
        settled = true
        root.remove()
        resolve(authService.getUser())
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'اتصال به سرور برقرار نشد.'
        setError(message)
      } finally {
        submitBtn.disabled = false
      }
    })

    // Safety net: if another flow logs in meanwhile, dismiss the gate.
    const off = authService.onChange((user) => {
      if (user && !settled && document.body.contains(root)) {
        settled = true
        root.remove()
        resolve(user)
      }
    })
    root.addEventListener('remove', off, { once: true })
  })
}
