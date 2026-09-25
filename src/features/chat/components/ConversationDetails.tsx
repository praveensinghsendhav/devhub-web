'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Calendar,
  Crown,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Conversation, ConversationMember } from '@devhub/shared-types';
import { Modal } from '../../../common/components/Modal';
import { Button } from '../../../common/components/Button';
import { Input } from '../../../common/components/Input';
import { Toggle } from '../../../common/components/Toggle';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import {
  useAddMembersMutation,
  useRemoveMemberMutation,
  useSetMemberRoleMutation,
  useUpdateConversationMutation,
} from '../chatApi';
import { lastSeenLabel, otherMember, useLivePresence } from '../chatHooks';
import { ConversationAvatar, PresenceAvatar } from './ChatAvatar';
import { UserPicker } from './UserPicker';
import { UserProfileModal } from '../../users/UserProfileModal';

function ProfileCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-bg-elevated to-accent/10 p-5 text-center">
      {children}
    </div>
  );
}

function MemberRow({
  member,
  conversation,
  selfId,
}: {
  member: ConversationMember;
  conversation: Conversation;
  selfId: string;
}) {
  const presence = useLivePresence(member);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [setRole] = useSetMemberRoleMutation();
  const [removeMember] = useRemoveMemberMutation();
  const isSelf = member.userId === selfId;
  const canManage = conversation.myRole === 'admin' && conversation.type !== 'direct' && !isSelf;

  async function run(action: () => Promise<unknown>, success: string) {
    setMenuOpen(false);
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  const first = member.name.split(' ')[0];

  return (
    <li
      className="relative flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-bg-hover"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setMenuOpen(false)}
    >
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`View ${member.name}’s profile`}
      >
        <PresenceAvatar member={member} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
            {member.name}
            {isSelf && <span className="text-xs font-normal text-text-muted">(you)</span>}
            {member.userId === conversation.createdBy && conversation.type !== 'direct' && (
              <Crown className="h-3.5 w-3.5 text-away" aria-label="Creator" />
            )}
          </span>
          <span className="block truncate text-xs text-text-muted">
            {presence.customStatus || lastSeenLabel(presence)}
          </span>
        </span>
      </button>
      <UserProfileModal
        user={
          profileOpen
            ? {
                id: member.userId,
                name: member.name,
                email: member.email,
                avatarUrl: member.avatarUrl,
              }
            : null
        }
        onClose={() => setProfileOpen(false)}
      />
      {member.role === 'admin' && conversation.type !== 'direct' && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
          Admin
        </span>
      )}
      {canManage && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1 text-text-muted hover:bg-bg hover:text-text"
            aria-label={`Manage ${member.name}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute top-full right-2 z-30 w-48 rounded-xl border border-border bg-bg-elevated p-1 shadow-2xl">
              {member.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        setRole({
                          conversationId: conversation.id,
                          userId: member.userId,
                          role: 'member',
                        }).unwrap(),
                      `${first} is no longer an admin`,
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-hover"
                >
                  <ShieldOff className="h-4 w-4" /> Remove as admin
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        setRole({
                          conversationId: conversation.id,
                          userId: member.userId,
                          role: 'admin',
                        }).unwrap(),
                      `${first} is now an admin`,
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text hover:bg-bg-hover"
                >
                  <ShieldCheck className="h-4 w-4" /> Make admin
                </button>
              )}
              {!conversation.isOrgWide && (
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      () =>
                        removeMember({
                          conversationId: conversation.id,
                          userId: member.userId,
                        }).unwrap(),
                      `${first} was removed`,
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-busy hover:bg-busy/10"
                >
                  <UserMinus className="h-4 w-4" /> Remove from {conversation.type}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );
}

function SettingsForm({
  conversation,
  onDone,
}: {
  conversation: Conversation;
  onDone: () => void;
}) {
  const [name, setName] = useState(conversation.name);
  const [description, setDescription] = useState(conversation.description ?? '');
  const [update, { isLoading }] = useUpdateConversationMutation();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await update({
        conversationId: conversation.id,
        name: name.trim(),
        description: description.trim() || null,
      }).unwrap();
      toast.success('Saved');
      onDone();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
        placeholder="What’s this space for?"
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onDone} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()} className="flex-1">
          Save
        </Button>
      </div>
    </form>
  );
}

export function ConversationDetails({
  conversation,
  selfId,
  onClose,
}: {
  conversation: Conversation;
  selfId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [toAdd, setToAdd] = useState<string[]>([]);
  const [update] = useUpdateConversationMutation();
  const [addMembers, { isLoading: adding }] = useAddMembersMutation();
  const [removeMember] = useRemoveMemberMutation();
  const other = otherMember(conversation, selfId);
  const otherPresence = useLivePresence(other);
  const isAdmin = conversation.myRole === 'admin' && conversation.type !== 'direct';

  useEffect(() => setEditing(false), [conversation.id]);

  async function leave() {
    if (!window.confirm(`Leave “${conversation.name}”?`)) return;
    try {
      await removeMember({ conversationId: conversation.id, userId: selfId }).unwrap();
      toast.success(`You left ${conversation.name}`);
      router.replace('/chat');
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function submitAdd() {
    try {
      await addMembers({ conversationId: conversation.id, userIds: toAdd }).unwrap();
      toast.success(`Added ${toAdd.length} ${toAdd.length === 1 ? 'person' : 'people'}`);
      setToAdd([]);
      setAddOpen(false);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function toggleAdminOnly(value: boolean) {
    try {
      await update({ conversationId: conversation.id, onlyAdminsCanPost: value }).unwrap();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="absolute inset-0 z-20 flex flex-col border-l border-border bg-bg-elevated/95 backdrop-blur-xl lg:static lg:w-[340px] lg:shrink-0"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-text-muted uppercase">Details</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
        <ProfileCard>
          <div className="flex justify-center">
            <ConversationAvatar conversation={conversation} size="lg" />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-text">{conversation.name}</h3>
          {other ? (
            <>
              <p
                className={cn(
                  'text-sm',
                  otherPresence.status === 'online' ? 'text-online' : 'text-text-muted',
                )}
              >
                {lastSeenLabel(otherPresence)}
              </p>
              {otherPresence.customStatus && (
                <p className="mx-auto mt-2 w-fit rounded-full border border-border bg-bg/70 px-3 py-1 text-sm text-text">
                  {otherPresence.customStatus}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted capitalize">
              {conversation.type} · {conversation.members.length} members
            </p>
          )}
          {conversation.description && (
            <p className="mt-2 text-sm text-text-muted">{conversation.description}</p>
          )}
        </ProfileCard>

        {other && (
          <div className="space-y-2 rounded-2xl border border-border p-3 text-sm">
            <p className="flex items-center gap-2 text-text">
              <Mail className="h-4 w-4 text-text-muted" />
              <a href={`mailto:${other.email}`} className="truncate hover:text-primary">
                {other.email}
              </a>
            </p>
            <p className="flex items-center gap-2 text-text-muted">
              <Calendar className="h-4 w-4" />
              Chatting since {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {isAdmin && (
          <section className="space-y-3">
            <h4 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Admin settings
            </h4>
            {editing ? (
              <SettingsForm conversation={conversation} onDone={() => setEditing(false)} />
            ) : (
              <Button variant="secondary" onClick={() => setEditing(true)} className="w-full">
                <Pencil className="h-4 w-4" /> Edit name & description
              </Button>
            )}
            {conversation.type === 'group' && (
              <Toggle
                checked={conversation.onlyAdminsCanPost}
                onChange={(v) => void toggleAdminOnly(v)}
                label="Only admins can send messages"
                hint="Turns the group into an announcement space."
              />
            )}
          </section>
        )}

        {conversation.type !== 'direct' && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                Members · {conversation.members.length}
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>
            <ul className="-mx-2">
              {conversation.members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  conversation={conversation}
                  selfId={selfId}
                />
              ))}
            </ul>
          </section>
        )}

        {conversation.type !== 'direct' && !conversation.isOrgWide && (
          <Button
            variant="ghost"
            onClick={() => void leave()}
            className="w-full text-busy hover:bg-busy/10 hover:text-busy"
          >
            <LogOut className="h-4 w-4" /> Leave {conversation.type}
          </Button>
        )}
      </div>

      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setToAdd([]);
        }}
        title={`Add people to ${conversation.name}`}
      >
        <UserPicker
          selected={toAdd}
          onChange={setToAdd}
          exclude={conversation.members.map((m) => m.userId)}
        />
        <Button
          onClick={() => void submitAdd()}
          disabled={toAdd.length === 0 || adding}
          className="mt-4 w-full"
          size="lg"
        >
          {adding
            ? 'Adding…'
            : `Add ${toAdd.length || ''} ${toAdd.length === 1 ? 'person' : 'people'}`}
        </Button>
      </Modal>
    </motion.aside>
  );
}
