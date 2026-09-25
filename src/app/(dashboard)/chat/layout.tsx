import { ConversationList } from '../../../features/chat/components/ConversationList';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <ConversationList />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
