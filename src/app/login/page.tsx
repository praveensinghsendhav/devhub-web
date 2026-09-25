'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '../../features/auth/useAuth';
import { AuthShell } from '../../features/auth/AuthShell';
import { PasswordField } from '../../features/auth/PasswordField';
import { extractErrorMessage } from '../../store/apiBase';
import { Input } from '../../common/components/Input';
import { Button } from '../../common/components/Button';
import { FullScreenSpinner } from '../../common/components/FullScreenSpinner';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace('/chat');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <FullScreenSpinner />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login({ email, password });
      router.replace('/chat');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to chat, whiteboard, and meet with your team."
      footer={
        <>
          New to DevHub?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register your organization
          </Link>
          <p className="mt-2 text-xs">
            Joining a team? Use the invite link from your email to set your password.
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoFocus
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" size="lg" disabled={isLoggingIn} className="mt-2">
          {isLoggingIn ? 'Signing in…' : 'Log in'}
        </Button>
      </form>
    </AuthShell>
  );
}
