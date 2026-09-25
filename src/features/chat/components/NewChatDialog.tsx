'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../../common/components/Modal';
import { Input } from '../../../common/components/Input';
import { Button } from '../../../common/components/Button';
import { Toggle } from '../../../common/components/Toggle';
import { useCan } from '../../../common/rbac/usePermission';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import {
  useCreateBroadcastMutation,
  useCreateDirectConversationMutation,
  useCreateGroupMutation,
} from '../chatApi';
import { UserPicker } from './UserPicker';

type Mode = 'direct' | 'group' | 'broadcast';

const MODES: { id: Mode; label: string; icon: typeof Users; hint: string }[] = [
  { id: 'direct', label: 'Direct', icon: MessageCircle, hint: 'A private one-to-one chat' },
  { id: 'group', label: 'Group', icon: Users, hint: 'Everyone can talk; you’re the admin' },
  {
    id: 'broadcast',
    label: 'Broadcast',
    icon: Megaphone,
    hint: 'Only admins post, everyone reads',
  },
];

export function NewChatDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const canBroadcast = useCan('chat:manage');
  const [mode, setMode] = useState<Mode>('direct');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [onlyAdmins, setOnlyAdmins] = useState(false);
  const [everyone, setEveryone] = useState(true);
  const [createDirect, directState] = useCreateDirectConversationMutation();
  const [createGroup, groupState] = useCreateGroupMutation();
  const [createBroadcast, broadcastState] = useCreateBroadcastMutation();
  const busy = directState.isLoading || groupState.isLoading || broadcastState.isLoading;

  function reset() {
    setName('');
    setDescription('');
    setMemberIds([]);
    setOnlyAdmins(false);
    setEveryone(true);
    setMode('direct');
  }

  function finish(conversationId: string) {
    reset();
    onClose();
    router.push(`/chat/${conversationId}`);
  }

  async function startDirect(userId: string) {
    try {
      finish((await createDirect({ userId }).unwrap()).id);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      if (mode === 'group') {
        const conversation = await createGroup({
          name: name.trim(),
          description: description.trim() || undefined,
          memberIds,
          onlyAdminsCanPost: onlyAdmins,
        }).unwrap();
        toast.success(`Group “${conversation.name}” created`);
        finish(conversation.id);
      } else if (mode === 'broadcast') {
        const conversation = await createBroadcast({
          name: name.trim(),
          description: description.trim() || undefined,
          allMembers: everyone,
          memberIds: everyone ? undefined : memberIds,
        }).unwrap();
        toast.success(`Broadcast “${conversation.name}” created`);
        finish(conversation.id);
      }
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  const modes = MODES.filter((m) => m.id !== 'broadcast' || canBroadcast);
  const canSubmit =
    name.trim().length > 0 &&
    (mode === 'group' ? memberIds.length > 0 : everyone || memberIds.length > 0);

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New conversation"
      description={modes.find((m) => m.id === mode)?.hint}
    >
      <div
        className="mb-5 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${modes.length}, 1fr)` }}
      >
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all',
              mode === id
                ? 'border-primary/60 bg-primary/10 text-text shadow-lg shadow-primary/10'
                : 'border-border text-text-muted hover:bg-bg-hover',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'direct' ? (
        <UserPicker selected={[]} onPick={(user) => void startDirect(user.id)} multiple={false} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label={mode === 'group' ? 'Group name' : 'Broadcast name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === 'group' ? 'Frontend guild' : 'Company announcements'}
            maxLength={80}
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What’s this space for?"
            maxLength={500}
          />
          {mode === 'group' ? (
            <Toggle
              checked={onlyAdmins}
              onChange={setOnlyAdmins}
              label="Only admins can send messages"
              hint="Members can still read and react. You can change this later."
            />
          ) : (
            <Toggle
              checked={everyone}
              onChange={setEveryone}
              label="Send to everyone in the organization"
              hint="People who join later are added automatically."
            />
          )}
          {(mode === 'group' || !everyone) && (
            <div>
              <p className="mb-2 text-sm font-medium text-text-muted">
                {mode === 'group' ? 'Members' : 'Recipients'}
                {memberIds.length > 0 && (
                  <span className="ml-1.5 text-primary">· {memberIds.length} selected</span>
                )}
              </p>
              <UserPicker selected={memberIds} onChange={setMemberIds} />
            </div>
          )}
          <Button type="submit" size="lg" disabled={!canSubmit || busy}>
            {busy ? 'Creating…' : mode === 'group' ? 'Create group' : 'Create broadcast'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
