'use client';

import type { ReactNode } from 'react';
import type { Permission } from '@devhub/shared-types';
import { useCan } from './usePermission';

interface CanProps {
  permission: Permission | Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

/** Declarative RBAC gate: `<Can permission="chat:manage">...</Can>`. Never branch on `user.roles` directly. */
export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = useCan(permission);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
