/**
 * Hook pro získání role aktuálního uživatele
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserMetadata } from '../services/firestore/users';
import { UserRole } from '../types';

export interface UseUserRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  approved: boolean;
  loading: boolean;
  userMetadata: any;
}

export function useUserRole(): UseUserRoleReturn {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userMetadata, setUserMetadata] = useState<any>(null);

  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) {
        setRole(null);
        setApproved(false);
        setLoading(false);
        setUserMetadata(null);
        return;
      }

      try {
        const metadata = await fetchUserMetadata(currentUser.uid);
        if (metadata) {
          setRole(metadata.role);
          setApproved(metadata.approved);
          setUserMetadata(metadata);
        } else {
          setRole(null);
          setApproved(false);
        }
      } catch (error) {
        console.error('[useUserRole] Error loading user role:', error);
        setRole(null);
        setApproved(false);
      } finally {
        setLoading(false);
      }
    };

    loadUserRole();
  }, [currentUser]);

  return {
    role,
    isAdmin: role === UserRole.ADMIN,
    approved,
    loading,
    userMetadata
  };
}

