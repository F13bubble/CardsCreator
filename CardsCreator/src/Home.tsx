import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type CurrentUser = {
  id: number
  email: string
  username: string
  is_active: boolean
}

type HomeProps = {
  currentUser: CurrentUser | null
  authToken: string | null
}

type GroupCard = {
  id: number
  name: string
  description: string
  members: number
  totalCards: number
  userOwned: number
  rarestCard: string
  recentPickups: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function Home({ currentUser, authToken }: HomeProps) {
  const [groups, setGroups] = useState<GroupCard[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })
  const [groupError, setGroupError] = useState<string | null>(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  useEffect(() => {
    if (!currentUser || !authToken) {
      setGroups([])
      return
    }

    let isCancelled = false

    const loadGroups = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/groups`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Unable to load groups')
        }

        const data = (await response.json().catch(() => [])) as Array<{ id: number; name: string; description: string }>

        if (isCancelled) {
          return
        }

        setGroups(
          Array.isArray(data)
            ? data.map((group) => ({
                id: group.id,
                name: group.name,
                description: group.description,
                members: 1,
                totalCards: 0,
                userOwned: 0,
                rarestCard: '—',
                recentPickups: 'Loaded from server',
              }))
            : [],
        )
      } catch {
        if (!isCancelled) {
          setGroups([])
        }
      }
    }

    void loadGroups()

    return () => {
      isCancelled = true
    }
  }, [authToken, currentUser?.id])

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser || !authToken) {
      setGroupError('Please log in before creating a group.')
      return
    }

    const trimmedName = groupForm.name.trim()
    const trimmedDescription = groupForm.description.trim()

    if (trimmedName.length < 3) {
      setGroupError('Group name must be at least 3 characters long.')
      return
    }

    if (trimmedDescription.length < 5) {
      setGroupError('Description must be at least 5 characters long.')
      return
    }

    setIsCreatingGroup(true)
    setGroupError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          created_by: currentUser.username || currentUser.email,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not create group')
      }

      const createdGroup = data as Partial<GroupCard> & { id?: number; name?: string; description?: string }

      setGroups((currentGroups) => [
        {
          id: createdGroup.id ?? Date.now(),
          name: createdGroup.name ?? trimmedName,
          description: createdGroup.description ?? trimmedDescription,
          members: 1,
          totalCards: 0,
          userOwned: 0,
          rarestCard: '—',
          recentPickups: 'Just created',
        },
        ...currentGroups,
      ])

      setGroupForm({ name: '', description: '' })
      setIsCreateModalOpen(false)
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : 'Could not create group')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.2),transparent_35%),linear-gradient(135deg,#020617_0%,#111827_45%,#0f172a_100%)] py-10">
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
          <div className="w-full max-w-lg rounded-4xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">New group</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Create a new collection group</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setGroupError(null)
                  setGroupForm({ name: '', description: '' })
                }}
                className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleCreateGroup}>
              <label className="block text-sm text-gray-300">
                <span className="mb-1 block">Group name</span>
                <input
                  type="text"
                  required
                  value={groupForm.name}
                  onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none placeholder:text-gray-500"
                  placeholder="e.g. Weekend collectors"
                />
              </label>

              <label className="block text-sm text-gray-300">
                <span className="mb-1 block">Description</span>
                <textarea
                  required
                  rows={4}
                  value={groupForm.description}
                  onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none placeholder:text-gray-500"
                  placeholder="Describe the purpose of your group"
                />
              </label>

              {groupError && <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{groupError}</p>}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setGroupError(null)
                    setGroupForm({ name: '', description: '' })
                  }}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Collections</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Groups overview</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              setGroupError(null)
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            + Create group
          </button>
        </div>

        <div className="space-y-6">
          {groups.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-emerald-400/30 bg-slate-900/80 p-8 shadow-[0_30px_90px_-40px_rgba(16,185,129,0.7)] backdrop-blur-xl sm:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">No groups yet</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Create your first collection group</h2>
                  <p className="mt-3 text-base leading-7 text-slate-300">
                    You are not part of any group yet. Start by creating one to invite friends, track cards, and share your collection.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupError(null)
                      setIsCreateModalOpen(true)
                    }}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                  >
                    + Create group
                  </button>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400 max-w-70">
                    Groups appear here as soon as you create or join one.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            groups.map((group) => {
              const progress = group.totalCards > 0 ? Math.round((group.userOwned / group.totalCards) * 100) : 0

              return (
              <article
                key={group.id}
                className="overflow-hidden rounded-4xl border border-white/10 bg-slate-900/80 shadow-[0_32px_90px_-35px_rgba(16,185,129,0.45)] backdrop-blur-xl"
              >
                <div className="flex flex-col gap-5 border-b border-white/10 bg-linear-to-r from-emerald-500/20 via-emerald-400/10 to-slate-950/80 px-6 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Group</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{group.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-300">{group.description}</p>
                  </div>
                </div>

                <div className="grid gap-4 p-4 md:p-6 lg:grid-cols-[1.15fr_0.7fr_0.9fr]">
                  <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/70 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold text-white">Group info</h3>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Members</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{group.members}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Cards</p>
                        <p className="mt-1 text-2xl font-semibold text-white">{group.totalCards}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">Rarest</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">{group.rarestCard}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Rarest pull</p>
                      <p className="mt-1 text-lg font-semibold text-white">{group.rarestCard}</p>
                      <p className="mt-1 text-sm text-slate-300">A prized card that players chase during weekly events.</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-linear-to-br from-emerald-500/20 to-slate-800 p-6">
                    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                      <div className="rounded-2xl border border-emerald-400/30 bg-slate-950/70 p-4">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-12 w-12 text-emerald-300">
                          <path d="M6 6h15l-1.5 9h-12L4 4H2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="9" cy="20" r="1" />
                          <circle cx="18" cy="20" r="1" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Marketplace</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Trade and browse</h3>
                        <p className="mt-2 text-sm text-slate-300">Open the group marketplace to discover swaps, offers, and fresh pickups.</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-100"
                      >
                        Open marketplace
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Your collection</p>
                        <h3 className="mt-1 text-xl font-semibold text-white">Your cards</h3>
                      </div>
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                        {group.userOwned}/{group.totalCards}
                      </span>
                    </div>

                    <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Collection progress</span>
                        <span className="font-semibold text-white">{progress}%</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-linear-to-r from-emerald-400 to-cyan-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      <p className="font-medium text-white">Recent activity</p>
                      <p className="mt-1">{group.recentPickups}</p>
                    </div>
                  </div>
                </div>
              </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

export default Home;