'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  addMinutes,
  differenceInMinutes,
  format,
  isToday,
  setMinutes,
  startOfHour,
} from 'date-fns';
import { Mic, Video } from 'lucide-react';
import { toast } from 'sonner';
import type { Meeting, MeetingMedia } from '@devhub/shared-types';
import { Modal } from '../../../common/components/Modal';
import { Input } from '../../../common/components/Input';
import { Button } from '../../../common/components/Button';
import { Toggle } from '../../../common/components/Toggle';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import { UserPicker } from '../../chat/components/UserPicker';
import { useCreateMeetingMutation, useUpdateMeetingMutation } from '../meetingsApi';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

/** The next :00 or :30 at least 10 minutes away. */
function nextSlot(from = new Date()): Date {
  const soon = addMinutes(from, 10);
  const half = setMinutes(startOfHour(soon), 30);
  return soon <= half ? half : addMinutes(startOfHour(soon), 60);
}

/**
 * Schedule a meeting, or edit one you host. `initialDate` pre-fills the day when you start from a
 * calendar cell.
 */
export function ScheduleMeetingDialog({
  open,
  onClose,
  meeting,
  initialDate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  meeting?: Meeting;
  initialDate?: Date;
  onSaved?: (meeting: Meeting) => void;
}) {
  const editing = Boolean(meeting);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [media, setMedia] = useState<MeetingMedia>('video');
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [allowInvites, setAllowInvites] = useState(true);
  const [muteOnJoin, setMuteOnJoin] = useState(false);
  const [createMeeting, createState] = useCreateMeetingMutation();
  const [updateMeeting, updateState] = useUpdateMeetingMutation();
  const busy = createState.isLoading || updateState.isLoading;

  // Fill the form each time it opens.
  useEffect(() => {
    if (!open) return;
    if (meeting) {
      const start = new Date(meeting.startsAt);
      setTitle(meeting.title);
      setDescription(meeting.description ?? '');
      setDate(format(start, 'yyyy-MM-dd'));
      setTime(format(start, 'HH:mm'));
      setDuration(differenceInMinutes(new Date(meeting.endsAt), start));
      setMedia(meeting.media);
      setAllowInvites(meeting.allowInvites);
      setMuteOnJoin(meeting.muteOnJoin);
      setInviteeIds([]);
    } else {
      // A future day picked on the calendar starts at 10:00; otherwise the next free half hour.
      const start =
        initialDate && !isToday(initialDate) && initialDate > new Date()
          ? new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 10)
          : nextSlot();
      setTitle('');
      setDescription('');
      setDate(format(start, 'yyyy-MM-dd'));
      setTime(format(start, 'HH:mm'));
      setDuration(30);
      setMedia('video');
      setAllowInvites(true);
      setMuteOnJoin(false);
      setInviteeIds([]);
    }
  }, [open, meeting, initialDate]);

  const startsAt = date && time ? new Date(`${date}T${time}`) : null;
  const inPast = startsAt ? startsAt.getTime() < Date.now() - 60_000 : false;
  const canSubmit = title.trim().length > 0 && startsAt !== null && !inPast && !busy;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!startsAt) return;
    try {
      const saved = editing
        ? await updateMeeting({
            meetingId: meeting!.id,
            title: title.trim(),
            description: description.trim() || null,
            startsAt: startsAt.toISOString(),
            durationMinutes: duration,
            allowInvites,
            muteOnJoin,
          }).unwrap()
        : await createMeeting({
            kind: 'scheduled',
            title: title.trim(),
            description: description.trim() || undefined,
            media,
            startsAt: startsAt.toISOString(),
            durationMinutes: duration,
            inviteeIds,
            allowInvites,
            muteOnJoin,
          }).unwrap();
      toast.success(editing ? 'Meeting updated' : `“${saved.title}” scheduled`);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit meeting' : 'Schedule a meeting'}
      description={
        editing
          ? 'Everyone invited sees the change right away.'
          : 'It shows up on the calendar of everyone who accepts.'
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sprint planning"
          maxLength={120}
          autoFocus
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Agenda (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will you cover?"
            maxLength={2000}
            rows={3}
            className="resize-none rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input
            label="Date"
            type="date"
            value={date}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Start"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            error={inPast ? 'That time has passed' : undefined}
          />
          <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <span className="text-sm font-medium text-text-muted">Duration</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-11 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              {[...new Set([...DURATIONS, duration])]
                .sort((a, b) => a - b)
                .map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes < 60
                      ? `${minutes} min`
                      : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {!editing && (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'video', label: 'Video meeting', icon: Video },
                { id: 'audio', label: 'Audio only', icon: Mic },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMedia(id)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                  media === id
                    ? 'border-primary/60 bg-primary/10 text-text'
                    : 'border-border text-text-muted hover:bg-bg-hover',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        <Toggle
          checked={allowInvites}
          onChange={setAllowInvites}
          label="Guests can invite others"
          hint="Anyone invited can add more people. Turn off to keep the list to you and co-hosts."
        />
        <Toggle
          checked={muteOnJoin}
          onChange={setMuteOnJoin}
          label="Mute people when they join"
          hint="Handy for large meetings. Everyone can unmute themselves."
        />

        {!editing && (
          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">
              Invite people
              {inviteeIds.length > 0 && (
                <span className="ml-1.5 text-primary">· {inviteeIds.length} selected</span>
              )}
            </p>
            <UserPicker selected={inviteeIds} onChange={setInviteeIds} />
          </div>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Schedule meeting'}
        </Button>
      </form>
    </Modal>
  );
}
