import { useEffect, useState, type FormEvent } from 'react'
import './App.css'
import Settings from './Settings'
import Home from './Home'

type Page = 'home' | 'settings'
type AuthMode = 'login' | 'register'

type CurrentUser = {
  id: number
  email: string
  username: string
  is_active: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    return window.localStorage.getItem('cardscreator_token')
  })
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '' })
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navItems: Array<{ id: Page; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'settings', label: 'Settings' },
  ]

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null)
      return
    }

    const loadCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Session expired')
        }

        const data = (await response.json()) as CurrentUser
        setCurrentUser(data)
      } catch {
        setCurrentUser(null)
        setAuthToken(null)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('cardscreator_token')
        }
      }
    }

    void loadCurrentUser()
  }, [authToken])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (authToken) {
      window.localStorage.setItem('cardscreator_token', authToken)
    } else {
      window.localStorage.removeItem('cardscreator_token')
    }
  }, [authToken])

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthError(null)
    setAuthForm({ email: '', username: '', password: '' })
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
    setAuthError(null)
  }

  const handleLogout = () => {
    setAuthToken(null)
    setCurrentUser(null)
    setAuthModalOpen(false)
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : { email: authForm.email, username: authForm.username, password: authForm.password }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Authentication failed')
      }

      if (authMode === 'register') {
        setCurrentUser(data.user as CurrentUser)
      }

      setAuthToken(data.access_token)
      closeAuthModal()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const avatarLabel = currentUser
    ? (currentUser.username?.[0] ?? currentUser.email?.[0] ?? '?').toUpperCase()
    : '?'

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <nav className="relative bg-gray-800/50 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10">
        <div className="w-full px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-white/5 hover:text-white focus:outline-2 focus:-outline-offset-1 focus:outline-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6">
                  <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
              <div className="flex shrink-0 items-center">
                <span className="text-lg font-semibold tracking-wide">Cards Creator</span>
              </div>

              <div className="hidden sm:ml-6 sm:block">
                <div className="flex space-x-4">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentPage(item.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`rounded-md px-3 py-2 text-sm font-medium ${
                        currentPage === item.id
                          ? 'bg-gray-950/50 text-white'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2 text-left transition hover:bg-white/10"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
                      {avatarLabel}
                    </div>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-medium text-white">{currentUser.username}</p>
                      <p className="text-xs text-gray-400">{currentUser.email}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="rounded-md border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/5 hover:text-white"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="block sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCurrentPage(item.id)
                    setMobileMenuOpen(false)
                  }}
                  className={`block w-full rounded-md px-3 py-2 text-left text-base font-medium ${
                    currentPage === item.id
                      ? 'bg-gray-950/50 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {authModalOpen && !currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
                  {authMode === 'login' ? 'Welcome back' : 'Create account'}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {authMode === 'login' ? 'Login to Cards Creator' : 'Register for Cards Creator'}
                </h2>
              </div>
              <button type="button" onClick={closeAuthModal} className="rounded-full p-2 text-gray-400 hover:bg-white/5 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  authMode === 'login' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  authMode === 'register' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                Register
              </button>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleAuthSubmit}>
              <label className="block text-sm text-gray-300">
                <span className="mb-1 block">Email</span>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-0 placeholder:text-gray-500"
                  placeholder="you@example.com"
                />
              </label>

              {authMode === 'register' && (
                <label className="block text-sm text-gray-300">
                  <span className="mb-1 block">Username</span>
                  <input
                    type="text"
                    required
                    value={authForm.username}
                    onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-0 placeholder:text-gray-500"
                    placeholder="your username"
                  />
                </label>
              )}

              <label className="block text-sm text-gray-300">
                <span className="mb-1 block">Password</span>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-0 placeholder:text-gray-500"
                  placeholder="At least 8 characters"
                />
              </label>

              {authError && <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{authError}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Working...' : authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="w-full p-6">
        {currentPage === 'home' ? <Home currentUser={currentUser} authToken={authToken} /> : <Settings />}
      </div>
    </main>
  )
}

export default App
