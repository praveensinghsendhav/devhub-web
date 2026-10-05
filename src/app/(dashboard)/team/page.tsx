'use client';

import { Building2, Globe, Mail, Users } from 'lucide-react';
import { Topbar } from '../../../common/components/Topbar';
import { ComingSoon } from '../../../common/components/ComingSoon';
import { Can } from '../../../common/rbac/Can';
import { useAuth } from '../../../features/auth/useAuth';
import { useGetCurrentOrganizationQuery } from '../../../features/organization/organizationApi';
import { InviteForm } from '../../../features/organization/components/InviteForm';
import { InviteList } from '../../../features/organization/components/InviteList';
import { MemberList } from '../../../features/organization/components/MemberList';

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elevated p-5 sm:p-6">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const hasOrganization = Boolean(user?.organization);
  const { data: organization } = useGetCurrentOrganizationQuery(undefined, {
    skip: !hasOrganization,
  });

  if (!user) return null;

  if (!hasOrganization) {
    return (
      <>
        <Topbar title="Team" />
        <ComingSoon
          icon={Users}
          title="No organization on this account"
          description="This is a platform-level account. Register an organization to invite a team."
        />
      </>
    );
  }

  return (
    <>
      <Topbar title="Team" />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
          {/* Organization summary */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-bg-elevated to-accent/10 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-primary-foreground">
                {(organization?.name ?? user.organization!.name).charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-text">
                  {organization?.name ?? user.organization!.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-text-muted">
                  {organization?.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> {organization.email}
                    </span>
                  )}
                  {organization?.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-text"
                    >
                      <Globe className="h-4 w-4" />
                      {organization.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {(organization?.industry || organization?.size) && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      {[organization.industry, organization.size && `${organization.size} people`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Can permission="users:manage">
            <Section
              title="Invite teammates"
              description="Create a secure link for each person, then send it to them yourself. They use it to set a password and join."
            >
              <InviteForm />
            </Section>
            <Section title="Invites" description="Pending links can be revoked at any time.">
              <InviteList />
            </Section>
          </Can>

          <Section title="Members">
            <MemberList currentUserId={user.id} />
          </Section>
        </div>
      </div>
    </>
  );
}
