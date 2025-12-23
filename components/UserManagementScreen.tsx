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
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Check, Shield, ShieldOff, User, Clock, Filter, ArrowLeft } from 'lucide-react';

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
              <Button variant="secondary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Zpět
              </Button>
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
        onBack={onBack}
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
            <Filter className="w-5 h-5" />
            Filtrovat uživatele:
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              Všechny ({users.length})
            </Button>
            <Button
              variant={filter === 'pending' ? 'primary' : 'secondary'}
              onClick={() => setFilter('pending')}
              size="sm"
            >
              Čekající ({users.filter(u => !u.approved).length})
            </Button>
            <Button
              variant={filter === 'admins' ? 'primary' : 'secondary'}
              onClick={() => setFilter('admins')}
              size="sm"
            >
              Admini ({users.filter(u => u.role === UserRole.ADMIN).length})
            </Button>
            <Button
              variant={filter === 'users' ? 'primary' : 'secondary'}
              onClick={() => setFilter('users')}
              size="sm"
            >
              Uživatelé ({users.filter(u => u.role === UserRole.USER).length})
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Users List */}
      {loading ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Načítání uživatelů...</p>
          </CardBody>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <User className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-600 text-lg">Žádní uživatelé nenalezeni</p>
            <p className="text-gray-500 text-sm mt-2">Zkuste změnit filtr.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(user => (
            <Card key={user.userId}>
              <CardBody>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-800">{user.displayName}</h3>
                      {user.role === UserRole.ADMIN && (
                        <Badge color="purple">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            ADMIN
                          </span>
                        </Badge>
                      )}
                      {!user.approved && (
                        <Badge color="warning">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ČEKÁ NA SCHVÁLENÍ
                          </span>
                        </Badge>
                      )}
                      {user.role === UserRole.USER && user.approved && (
                        <Badge color="gray">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            UŽIVATEL
                          </span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Email: {user.email}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Registrován: {new Date(user.createdAt).toLocaleDateString('cs-CZ')}
                      {user.approvedAt && ` • Schválen: ${new Date(user.approvedAt).toLocaleDateString('cs-CZ')}`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!user.approved && (
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(user.userId)}
                        leftIcon={<Check className="w-4 h-4" />}
                        className="bg-green-600 hover:bg-green-700 text-white focus:ring-green-500"
                      >
                        Schválit
                      </Button>
                    )}
                    {user.role === UserRole.USER && (
                      <Button
                        variant="secondary"
                        onClick={() => handleRoleChange(user.userId, UserRole.ADMIN)}
                        leftIcon={<Shield className="w-4 h-4" />}
                      >
                        Nastavit jako Admin
                      </Button>
                    )}
                    {user.role === UserRole.ADMIN && user.userId !== currentUser?.uid && (
                      <Button
                        variant="danger"
                        onClick={() => handleRoleChange(user.userId, UserRole.USER)}
                        leftIcon={<ShieldOff className="w-4 h-4" />}
                      >
                        Odebrat Admin
                      </Button>
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

