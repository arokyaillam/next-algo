'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, AuthError } from '@supabase/supabase-js'

// Type definitions
interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, userData?: any) => Promise<{ data: any; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signInWithGoogle: () => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  getUserProfile: () => Promise<{ data: any; error: any }>
  updateProfile: (profileData: any) => Promise<{ data: any; error: any }>
}

// Create context with default value
const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [supabase])

  // Sign Up with profile data
  const signUp = async (email: string, password: string, userData: any = {}) => {
    return await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: userData
      }
    })
  }

  // Sign In with email/password
  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  // Sign In with Google
  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
  }

  // Sign Out
  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  // Get user profile data
  const getUserProfile = async () => {
    if (!user) return { data: null, error: 'No user logged in' }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    return { data, error }
  }

  // Update user profile
  const updateProfile = async (profileData: any) => {
    if (!user) return { data: null, error: 'No user logged in' }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
    
    return { data, error }
  }

  const value: AuthContextType = { 
    user, 
    loading, 
    signUp, 
    signIn, 
    signInWithGoogle, 
    signOut,
    getUserProfile,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}