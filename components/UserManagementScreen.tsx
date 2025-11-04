/**
 * UserManagementScreen - Správa uživatelů (pouze pro adminy)
 */

import React, { useState, useEffect } from 'react';
import { UserMetadata, UserRole } from '../types';
import { fetchAllUsers, approveUser, updateUserRole } from '../services/firestore/users';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { SECTION_THEMES } from '../constants/designSystem';
import { AppState } from '../types';
import { BackButton } from './BackButton';
import { Card, CardBody } from './ui/Card';

interface UserManagementScreenProps {
  onBack: () => void;
}

type FilterType = 'all' | 'pending' | 'admins' | 'users';

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { isAdmin } = useUserRole();
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        const allUsers = await fetchAllUsers();
        setUsers(allUsers);
      } catch (error) {
        console.error('[UserManagementScreen] Error loading users:', error);
        toast.error('Chyba při načítání uživatelů');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isAdmin]);

  const handleApprove = async (userId: string) => {
    if (!currentUser) return;

    try {
      await approveUser(userId, currentUser.uid);
      toast.success('Uživatel byl schválen');
      
      // Aktualizovat lokální state
      setUsers(prev => prev.map(u => 
        u.userId === userId 
          ? { ...u, approved: true, approvedAt: new Date().toISOString(), approvedBy: currentUser.uid }
          : u
      ));
    } catch (error) {
      console.error('[UserManagementScreen] Error approving user:', error);
      toast.error('Chyba při schvalování uživatele');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      toast.success(`Role byla změněna na ${newRole === UserRole.ADMIN ? 'admin' : 'uživatel'}`);
      
      // Aktualizovat lokální state
      setUsers(prev => prev.map(u => 
        u.userId === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('[UserManagementScreen] Error changing role:', error);
      toast.error('Chyba při změně role');
    }
  };

  const filteredUsers = users.filter(user => {
    switch (filter) {
      case 'pending':
        return !user.approved;
      case 'admins':
        return user.role === UserRole.ADMIN;
      case 'users':
        return user.role === UserRole.USER;
      default:
        return true;
    }
  });

  if (!isAdmin) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <Card>
          <CardBody>
            <p className="text-red-600">Nemáte oprávnění k přístupu k této sekci.</p>
            <div className="mt-4">
              <BackButton onClick={onBack} />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.SETTINGS]}
        title="Správa uživatelů"
        description="Schvalování uživatelů a správa rolí"
        action={<BackButton onClick={onBack} />}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Všechny ({users.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Čekající ({users.filter(u => !u.approved).length})
            </button>
            <button
              onClick={() => setFilter('admins')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'admins' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Admini ({users.filter(u => u.role === UserRole.ADMIN).length})
            </button>
            <button
              onClick={() => setFilter('users')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Uživatelé ({users.filter(u => u.role === UserRole.USER).length})
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Users List */}
      {loading ? (
        <Card>
          <CardBody className="text-center">
            <p className="text-gray-600">Načítání uživatelů...</p>
          </CardBody>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardBody className="text-center">
            <p className="text-gray-600">Žádní uživatelé nenalezeni</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(user => (
            <Card key={user.userId}>
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{user.displayName}</h3>
                      {user.role === UserRole.ADMIN && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
                          ADMIN
                        </span>
                      )}
                      {!user.approved && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          ČEKÁ NA SCHVÁLENÍ
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Email: {user.email}</p>
                    <p className="text-gray-500 text-xs">
                      Registrován: {new Date(user.createdAt).toLocaleDateString('cs-CZ')}
                      {user.approvedAt && ` • Schválen: ${new Date(user.approvedAt).toLocaleDateString('cs-CZ')}`}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!user.approved && (
                      <button
                        onClick={() => handleApprove(user.userId)}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Schválit
                      </button>
                    )}
                    {user.role === UserRole.USER && (
                      <button
                        onClick={() => handleRoleChange(user.userId, UserRole.ADMIN)}
                        className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Nastavit jako Admin
                      </button>
                    )}
                    {user.role === UserRole.ADMIN && user.userId !== currentUser?.uid && (
                      <button
                        onClick={() => handleRoleChange(user.userId, UserRole.USER)}
                        className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Odebrat Admin
                      </button>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagementScreen;

