/**
 * WaitingForApprovalScreen - Screen pro uživatele čekající na schválení (iDoklad redesign)
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserMetadata } from '../types';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

interface WaitingForApprovalScreenProps {
  userMetadata: UserMetadata;
}

export const WaitingForApprovalScreen: React.FC<WaitingForApprovalScreenProps> = ({ userMetadata }) => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Čekáte na schválení</h1>
            <p className="text-gray-600">
              Váš účet musí být schválen administrátorem před přístupem k aplikaci.
            </p>
          </div>

          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardBody>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informace o vašem účtu:</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Jméno:</span>
                  <span className="text-gray-900 font-semibold">{userMetadata.displayName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="text-gray-900 font-semibold">{userMetadata.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                    Čeká na schválení
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-yellow-50 border-yellow-200 mb-6">
            <CardBody>
              <p className="text-sm text-yellow-800">
                <strong>Poznámka:</strong> Po schválení vašeho účtu administrátorem budete moci přistupovat k aplikaci.
                Prosím kontaktujte administrátora nebo počkejte na schválení.
              </p>
            </CardBody>
          </Card>

          <Button
            variant="ghost"
            onClick={signOut}
            fullWidth
          >
            Odhlásit se
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

export default WaitingForApprovalScreen;
