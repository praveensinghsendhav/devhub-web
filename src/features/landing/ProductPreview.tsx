'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Hash, MessageSquare, PenSquare, Send, Users, Video } from 'lucide-react';

// Illustrative sample content for the mockup only.
const CHANNELS = ['general', 'frontend', 'releases', 'incidents'];
const PEOPLE = [
  { name: 'Ava', color: 'bg-primary', status: 'bg-online' },
  { name: 'Noah', color: 'bg-accent', status: 'bg-away' },
  { name: 'Mia', color: 'bg-busy', status: 'bg-online' },
  { name: 'Leo', color: 'bg-away', status: 'bg-offline' },
];
const MESSAGES = [
  { who: 'Ava', color: 'bg-primary', text: 'Pushed the auth refactor — can someone review?' },
  { who: 'Noah', color: 'bg-accent', text: 'On it. Looks clean, one nit on the refresh flow.' },
  { who: 'Mia', color: 'bg-busy', text: 'Staging is green. Shipping after standup 🚀' },
];

function Initial({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${color}`}
    >
      {name[0]}
    </span>
  );
}

export function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 28, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 1 : 0.88, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 0 : 60, 0]);

  return (
    <section id="preview" className="relative px-4 pb-24 sm:px-6">
      <div ref={ref} className="mx-auto max-w-6xl [perspective:1800px]">
        <motion.div
          style={{ rotateX, scale, y }}
          className="preserve-3d relative origin-bottom rounded-2xl border border-border bg-bg-elevated/80 p-2 shadow-2xl shadow-primary/20 backdrop-blur-xl"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-busy/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-away/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-online/70" />
            <span className="ml-3 rounded-md bg-bg px-3 py-0.5 text-[11px] text-text-muted">
              devhub.app/chat
            </span>
          </div>

          <div className="grid overflow-hidden rounded-xl border border-border bg-bg md:grid-cols-[180px_220px_1fr]">
            {/* App nav */}
            <aside className="hidden flex-col gap-1 border-r border-border p-3 md:flex">
              {[
                { icon: MessageSquare, label: 'Chat', active: true },
                { icon: PenSquare, label: 'Whiteboard' },
                { icon: Video, label: 'Meeting' },
                { icon: Users, label: 'Team' },
              ].map(({ icon: Icon, label, active }) => (
                <span
                  key={label}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
                    active ? 'bg-primary text-primary-foreground' : 'text-text-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              ))}
            </aside>

            {/* Channels + people */}
            <div className="hidden flex-col gap-4 border-r border-border p-3 md:flex">
              <div>
                <p className="px-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  Channels
                </p>
                <div className="mt-2 flex flex-col gap-0.5">
                  {CHANNELS.map((channel, i) => (
                    <span
                      key={channel}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                        i === 1 ? 'bg-bg-hover text-text' : 'text-text-muted'
                      }`}
                    >
                      <Hash className="h-3 w-3" /> {channel}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="px-1 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
                  People
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {PEOPLE.map((person) => (
                    <span
                      key={person.name}
                      className="flex items-center gap-2 px-1 text-xs text-text"
                    >
                      <span className="relative">
                        <Initial name={person.name} color={person.color} />
                        <span
                          className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg ${person.status}`}
                        />
                      </span>
                      {person.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Thread */}
            <div className="flex min-h-[340px] flex-col">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-text">
                <Hash className="h-4 w-4 text-text-muted" /> frontend
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4">
                {MESSAGES.map((message) => (
                  <div key={message.text} className="flex gap-2.5">
                    <Initial name={message.who} color={message.color} />
                    <div>
                      <p className="text-xs font-semibold text-text">{message.who}</p>
                      <p className="mt-0.5 text-sm text-text-muted">{message.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="m-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs text-text-muted">
                Message #frontend
                <Send className="ml-auto h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>

          {/* Floating depth layers */}
          <div
            className="animate-float absolute -top-6 -right-3 hidden rounded-xl border border-border bg-bg-elevated/90 px-4 py-3 shadow-xl backdrop-blur sm:block"
            style={{ ['--z' as string]: '80px' }}
          >
            <p className="text-[11px] text-text-muted">Presence</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-text">
              <span className="h-2 w-2 rounded-full bg-online" /> 3 teammates online
            </p>
          </div>
          <div
            className="animate-float absolute -bottom-6 -left-3 hidden items-center gap-2 rounded-xl border border-border bg-bg-elevated/90 px-4 py-3 shadow-xl backdrop-blur sm:flex"
            style={{ ['--z' as string]: '120px', animationDelay: '-3s' }}
          >
            <span className="flex gap-0.5">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.2 }}
                />
              ))}
            </span>
            <span className="text-sm text-text">Noah is typing…</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
