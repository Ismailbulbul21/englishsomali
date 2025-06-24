import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    signUp: async (email, password, metadata) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      
      // BYPASS: Auto-confirm email after successful signup
      if (data.user && !error) {
        try {
          // Use our custom function to confirm email
          await supabase.rpc('confirm_user_email', { user_id: data.user.id })
          
          // Create user profile immediately
          await supabase.from('user_profiles').insert({
            user_id: data.user.id,
            full_name: metadata.full_name || '',
            preferred_language: 'so',
            created_at: new Date().toISOString()
          })
          
          console.log('✅ User confirmed and profile created')
          
          // Force refresh the session to get the confirmed user
          await supabase.auth.refreshSession()
        } catch (confirmError) {
          console.error('Confirmation bypass error:', confirmError)
        }
      }
      
      return { data, error }
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      return { error }
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 