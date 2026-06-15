import { useState, useEffect } from 'react';
import { Smile, Reply, CornerUpLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactionPicker from './ReactionPicker';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import useSocketStore from '../store/socketStore';

/**
 * Individual Discord-style chat message item.
 * @param {object} props
 * @param {object} props.msg - The message object from the database
 * @param {function} props.onReplySelect - Callback when reply is clicked
 */
const MessageItem = ({ msg, onReplySelect }) => {
  const { user: currentUser } = useAuthStore();
  const { roomUsers } = useRoomStore();
  const { emitMessageReaction } = useSocketStore();
  
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Listen for custom highlight events to handle jump-to-reply scrolling effect
  useEffect(() => {
    const handleHighlight = (e) => {
      if (String(e.detail.messageId) === String(msg._id)) {
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 1500);
      }
    };

    window.addEventListener('highlight-message', handleHighlight);
    return () => window.removeEventListener('highlight-message', handleHighlight);
  }, [msg._id]);

  if (msg.isSystem) {
    return (
      <div className="text-center py-1.5 animate-fadeIn">
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold inline-block select-none ${
          msg.isError 
            ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
            : 'bg-slate-800/40 text-slate-400 border border-slate-700/20'
        }`}>
          {msg.message}
        </span>
      </div>
    );
  }

  const isSelf = String(msg.senderId) === String(currentUser?._id);
  const isMentioned = msg.mentions?.some(id => String(id) === String(currentUser?._id));

  // Retrieve usernames of users who reacted
  const getReactingUsernames = (userIds) => {
    return userIds
      .map(id => {
        const found = roomUsers.find(u => String(u.userId) === String(id));
        return found ? `@${found.username}` : null;
      })
      .filter(Boolean)
      .join(', ');
  };

  const handleReact = (emoji) => {
    emitMessageReaction(msg._id, emoji);
  };

  const handleJumpToOriginal = (e) => {
    e.preventDefault();
    if (!msg.replyTo?.messageId) return;

    const element = document.getElementById(`msg-${msg.replyTo.messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Fire custom event to trigger highlight animation on target MessageItem
      const event = new CustomEvent('highlight-message', {
        detail: { messageId: msg.replyTo.messageId }
      });
      window.dispatchEvent(event);
    }
  };

  // Format time
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format mention badges in text
  const renderMessageText = (text) => {
    if (!text) return '';
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const targetUsername = part.slice(1);
        const existsInRoom = roomUsers.some(u => u.username.toLowerCase() === targetUsername.toLowerCase());
        
        if (existsInRoom) {
          return (
            <span key={index} className="bg-youtube-red/10 text-youtube-red hover:bg-youtube-red/20 font-bold px-1.5 py-0.5 rounded-lg text-xs transition select-all">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  // Avatar initial character fallback
  const avatarFallback = msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?';

  return (
    <motion.div
      id={`msg-${msg._id}`}
      animate={isHighlighted ? { 
        backgroundColor: 'rgba(239, 68, 68, 0.12)', 
        borderColor: 'rgba(239, 68, 68, 0.5)'
      } : isMentioned ? {
        backgroundColor: 'rgba(245, 158, 11, 0.04)',
        borderColor: 'rgba(245, 158, 11, 0.2)'
      } : {
        backgroundColor: 'rgba(255, 255, 255, 0.0)',
        borderColor: 'rgba(255, 255, 255, 0.0)'
      }}
      transition={{ duration: 0.3 }}
      className={`group relative flex flex-col p-3 px-4 rounded-2xl border transition-all duration-300 ${
        isMentioned ? 'border-l-3 border-l-amber-500' : 'border-l-3 border-l-transparent'
      }`}
    >
      {/* Reply Context Trace */}
      {msg.replyTo && (
        <div className="flex items-center gap-1.5 ml-8 mb-1.5 text-[10px] text-slate-500">
          <CornerUpLeft size={10} className="shrink-0" />
          <span className="font-semibold text-slate-400">@{msg.replyTo.senderName}</span>
          <span 
            onClick={handleJumpToOriginal}
            className="truncate max-w-[180px] italic hover:text-youtube-red hover:underline cursor-pointer select-none"
            title="Click to jump to message"
          >
            "{msg.replyTo.preview}"
          </span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex items-start gap-3 w-full">
        {/* Avatar */}
        <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
          {msg.avatar ? (
            <img src={msg.avatar} alt={msg.senderName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-slate-350">{avatarFallback}</span>
          )}
        </div>

        {/* Name, Time and Content Box */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold truncate ${isSelf ? 'text-youtube-red' : 'text-white'}`}>
              {msg.senderName}
            </span>
            <span className="text-[9px] text-slate-500 font-semibold select-none">
              {formatTime(msg.timestamp || msg.createdAt)}
            </span>
          </div>

          <div className="text-xs text-slate-200 leading-relaxed break-words pr-4 select-text">
            {renderMessageText(msg.message)}
          </div>

          {/* Reactions Row */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 select-none">
              {msg.reactions.map((react) => {
                const alreadyReacted = react.users.some(id => String(id) === String(currentUser?._id));
                const reactorsList = getReactingUsernames(react.users);
                
                return (
                  <div
                    key={react.emoji}
                    className="relative group/react"
                  >
                    <button
                      type="button"
                      onClick={() => handleReact(react.emoji)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border transition duration-150 active:scale-95 cursor-pointer ${
                        alreadyReacted
                          ? 'bg-youtube-red/10 border-youtube-red/30 text-youtube-red'
                          : 'bg-slate-800/40 border-slate-700/35 text-slate-350 hover:bg-slate-800/80'
                      }`}
                    >
                      <span>{react.emoji}</span>
                      <span className="text-[10px]">{react.users.length}</span>
                    </button>
                    
                    {/* Tooltip listing who reacted */}
                    {reactorsList && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-950 border border-slate-800 text-slate-200 text-[9px] font-bold rounded-lg p-1.5 px-2.5 shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover/react:opacity-100 transition-opacity duration-200 z-30">
                        {reactorsList}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile/Touch Actions Row */}
      <div className="flex items-center gap-2.5 mt-2 ml-11 md:hidden select-none">
        <button
          type="button"
          onClick={() => onReplySelect(msg)}
          className="text-[10px] text-slate-400 hover:text-white font-bold transition flex items-center gap-1 bg-slate-800/45 border border-slate-700/25 px-2.5 py-1.5 rounded-xl cursor-pointer active:scale-95"
        >
          <Reply size={10.5} />
          <span>Reply</span>
        </button>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="text-[10px] text-slate-400 hover:text-white font-bold transition flex items-center gap-1 bg-slate-800/45 border border-slate-700/25 px-2.5 py-1.5 rounded-xl cursor-pointer active:scale-95"
          >
            <Smile size={10.5} />
            <span>React</span>
          </button>
          
          <AnimatePresence>
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-1 z-30">
                <ReactionPicker
                  onSelect={handleReact}
                  onClose={() => setShowReactionPicker(false)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hover Actions Menu (Discord-style overlay) */}
      <div className="absolute top-0.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 border border-slate-800 rounded-lg shadow-xl flex items-center divide-x divide-slate-800 z-20 h-fit select-none">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer rounded-l-lg"
            title="React"
          >
            <Smile size={13.5} />
          </button>
          
          <AnimatePresence>
            {showReactionPicker && (
              <div className="absolute bottom-full right-0 mb-1.5">
                <ReactionPicker
                  onSelect={handleReact}
                  onClose={() => setShowReactionPicker(false)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => onReplySelect(msg)}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer rounded-r-lg"
          title="Reply"
        >
          <Reply size={13.5} />
        </button>
      </div>
    </motion.div>
  );
};

export default MessageItem;
