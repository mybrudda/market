import { create } from 'zustand'
import { supabase } from '../supabaseClient'
import { Session, User } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null })
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ initialized: true })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      set({ session: data.session, user: data.user })
    } catch (error) {
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signUp: async (email: string, password: string, userData: any) => {
    try {
      set({ loading: true })
      
      // Sign up the user without email confirmation
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: userData
        }
      })
      if (signUpError) throw signUpError

      if (data.user) {
        // Create a user record
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              ...userData,
              email: email,
              user_type: 'person',
            },
          ])
        if (userError) throw userError

        // Sign in the user immediately after signup
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError

        set({ session: signInData.session, user: signInData.user })
      }
    } catch (error) {
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      set({ session: null, user: null })
    } catch (error) {
      throw error
    } finally {
      set({ loading: false })
    }
  },
})) 