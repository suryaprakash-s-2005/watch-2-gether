import useChatStore from '../store/chatStore';

/**
 * Renders a real-time list of typing users with a smooth bouncing dot animation.
 */
const TypingIndicator = () => {
  const { typingUsers } = useChatStore();

  if (!typingUsers || typingUsers.length === 0) return null;

  const text = typingUsers.length === 1
    ? `${typingUsers[0].username} is typing...`
    : typingUsers.length === 2
    ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    : 'Multiple people are typing...';

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-[10px] text-slate-400 font-semibold bg-slate-950/20 border-t border-slate-800/40 rounded-t-xl animate-fadeIn shrink-0">
      {/* Three jumping dots typing animation */}
      <div className="flex items-center gap-0.5">
        <span className="w-1.5 h-1.5 bg-youtube-red rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.9s' }} />
        <span className="w-1.5 h-1.5 bg-youtube-red rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.9s' }} />
        <span className="w-1.5 h-1.5 bg-youtube-red rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.9s' }} />
      </div>
      <span className="italic truncate">{text}</span>
    </div>
  );
};

export default TypingIndicator;
