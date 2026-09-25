'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Megaphone, MessageCircle, Plus, Users, type LucideIcon } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import { NewChatDialog } from '../../../features/chat/components/NewChatDialog';

const CARDS: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: MessageCircle, label: 'Direct', text: 'One-to-one, with seen receipts' },
  { icon: Users, label: 'Groups', text: 'Admins, roles & replies' },
  { icon: Megaphone, label: 'Broadcasts', text: 'Announce to everyone' },
  { icon: Activity, label: 'Presence', text: 'Online, typing & last seen' },
];

/** Distance of each card from the carousel's center axis. */
const RADIUS_PX = 150;

function CardFace({
  icon: Icon,
  label,
  text,
  back = false,
}: {
  icon: LucideIcon;
  label: string;
  text: string;
  back?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-2xl border border-border p-4 text-left shadow-xl shadow-primary/20 [backface-visibility:hidden] ${
        back ? 'bg-bg-elevated/40 opacity-70' : 'bg-bg-elevated/60'
      }`}
      // The back face is turned 180° so its text reads correctly when the card faces away.
      style={back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-text">{label}</p>
      <p className="text-xs text-text-muted">{text}</p>
    </div>
  );
}

export default function ChatWelcomePage() {
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);

  return (
    <div className="chat-stage hidden flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center md:flex">
      {/*
        Fixed-size stage in normal flow: it reserves room for the whole rotation (including the
        card nearest the viewer, which renders slightly larger), so the text below stays clear.
      */}
      <div className="relative h-64 w-[30rem] shrink-0 [perspective:1000px]">
        <div className="carousel-spin preserve-3d absolute inset-0">
          {CARDS.map((card, i) => (
            <div
              key={card.label}
              className="preserve-3d absolute top-1/2 left-1/2 h-32 w-44"
              style={{
                transform: `translate(-50%, -50%) rotateY(${i * (360 / CARDS.length)}deg) translateZ(${RADIUS_PX}px)`,
              }}
            >
              <CardFace {...card} />
              <CardFace {...card} back />
            </div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-2xl font-semibold text-text">
          Welcome back{user ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
          Pick a conversation on the left, or start something new.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-3d mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-accent px-5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New conversation
        </button>
      </motion.div>

      <NewChatDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
