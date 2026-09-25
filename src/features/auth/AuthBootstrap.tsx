'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setAuthLoading, setCredentials, setUnauthenticated } from './authSlice';
import { useBootstrapSessionMutation } from './authApi';

/**
 * Resumes the session from the refresh cookie exactly once per page load. Rendered once at the
 * root — `useAuth()` only reads the result, so mounting many consumers never fires extra
 * `/auth/refresh` calls (which would rotate the token out from under each other).
 */
export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const [bootstrapSession] = useBootstrapSessionMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    dispatch(setAuthLoading());
    bootstrapSession()
      .unwrap()
      .then((result) => dispatch(setCredentials(result)))
      .catch(() => dispatch(setUnauthenticated()));
  }, [dispatch, bootstrapSession]);

  return null;
}
