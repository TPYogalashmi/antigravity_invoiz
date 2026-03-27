import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const TOKEN_KEY = import.meta.env.VITE_TOKEN_KEY || 'vbcrm_token'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      // ── Set token + user after login
      setAuth: ({ token, user }) => {
        set({ token, user, isAuthenticated: true })
      },

      // ── Update user profile fields
      updateUser: (fields) => {
        set((state) => ({ user: { ...state.user, ...fields } }))
      },

      // ── Clear all auth state
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },

      // ── Selectors (convenience)
      getToken: () => get().token,
      getUser:  () => get().user,
    }),
    {
      name: TOKEN_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)