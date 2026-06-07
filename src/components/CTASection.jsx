import { useState } from 'react'

const API_BASE = 'http://localhost:4000/api/auth'

const emptyForm = {
  username: '',
  email: '',
  password: '',
  passwordConfirm: '',
}

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem('yamy_user')
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    localStorage.removeItem('yamy_user')
    return null
  }
}

async function readJsonResponse(response) {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    throw new Error(
      '인증 API가 올바르게 실행되지 않았습니다. 백엔드 서버를 다시 시작해 주세요.'
    )
  }

  return response.json()
}

function CTASection() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState(getStoredUser)

  const isSignup = mode === 'signup'

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setStatus(null)
    setForm(emptyForm)
  }

  function handleLogout() {
    localStorage.removeItem('yamy_token')
    localStorage.removeItem('yamy_user')
    setCurrentUser(null)
    setMode('login')
    setStatus(null)
    setForm(emptyForm)
    window.dispatchEvent(new Event('yamy-auth-changed'))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus(null)

    if (isSignup && form.password !== form.passwordConfirm) {
      setStatus({ type: 'error', message: '비밀번호 확인이 일치하지 않습니다.' })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE}/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })
      const data = await readJsonResponse(response)

      if (!response.ok) {
        throw new Error(data.message || '요청을 처리하지 못했습니다.')
      }

      if (isSignup) {
        const signupEmail = form.email.trim()
        window.alert('회원가입이 완료되었습니다. 로그인해 주세요.')
        setMode('login')
        setStatus({ type: 'success', message: '가입한 계정으로 로그인해 주세요.' })
        setForm({ ...emptyForm, email: signupEmail })
        return
      }

      localStorage.setItem('yamy_token', data.token)
      localStorage.setItem('yamy_user', JSON.stringify(data.user))
      setCurrentUser(data.user)
      setForm(emptyForm)
      window.dispatchEvent(new Event('yamy-auth-changed'))
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message === 'Failed to fetch'
          ? '백엔드 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.'
          : error.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="auth" className="fluid-section fluid-px">
      <div className="max-w-5xl mx-auto bg-primary rounded-[2rem] sm:rounded-[3rem] fluid-card relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-primary-container rounded-full blur-3xl" />
        </div>

        {currentUser ? (
          <div className="relative z-10 py-6 text-center">
            <h2 className="fluid-h2 font-bold text-on-primary">
              {currentUser.username} 요리사님 환영합니다!
            </h2>
            <p className="fluid-body mt-3 text-on-primary/80">
              YAMY에서 오늘의 맛있는 요리를 시작해 보세요.
            </p>
            <button
              className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-primary shadow-lg transition hover:bg-surface"
              type="button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="relative z-10 max-w-xl mx-auto text-center">
            <h2 className="fluid-h2 font-bold text-on-primary fluid-mb-sm">
              {isSignup ? 'YAMY와 함께 시작하세요' : '다시 만나서 반가워요'}
            </h2>
            <p className="fluid-body text-on-primary/80 mb-6">
              {isSignup
                ? '계정을 만들고 나만의 레시피 여정을 시작해 보세요.'
                : '로그인하고 저장한 레시피와 나만의 요리를 관리하세요.'}
            </p>

            <div className="grid grid-cols-2 max-w-sm mx-auto mb-6 rounded-xl bg-black/10 p-1">
              <button
                className={`rounded-lg py-2.5 text-sm font-bold transition-colors ${
                  !isSignup
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-primary/70 hover:text-on-primary'
                }`}
                type="button"
                onClick={() => changeMode('login')}
              >
                로그인
              </button>
              <button
                className={`rounded-lg py-2.5 text-sm font-bold transition-colors ${
                  isSignup
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-primary/70 hover:text-on-primary'
                }`}
                type="button"
                onClick={() => changeMode('signup')}
              >
                회원가입
              </button>
            </div>

            {status && (
              <div
                role="status"
                className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                  status.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                {status.message}
              </div>
            )}

            <form className="space-y-3 text-left" onSubmit={handleSubmit}>
              {isSignup && (
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/15 px-5 py-3.5 text-on-primary placeholder:text-on-primary/55 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="닉네임"
                  maxLength="50"
                  required
                  value={form.username}
                  onChange={updateField}
                />
              )}
              <input
                className="w-full rounded-xl border border-white/20 bg-white/15 px-5 py-3.5 text-on-primary placeholder:text-on-primary/55 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="이메일"
                required
                value={form.email}
                onChange={updateField}
              />
              <input
                className="w-full rounded-xl border border-white/20 bg-white/15 px-5 py-3.5 text-on-primary placeholder:text-on-primary/55 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white"
                name="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder="비밀번호"
                minLength="8"
                required
                value={form.password}
                onChange={updateField}
              />
              {isSignup && (
                <input
                  className="w-full rounded-xl border border-white/20 bg-white/15 px-5 py-3.5 text-on-primary placeholder:text-on-primary/55 outline-none transition focus:bg-white/20 focus:ring-2 focus:ring-white"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="비밀번호 확인"
                  minLength="8"
                  required
                  value={form.passwordConfirm}
                  onChange={updateField}
                />
              )}
              <button
                className="w-full rounded-xl bg-white px-5 py-3.5 font-bold text-primary shadow-lg transition hover:bg-surface active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                disabled={submitting}
              >
                {submitting ? '처리 중...' : isSignup ? '회원가입' : '로그인'}
              </button>
            </form>

            <p className="mt-5 text-sm text-on-primary/75">
              {isSignup ? '이미 계정이 있나요?' : '아직 계정이 없나요?'}{' '}
              <button
                className="font-bold text-on-primary underline underline-offset-4"
                type="button"
                onClick={() => changeMode(isSignup ? 'login' : 'signup')}
              >
                {isSignup ? '로그인' : '회원가입'}
              </button>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default CTASection
