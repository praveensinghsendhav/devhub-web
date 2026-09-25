'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../common/components/Input';
import { cn } from '../../common/lib/cn';

/** Mirrors the API's password rules so users see what's missing before they submit. */
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'Contains a letter', test: (value: string) => /[a-zA-Z]/.test(value) },
  { label: 'Contains a number', test: (value: string) => /[0-9]/.test(value) },
];

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  value: string;
  showRules?: boolean;
  error?: string;
}

export function PasswordField({ label, value, showRules, error, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          label={label}
          type={visible ? 'text' : 'password'}
          value={value}
          error={error}
          className="w-full pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-8 right-2 flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showRules && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(value);
            return (
              <li
                key={rule.label}
                className={cn(
                  'flex items-center gap-1 text-xs transition-colors',
                  passed ? 'text-online' : 'text-text-muted',
                )}
              >
                <Check className={cn('h-3 w-3', !passed && 'opacity-30')} />
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
