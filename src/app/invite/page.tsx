'use client';

import { Suspense, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Building2, LinkIcon, Mail } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { AuthShell } from '../../features/auth/AuthShell';
import { PasswordField, isPasswordValid } from '../../features/auth/PasswordField';
import { usePreviewInviteQuery } from '../../features/organization/organizationApi';
import { extractErrorMessage } from '../../store/apiBase';
import { Input } from '../../common/components/Input';
import { Button } from '../../common/components/Button';
import { FullScreenSpinner } from '../../common/components/FullScreenSpinner';

const ROLE_LABELS = { ADMIN: 'Admin', MEMBER: 'Member', GUEST: 'Guest' } as const;

function InvalidInvite({ message }: { message: string }) {
  return (
    <AuthShell
      title="This invite can’t be used"
      subtitle={message}
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Go to log in
        </Link>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated p-4 text-sm text-text-muted">
        <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-busy" />
        Invite links are single-use and expire after a few days. Ask your organization admin to send
        you a new one.
      </div>
    </AuthShell>
  );
}

function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const { user, isAuthenticated, isLoading, acceptInvite, logout, isAcceptingInvite } = useAuth();
  const preview = usePreviewInviteQuery(token, { skip: !token });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; password?: string; confirm?: string }>({});
  const accepted = useRef(false);

  if (!token) return <InvalidInvite message="The link is missing its invite code." />;
  if (isLoading || preview.isLoading) return <FullScreenSpinner />;
  if (preview.isError || !preview.data) {
    return <InvalidInvite message={extractErrorMessage(preview.error)} />;
  }

  const invite = preview.data;

  if (isAuthenticated && !accepted.current) {
    return (
      <AuthShell
        title={`Join ${invite.organization.name}`}
        subtitle={
          <>
            You’re currently signed in as <strong className="text-text">{user?.email}</strong>. Log
            out to accept this invite for <strong className="text-text">{invite.email}</strong>.
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => router.push('/chat')}>
            Back to app
          </Button>
          <Button size="lg" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </AuthShell>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Enter your full name';
    if (!isPasswordValid(password)) next.password = 'Password doesn’t meet the rules below';
    if (password !== confirmPassword) next.confirm = 'Passwords don’t match';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      accepted.current = true;
      await acceptInvite({ token, name: name.trim(), password });
      toast.success(`Welcome to ${invite.organization.name}!`);
      router.replace('/chat');
    } catch (error) {
      accepted.current = false;
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <AuthShell
      title={`Join ${invite.organization.name}`}
      subtitle={
        invite.invitedByName
          ? `${invite.invitedByName} invited you to DevHub. Set a password to finish creating your account.`
          : 'You’ve been invited to DevHub. Set a password to finish creating your account.'
      }
    >
      <div className="mb-6 grid gap-2 rounded-xl border border-border bg-bg-elevated p-4 text-sm">
        <p className="flex items-center gap-2 text-text">
          <Building2 className="h-4 w-4 text-accent" /> {invite.organization.name}
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            {ROLE_LABELS[invite.role]}
          </span>
        </p>
        <p className="flex items-center gap-2 text-text-muted">
          <Mail className="h-4 w-4" /> {invite.email}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Email" type="email" value={invite.email} readOnly disabled />
        <Input
          label="Your full name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((c) => ({ ...c, name: undefined }));
          }}
          autoComplete="name"
          placeholder="Jordan Lee"
          error={errors.name}
          autoFocus
        />
        <PasswordField
          label="Create password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((c) => ({ ...c, password: undefined }));
          }}
          autoComplete="new-password"
          error={errors.password}
          showRules
        />
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((c) => ({ ...c, confirm: undefined }));
          }}
          autoComplete="new-password"
          error={errors.confirm}
        />
        <Button type="submit" size="lg" disabled={isAcceptingInvite} className="mt-2">
          {isAcceptingInvite ? 'Joining…' : `Join ${invite.organization.name}`}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function InvitePage() {
  // useSearchParams needs a Suspense boundary so the route can still be statically rendered.
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <AcceptInvite />
    </Suspense>
  );
}
