/**
 * AppWithAuth - Wrapper s Firebase Authentication
 * 
 * Zajišťuje autentifikaci před zobrazením hlavní aplikace
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import WaitingForApprovalScreen from './components/WaitingForApprovalScreen';
import App from './App';
import Spinner from './components/Spinner';
import { fetchUserMetadata } from './services/firestore/users';
import { UserMetadata } from './types';

/**
 * Komponenta pro přepínání mezi přihlášením a registrací
 */
const AuthScreens: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />;
  }

  return <LoginScreen onSwitchToRegister={() => setShowRegister(true)} />;
};

/**
 * Komponenta s autentifikační logikou
 */
const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Načíst user metadata po přihlášení
  useEffect(() => {
    const loadUserMetadata = async () => {
      if (!currentUser) {
        setUserMetadata(null);
        setLoadingMetadata(false);
        return;
      }

      try {
        let metadata = await fetchUserMetadata(currentUser.uid);
        
        // Pokud uživatel nemá metadata, vytvořit ho (pro existující uživatele)
        if (!metadata) {
          const { createUserMetadata } = await import('./services/firestore/users');
          await createUserMetadata(
            currentUser.uid,
            currentUser.email || '',
            currentUser.displayName || 'Uživatel'
          );
          // Znovu načíst
          metadata = await fetchUserMetadata(currentUser.uid);
        }
        
        setUserMetadata(metadata);
      } catch (error) {
        console.error('[AppContent] Error loading user metadata:', error);
        // Pokud selže načtení, vytvořit user document (pokud ještě neexistuje)
        try {
          const { createUserMetadata } = await import('./services/firestore/users');
          await createUserMetadata(
            currentUser.uid,
            currentUser.email || '',
            currentUser.displayName || 'Uživatel'
          );
          // Znovu načíst
          const metadata = await fetchUserMetadata(currentUser.uid);
          setUserMetadata(metadata);
        } catch (createError) {
          console.error('[AppContent] Error creating user metadata:', createError);
          // Pokud ani vytvoření nefunguje, nastavit jako null (zobrazí se waiting screen)
          setUserMetadata(null);
        }
      } finally {
        setLoadingMetadata(false);
      }
    };

    loadUserMetadata();
  }, [currentUser]);

  if (loading || loadingMetadata) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Pokud není přihlášen, zobraz přihlašovací obrazovku
  if (!currentUser) {
    return <AuthScreens />;
  }

  // Pokud uživatel není schválen (nebo metadata je null), zobraz waiting screen
  if (!userMetadata || !userMetadata.approved) {
    // Pokud máme metadata, zobrazit waiting screen s informacemi
    if (userMetadata) {
      return <WaitingForApprovalScreen userMetadata={userMetadata} />;
    }
    // Pokud nemáme metadata, zobrazit jednoduchou zprávu
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-red-700 mb-4">Čekáte na schválení</h1>
          <p className="text-gray-700 mb-6">
            Váš účet byl úspěšně vytvořen, ale čeká na schválení administrátorem.
          </p>
        </div>
      </div>
    );
  }

  // Pokud je přihlášen a schválen, zobraz hlavní aplikaci
  return <App />;
};

/**
 * Root komponenta s AuthProvider
 */
export const AppWithAuth: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default AppWithAuth;

