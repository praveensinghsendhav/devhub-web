'use client';

import { useCallback } from 'react';
import type {
  AcceptInviteRequest,
  LoginRequest,
  RegisterOrganizationRequest,
} from '@devhub/shared-types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getDeviceName } from '../../common/lib/deviceId';
import { setCredentials, setUnauthenticated } from './authSlice';
import { useLoginMutation, useLogoutMutation } from './authApi';
import {
  useAcceptInviteMutation,
  useRegisterOrganizationMutation,
} from '../organization/organizationApi';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector((state) => state.auth);
  const [loginMutation, loginState] = useLoginMutation();
  const [registerMutation, registerState] = useRegisterOrganizationMutation();
  const [acceptInviteMutation, acceptInviteState] = useAcceptInviteMutation();
  const [logoutMutation] = useLogoutMutation();
  // Session restore happens once in <AuthBootstrap />; this hook only reads and acts on auth state.

  const login = useCallback(
    async (credentials: Omit<LoginRequest, 'deviceName'>) => {
      const result = await loginMutation({ ...credentials, deviceName: getDeviceName() }).unwrap();
      dispatch(setCredentials(result));
      return result;
    },
    [dispatch, loginMutation],
  );

  const register = useCallback(
    async (input: Omit<RegisterOrganizationRequest, 'deviceName'>) => {
      const result = await registerMutation({ ...input, deviceName: getDeviceName() }).unwrap();
      dispatch(setCredentials(result));
      return result;
    },
    [dispatch, registerMutation],
  );

  const acceptInvite = useCallback(
    async (input: Omit<AcceptInviteRequest, 'deviceName'>) => {
      const result = await acceptInviteMutation({
        ...input,
        deviceName: getDeviceName(),
      }).unwrap();
      dispatch(setCredentials(result));
      return result;
    },
    [dispatch, acceptInviteMutation],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } finally {
      dispatch(setUnauthenticated());
    }
  }, [dispatch, logoutMutation]);

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'idle' || status === 'loading',
    login,
    register,
    acceptInvite,
    logout,
    loginError: loginState.error,
    isLoggingIn: loginState.isLoading,
    isRegistering: registerState.isLoading,
    isAcceptingInvite: acceptInviteState.isLoading,
  };
}
