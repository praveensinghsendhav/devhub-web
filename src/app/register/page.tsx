'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Building2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ORGANIZATION_SIZES, type OrganizationSize } from '@devhub/shared-types';
import { useAuth } from '../../features/auth/useAuth';
import { AuthShell } from '../../features/auth/AuthShell';
import { PasswordField, isPasswordValid } from '../../features/auth/PasswordField';
import { extractErrorMessage } from '../../store/apiBase';
import { Input } from '../../common/components/Input';
import { Button } from '../../common/components/Button';
import { FullScreenSpinner } from '../../common/components/FullScreenSpinner';
import { cn } from '../../common/lib/cn';

const INDUSTRIES = [
  'Software & SaaS',
  'Agency & consulting',
  'E-commerce',
  'Finance & fintech',
  'Healthcare',
  'Education',
  'Gaming & media',
  'Other',
];

const STEPS = [
  { icon: Building2, label: 'Organization' },
  { icon: UserRound, label: 'Your account' },
];

const selectClass =
  'h-11 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30';

interface FormState {
  orgName: string;
  website: string;
  industry: string;
  size: OrganizationSize | '';
  country: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL: FormState = {
  orgName: '',
  website: '',
  industry: '',
  size: '',
  country: '',
  ownerName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

function normalizeWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, isRegistering } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  // Set once registration succeeds, so the "already signed in" redirect doesn't override /team.
  const justRegistered = useRef(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !justRegistered.current) router.replace('/chat');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <FullScreenSpinner />;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateOrganization(): boolean {
    const next: typeof errors = {};
    if (form.orgName.trim().length < 2) next.orgName = 'Enter your organization’s name';
    const website = normalizeWebsite(form.website);
    if (website) {
      try {
        new URL(website);
      } catch {
        next.website = 'Enter a valid website';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateAccount(): boolean {
    const next: typeof errors = {};
    if (form.ownerName.trim().length < 2) next.ownerName = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address';
    if (!isPasswordValid(form.password)) next.password = 'Password doesn’t meet the rules below';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords don’t match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === 0) {
      if (validateOrganization()) setStep(1);
      return;
    }
    if (!validateAccount()) return;

    try {
      justRegistered.current = true;
      await register({
        organization: {
          name: form.orgName.trim(),
          website: normalizeWebsite(form.website),
          industry: form.industry || undefined,
          size: form.size || undefined,
          country: form.country.trim() || undefined,
        },
        owner: {
          name: form.ownerName.trim(),
          email: form.email.trim(),
          password: form.password,
        },
      });
      toast.success(`${form.orgName.trim()} is ready — invite your team next`);
      router.replace('/team');
    } catch (error) {
      justRegistered.current = false;
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <AuthShell
      title="Register your organization"
      subtitle="Create a private DevHub space for your team. You’ll be its first admin."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {/* Stepper */}
      <ol className="mb-8 grid grid-cols-2 gap-2">
        {STEPS.map(({ icon: Icon, label }, index) => (
          <li
            key={label}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors',
              index === step
                ? 'border-primary/50 bg-primary/10 text-text'
                : index < step
                  ? 'border-border text-text'
                  : 'border-border text-text-muted',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                index <= step ? 'bg-primary text-primary-foreground' : 'bg-bg-hover',
              )}
            >
              {index + 1}
            </span>
            <Icon className="h-4 w-4" />
            {label}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} noValidate>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 ? (
            <motion.div
              key="org"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <Input
                label="Organization name *"
                value={form.orgName}
                onChange={(e) => update('orgName', e.target.value)}
                placeholder="Acme Engineering"
                autoComplete="organization"
                error={errors.orgName}
                autoFocus
              />
              <Input
                label="Website"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="acme.dev"
                autoComplete="url"
                error={errors.website}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-muted">Industry</span>
                  <select
                    className={selectClass}
                    value={form.industry}
                    onChange={(e) => update('industry', e.target.value)}
                  >
                    <option value="">Select…</option>
                    {INDUSTRIES.map((industry) => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-muted">Team size</span>
                  <select
                    className={selectClass}
                    value={form.size}
                    onChange={(e) => update('size', e.target.value as OrganizationSize | '')}
                  >
                    <option value="">Select…</option>
                    {ORGANIZATION_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} people
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                placeholder="India"
                autoComplete="country-name"
              />
              <Button type="submit" size="lg" className="mt-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="account"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <Input
                label="Your full name *"
                value={form.ownerName}
                onChange={(e) => update('ownerName', e.target.value)}
                placeholder="Jordan Lee"
                autoComplete="name"
                error={errors.ownerName}
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Work email *"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="you@acme.dev"
                  autoComplete="email"
                  error={errors.email}
                />
                <p className="text-xs text-text-muted">
                  This is your organization’s main email and your admin login.
                </p>
              </div>
              <PasswordField
                label="Password *"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                autoComplete="new-password"
                error={errors.password}
                showRules
              />
              <PasswordField
                label="Confirm password *"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                autoComplete="new-password"
                error={errors.confirmPassword}
              />
              <div className="mt-2 grid grid-cols-[auto_1fr] gap-3">
                <Button type="button" variant="secondary" size="lg" onClick={() => setStep(0)}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="submit" size="lg" disabled={isRegistering}>
                  {isRegistering ? 'Creating organization…' : 'Create organization'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </AuthShell>
  );
}
