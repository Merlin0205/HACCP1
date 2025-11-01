/**
 * AuthContext - React Context pro Firebase Authentication
 * 
 * Poskytuje autentifikační stav a metody pro celou aplikaci
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { toast } from '../utils/toast';
import { createUserMetadata } from '../services/firestore/users';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Hook pro použití AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * AuthProvider - poskytuje autentifikační kontext
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Registrace nového uživatele
   */
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Nastavit display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        
        // Vytvořit user metadata v Firestore
        await createUserMetadata(userCredential.user.uid, email, displayName);
      }
      
      toast.success('Účet byl úspěšně vytvořen!');
    } catch (error: any) {
      console.error('[Auth] Sign up error:', error);
      
      // Uživatelsky přívětivé chybové hlášky
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Tento email je již používán');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Heslo musí mít alespoň 6 znaků');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Neplatný formát emailu');
      } else {
        throw new Error('Chyba při registraci: ' + error.message);
      }
    }
  };

  /**
   * Přihlášení uživatele
   */
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Úspěšně přihlášen!');
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Nesprávný email nebo heslo');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Neplatný formát emailu');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Příliš mnoho pokusů. Zkuste to později.');
      } else {
        throw new Error('Chyba při přihlášení: ' + error.message);
      }
    }
  };

  /**
   * Přihlášení přes Google
   */
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      
      // Pokud uživatel neexistuje v users collection, vytvořit ho
      if (userCredential.user) {
        const { fetchUserMetadata, createUserMetadata } = await import('../services/firestore/users');
        const existingUser = await fetchUserMetadata(userCredential.user.uid);
        
        if (!existingUser) {
          // Nový uživatel přes Google - vytvořit metadata
          await createUserMetadata(
            userCredential.user.uid,
            userCredential.user.email || '',
            userCredential.user.displayName || 'Uživatel'
          );
        }
      }
      
      toast.success('Úspěšně přihlášen přes Google!');
    } catch (error: any) {
      console.error('[Auth] Google sign in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Přihlášení bylo zrušeno');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup byl zablokován prohlížečem');
      } else {
        throw new Error('Chyba při přihlášení přes Google: ' + error.message);
      }
    }
  };

  /**
   * Odhlášení uživatele
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success('Úspěšně odhlášen');
    } catch (error: any) {
      console.error('[Auth] Sign out error:', error);
      throw new Error('Chyba při odhlášení: ' + error.message);
    }
  };

  /**
   * Reset hesla
   */
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Email pro reset hesla byl odeslán');
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('Uživatel s tímto emailem neexistuje');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Neplatný formát emailu');
      } else {
        throw new Error('Chyba při resetování hesla: ' + error.message);
      }
    }
  };

  /**
   * Sledování změn autentifikačního stavu
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

