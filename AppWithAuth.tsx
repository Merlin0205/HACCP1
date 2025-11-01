/**
 * AppWithAuth - Wrapper s Firebase Authentication
 * 
 * Zajišťuje autentifikaci před zobrazením hlavní aplikace
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import App from './App';
import { Spinner } from './components/Spinner';

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

  if (loading) {
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

  // Pokud je přihlášen, zobraz hlavní aplikaci
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

