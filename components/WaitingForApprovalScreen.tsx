/**
 * WaitingForApprovalScreen - Screen pro uživatele čekající na schválení
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserMetadata } from '../types';

interface WaitingForApprovalScreenProps {
  userMetadata: UserMetadata;
}

export const WaitingForApprovalScreen: React.FC<WaitingForApprovalScreenProps> = ({ userMetadata }) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Čekáte na schválení</h1>
          <p className="text-gray-600">
            Váš účet musí být schválen administrátorem před přístupem k aplikaci.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informace o vašem účtu:</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Jméno:</span>
              <span className="text-gray-600">{userMetadata.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Email:</span>
              <span className="text-gray-600">{userMetadata.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Status:</span>
              <span className="text-yellow-600 font-semibold">Čeká na schválení</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Poznámka:</strong> Po schválení vašeho účtu administrátorem budete moci přistupovat k aplikaci.
            Prosím kontaktujte administrátora nebo počkejte na schválení.
          </p>
        </div>

        <button
          onClick={signOut}
          className="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Odhlásit se
        </button>
      </div>
    </div>
  );
};

export default WaitingForApprovalScreen;

