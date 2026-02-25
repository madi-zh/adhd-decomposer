"use client";

interface FocusRoomInviteProps {
  activeCount: number;
  onJoin: () => void;
  onSkip: () => void;
}

export default function FocusRoomInvite({
  activeCount,
  onJoin,
  onSkip,
}: FocusRoomInviteProps) {
  return (
    <div className="flex flex-col items-center text-center pt-12 px-4">
      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl mb-6">
        👥
      </div>

      <h2 className="text-xl font-semibold text-stone-800 mb-2">
        Focus with others
      </h2>
      <p className="text-stone-500 text-sm mb-6 max-w-sm">
        Work alongside other people. No chat, no pressure — just presence.
      </p>

      {activeCount > 0 ? (
        <div className="flex items-center gap-2 mb-6">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm text-emerald-600 font-medium">
            {activeCount} {activeCount === 1 ? "person" : "people"} focusing
            right now
          </span>
        </div>
      ) : (
        <p className="text-sm text-stone-400 mb-6">
          Be the first to start focusing
        </p>
      )}

      <button
        onClick={onJoin}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-6 rounded-xl transition-colors mb-3"
      >
        Join focus room
      </button>

      <button
        onClick={onSkip}
        className="text-xs text-stone-400 hover:text-stone-500 transition-colors"
      >
        Work solo
      </button>
    </div>
  );
}
