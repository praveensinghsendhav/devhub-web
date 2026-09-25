import { PenSquare } from 'lucide-react';
import { Topbar } from '../../../common/components/Topbar';
import { ComingSoon } from '../../../common/components/ComingSoon';

export default function WhiteboardPage() {
  return (
    <>
      <Topbar title="Whiteboard" />
      <ComingSoon
        icon={PenSquare}
        title="Whiteboard is on the way"
        description="Realtime collaborative boards are landing in a later build. Chat and presence are live today."
      />
    </>
  );
}
