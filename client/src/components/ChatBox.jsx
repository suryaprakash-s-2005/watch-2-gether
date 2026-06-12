import { useEffect, useRef, useState } from 'react';
import { Send, MessageSquare, Smile } from 'lucide-react';
import useRoomStore from '../store/roomStore';
import useSocketStore from '../store/socketStore';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import useTypingIndicator from '../hooks/useTypingIndicator';

// Import upgraded components
import MessageItem from './MessageItem';
import EmojiPicker from './EmojiPicker';
import ReplyPreview from './ReplyPreview';
import TypingIndicator from './TypingIndicator';

/**
 * Modern Discord-style Live Room Chat panel.
 */
const ChatBox = () => {
  const { chatMessages, currentRoom, roomUsers } = useRoomStore();
  const { emitChatMessage } = useSocketStore();
  const { user: currentUser } = useAuthStore();
  const { replyingTo, setReplyingTo, clearReplyingTo } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);

  const roomCode = currentRoom?.roomCode;
  const { startTyping, stopTyping } = useTypingIndicator(roomCode);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Click outside listener to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageText(value);
    
    // Trigger typing notification
    startTyping();

    const selectionStart = e.target.selectionStart;
    setCursorPosition(selectionStart);

    // Look for "@" symbol preceding the cursor
    const textBeforeCursor = value.substring(0, selectionStart);
    const words = textBeforeCursor.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1);
      
      // Filter active room participants matching query, excluding current user
      const filtered = roomUsers.filter(
        (u) =>
          u.userId !== currentUser?._id &&
          u.username.toLowerCase().includes(query.toLowerCase())
      );
      
      setMentionSuggestions(filtered);
      setShowMentions(filtered.length > 0);
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  };

  const handleSelectMention = (username) => {
    const input = inputRef.current;
    if (!input) return;

    const text = messageText;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);

    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    // Replace the query with the chosen username
    const newText = textBeforeCursor.substring(0, lastAtIndex) + `@${username} ` + textAfterCursor;
    setMessageText(newText);
    setShowMentions(false);
    setMentionSuggestions([]);

    const newCursorPos = lastAtIndex + username.length + 2; // Adding @, username and ending space
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
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

    // Extract mentioned user IDs from messageText
    const words = messageText.split(/\s+/);
    const mentions = [];
    words.forEach((word) => {
      if (word.startsWith('@')) {
        const username = word.slice(1);
        const matched = roomUsers.find(
          (u) => u.username.toLowerCase() === username.toLowerCase()
        );
        if (matched && !mentions.includes(matched.userId)) {
          mentions.push(matched.userId);
        }
      }
    });

    // Send upgraded socket message
    emitChatMessage(
      messageText.trim(),
      replyingTo
        ? {
            messageId: replyingTo.messageId,
            senderName: replyingTo.senderName,
            preview: replyingTo.preview,
          }
        : null,
      mentions
    );

    // Reset local/global state
    setMessageText('');
    clearReplyingTo();
    stopTyping();
  };

  const handleReplySelect = (msg) => {
    setReplyingTo({
      messageId: msg._id,
      senderName: msg.senderName,
      preview: msg.message.substring(0, 50),
    });
    inputRef.current?.focus();
  };

  return (
    <div className="glass-panel rounded-3xl p-4 md:p-5 flex flex-col h-full border border-slate-800/80 relative overflow-hidden">
      {/* Chat Title */}
      <div className="flex items-center gap-2 pb-3.5 mb-3.5 border-b border-slate-800/60 shrink-0">
        <MessageSquare size={17} className="text-youtube-red" />
        <h3 className="font-bold text-white text-sm">Live Chat</h3>
      </div>

      {/* Message List Scrolling Container */}
      <div className={`flex-1 overflow-y-auto space-y-2 pr-1 mb-2.5 min-h-[280px] max-h-[350px] md:max-h-[420px] lg:max-h-[500px] xl:max-h-[600px] scrollbar-thin ${
        chatMessages.length === 0 ? 'flex flex-col items-center justify-center text-center' : ''
      }`}>
        {chatMessages.length === 0 ? (
          <div className="text-slate-500 text-xs px-4 select-none">
            <p className="font-bold text-sm text-slate-400">Welcome to the chat! 👋</p>
            <p className="text-[11px] text-slate-500 mt-1">Be the first to say hello.</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <MessageItem
              key={msg._id}
              msg={msg}
              onReplySelect={handleReplySelect}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Autocomplete Mentions Popup */}
      {showMentions && mentionSuggestions.length > 0 && (
        <div className="absolute bottom-20 left-4 right-4 bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl z-40 max-h-[160px] overflow-y-auto divide-y divide-slate-800/65 backdrop-blur-md scrollbar-none animate-fadeIn select-none">
          {mentionSuggestions.map((member) => (
            <div
              key={member.userId}
              onClick={() => handleSelectMention(member.username)}
              className="flex items-center gap-2.5 p-2.5 hover:bg-slate-900/60 cursor-pointer transition duration-150"
            >
              <div className="w-6.5 h-6.5 rounded-full overflow-hidden bg-slate-850 border border-slate-750 flex items-center justify-center shrink-0">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.username} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">
                    {member.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">@{member.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Action Wrapper */}
      <div className="flex flex-col relative w-full shrink-0">
        
        {/* Emoji Picker Overlay */}
        {showEmojiPicker && (
          <div ref={emojiButtonRef}>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          </div>
        )}

        {/* Reply Preview Header */}
        <ReplyPreview replyingTo={replyingTo} onClear={clearReplyingTo} />
        
        {/* Typing indicator */}
        <TypingIndicator />

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center bg-slate-950/40 border border-slate-800 rounded-2xl p-1 px-1.5 focus-within:border-youtube-red/45 transition">
          <input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={handleInputChange}
            placeholder="Send a message..."
            className="flex-1 bg-transparent border-none text-white text-xs px-2 py-2.5 focus:outline-none placeholder-slate-500"
            maxLength={1000}
          />
          
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition cursor-pointer"
            title="Choose emoji"
          >
            <Smile size={15.5} />
          </button>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="bg-youtube-red hover:bg-youtube-hover disabled:bg-slate-800/40 disabled:text-slate-600 text-white font-bold p-2.5 rounded-xl transition shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            <Send size={13.5} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
