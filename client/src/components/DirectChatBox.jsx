import { useEffect, useRef, useState } from 'react';
import { Send, Smile, ArrowLeft, MessageSquare, Clock } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useDirectChatStore from '../store/useDirectChatStore';
import useSocketStore from '../store/socketStore';
import EmojiPicker from './EmojiPicker';

const DirectChatBox = ({ friend, onClose }) => {
  const { conversations, typingFriends, isLoading, fetchDirectHistory } = useDirectChatStore();
  const { emitDirectMessage, emitDirectTypingStart, emitDirectTypingStop } = useSocketStore();
  const { user: currentUser } = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const messages = conversations[friend._id] || [];
  const isFriendTyping = typingFriends[friend._id];

  // Fetch history when active friend chat opens
  useEffect(() => {
    fetchDirectHistory(friend._id);
  }, [friend._id, fetchDirectHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto scroll to bottom when new messages arrive or typing status changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isFriendTyping]);

  // Click outside listener to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.closest('button[title="Choose emoji"]')) {
        return;
      }
      if (showEmojiPicker && emojiButtonRef.current) {
        const path = event.composedPath ? event.composedPath() : [];
        const clickedInside = emojiButtonRef.current.contains(event.target) || path.includes(emojiButtonRef.current);
        if (!clickedInside) {
          setShowEmojiPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleInputChange = (e) => {
    setMessageText(e.target.value);

    // Typing status emitter
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitDirectTypingStart(friend._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitDirectTypingStop(friend._id);
    }, 2000);
  };

  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const newText = text.substring(0, start) + emoji + text.substring(end);

    setMessageText(newText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);

    setShowEmojiPicker(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    emitDirectMessage(friend._id, messageText.trim());

    setMessageText('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitDirectTypingStop(friend._id);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Group messages by day
  const groupMessagesByDay = (msgs) => {
    const groups = [];
    msgs.forEach((msg) => {
      const date = new Date(msg.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      let group = groups.find((g) => g.date === date);
      if (!group) {
        group = { date, messages: [] };
        groups.push(group);
      }
      group.messages.push(msg);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDay(messages);

  return (
    <div className="glass-panel rounded-3xl p-4 md:p-5 flex flex-col h-full border border-slate-800/80 relative overflow-hidden min-h-[450px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={onClose}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition font-bold"
          >
            <ArrowLeft size={13} />
            <span>Graph</span>
          </button>
          <div className="w-px h-4 bg-slate-800 hidden md:block"></div>
          <div className="flex items-center gap-2">
            <img
              src={friend.avatar}
              alt={friend.displayName}
              className="w-8 h-8 rounded-full object-cover border border-slate-850"
            />
            <div className="text-left">
              <h4 className="text-xs font-bold text-white leading-tight">{friend.displayName}</h4>
              <p className="text-[10px] text-slate-500">@{friend.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-1 mb-2.5 min-h-0 max-h-full scrollbar-thin no-overscroll">
        {isLoading && messages.length === 0 ? (
          <div className="py-12 flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-youtube-red"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-slate-550 text-xs px-4 select-none h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="text-slate-850 mb-2" size={32} />
            <p className="font-bold text-slate-400">Direct Chat with {friend.displayName}</p>
            <p className="text-[10px] text-slate-500 mt-1">Start a conversation outside the watch party.</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="border-t border-slate-800/40 flex-grow"></div>
                <span className="text-[9px] font-bold text-slate-500 px-3 uppercase tracking-wider">
                  {group.date}
                </span>
                <div className="border-t border-slate-800/40 flex-grow"></div>
              </div>

              {/* Messages list */}
              {group.messages.map((msg) => {
                const isMe = String(msg.senderId) === String(currentUser?._id);
                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2.5 max-w-[85%] ${
                      isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isMe && (
                      <img
                        src={friend.avatar}
                        alt={friend.displayName}
                        className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-slate-850"
                      />
                    )}
                    <div className="flex flex-col">
                      <div
                        className={`rounded-2xl p-3 text-xs leading-relaxed break-words border ${
                          isMe
                            ? 'bg-youtube-red/10 border-youtube-red/20 text-white rounded-br-none'
                            : 'bg-slate-900/60 border-slate-850 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {msg.message}
                      </div>
                      <div
                        className={`flex items-center gap-1 mt-1 text-[8px] text-slate-500 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <Clock size={8} />
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && (
                          <span 
                            className={`text-[10px] ml-1.5 font-bold shrink-0 leading-none ${
                              msg.read ? 'text-sky-400' : 'text-slate-550'
                            }`}
                            title={msg.read ? 'Read' : 'Sent'}
                          >
                            {msg.read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isFriendTyping && (
        <div className="flex items-center gap-2 px-4 py-2 text-[10px] text-slate-400 font-semibold bg-slate-950/20 border-t border-slate-800/40 rounded-t-xl animate-fadeIn shrink-0">
          <div className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.9s' }} />
            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.9s' }} />
            <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.9s' }} />
          </div>
          <span className="italic truncate">{friend.displayName} is typing...</span>
        </div>
      )}

      {/* Input Form */}
      <div className="flex flex-col relative w-full shrink-0">
        {showEmojiPicker && (
          <div ref={emojiButtonRef}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 items-center bg-slate-950/40 border border-slate-800 rounded-2xl p-1 pl-3 focus-within:border-youtube-red/45 transition"
        >
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={handleInputChange}
            placeholder={`Message ${friend.displayName}...`}
            className="flex-grow bg-transparent border-none text-white text-sm md:text-xs px-1 py-3 md:py-2.5 focus:outline-none placeholder-slate-500"
            maxLength={1000}
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition cursor-pointer"
            title="Choose emoji"
          >
            <Smile size={18} />
          </button>

          <button
            type="submit"
            disabled={!messageText.trim()}
            className="bg-youtube-red hover:bg-youtube-hover disabled:bg-slate-800/40 disabled:text-slate-600 text-white font-bold min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DirectChatBox;
