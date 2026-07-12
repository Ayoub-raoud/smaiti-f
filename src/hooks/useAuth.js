import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkStaff(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkStaff(session.user.id);
      } else {
        setIsStaff(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkStaff = async (userId) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'employee']);
    
    setIsStaff(data && data.length > 0);
    setLoading(false);
  };

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isStaff, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}