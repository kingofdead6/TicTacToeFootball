import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from './api.js'

const ProfileContext = createContext(null)

const GUEST_KEY = 'ttf.guestName'
const readGuest = () => {
  try {
    return localStorage.getItem(GUEST_KEY) ?? ''
  } catch {
    return ''
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dbAvailable, setDbAvailable] = useState(null) // null = unknown
  const [guestName, setGuestNameState] = useState(readGuest)
  const [modalOpen, setModalOpen] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const health = await api.health()
      setDbAvailable(!!health.db)
      if (!health.db || !tokenStore.get()) {
        setProfile(null)
        return
      }
      setProfile(await api.me())
    } catch (e) {
      // Token no longer valid (e.g. database was reset): forget it
      if (e.status === 401) tokenStore.set(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = async (username, avatar) => {
    const { token, profile: p } = await api.createProfile(username, avatar)
    tokenStore.set(token)
    setProfile(p)
    return p
  }

  const updateAvatar = async (avatar) => setProfile({ ...(await api.updateMe({ avatar })), rank: profile?.rank })

  // Sign in on another device with the key copied from the profile card
  const restore = async (key) => {
    const previous = tokenStore.get()
    tokenStore.set(key.trim())
    try {
      const p = await api.me()
      setProfile(p)
      return p
    } catch (e) {
      tokenStore.set(previous)
      throw new Error(e.status === 401 ? 'That key does not match any player card' : e.message)
    }
  }

  const logout = () => {
    tokenStore.set(null)
    setProfile(null)
  }

  const setGuestName = (n) => {
    setGuestNameState(n)
    try {
      localStorage.setItem(GUEST_KEY, n)
    } catch {
      /* ignore */
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        dbAvailable,
        guestName,
        setGuestName,
        create,
        restore,
        refresh,
        logout,
        updateAvatar,
        modalOpen,
        openModal: () => setModalOpen(true),
        closeModal: () => setModalOpen(false),
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
