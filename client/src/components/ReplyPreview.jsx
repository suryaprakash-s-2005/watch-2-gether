import { X, CornerDownRight } from 'lucide-react';

/**
 * Renders a preview context above the chat input when replying to a message.
 * @param {object} props
 * @param {object} props.replyingTo - The message object being replied to
 * @param {function} props.onClear - Handler to cancel the reply context
 */
const ReplyPreview = ({ replyingTo, onClear }) => {
  if (!replyingTo) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-t border-x border-slate-800 rounded-t-2xl text-xs text-slate-350 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <CornerDownRight size={12} className="text-youtube-red shrink-0" />
        <span className="font-bold shrink-0">
          Replying to <span className="text-white">@{replyingTo.senderName}</span>
        </span>
        <span className="text-slate-400 truncate italic">
          "{replyingTo.message}"
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="p-1 bg-slate-850 hover:bg-slate-750 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700/20 transition cursor-pointer"
        title="Cancel reply"
      >
        <X size={11} />
      </button>
    </div>
  );
};

export default ReplyPreview;
