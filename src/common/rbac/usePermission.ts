'use client';

import { useMemo } from 'react';
import type { Permission } from '@devhub/shared-types';
import { hasAnyPermission, hasPermission } from '@devhub/shared-types';
import { useAppSelector } from '../../store/hooks';

/**
 * The single place the UI asks "can the current user do X". Permissions come straight from
 * `/auth/me` (via the auth slice) — nothing here recomputes them from a role name, so there is
 * exactly one RBAC decision path shared by every component, route guard, and nav item.
 */
export function usePermissions(): Permission[] {
  return useAppSelector((state) => state.auth.user?.permissions ?? []);
}

export function useCan(required: Permission | Permission[]): boolean {
  const permissions = usePermissions();
  return useMemo(() => hasPermission(permissions, required), [permissions, required]);
}

export function useCanAny(required: Permission[]): boolean {
  const permissions = usePermissions();
  return useMemo(() => hasAnyPermission(permissions, required), [permissions, required]);
}
