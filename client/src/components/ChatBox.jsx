import { useEffect, useRef, useState } from 'react';
import useRoomStore from '../store/roomStore';
import useSocketStore from '../store/socketStore';
import useAuthStore from '../store/authStore';
import { Send, MessageSquare } from 'lucide-react';

const ChatBox = () => {
  const { chatMessages } = useRoomStore();
  const { emitChatMessage } = useSocketStore();
  const { user } = useAuthStore();
  
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    emitChatMessage(messageText.trim());
    setMessageText('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="glass-panel rounded-3xl p-6 flex flex-col h-full border border-slate-800/80">
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800/60">
        <MessageSquare size={18} className="text-youtube-red" />
        <h3 className="font-bold text-white text-base">Live Chat</h3>
      </div>

      <div className={`flex-1 overflow-y-auto space-y-4 pr-1 mb-4 min-h-[280px] max-h-[350px] md:max-h-[420px] lg:max-h-[500px] xl:max-h-[600px] ${
        chatMessages.length === 0 ? 'flex flex-col items-center justify-center text-center' : ''
      }`}>
        {chatMessages.length === 0 ? (
          <div className="text-slate-500 text-sm">
            <p>Welcome to the watch party! 👋</p>
            <p className="text-xs text-slate-600 mt-1">Send a message to start chatting.</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg._id} className="text-center py-1">
                  <span className={`text-[11px] px-3 py-1 rounded-full font-medium inline-block ${
                    msg.isError 
                      ? 'bg-youtube-red/10 text-youtube-red border border-youtube-red/20' 
                      : 'bg-slate-800/65 text-slate-400 border border-slate-700/20'
                  }`}>
                    {msg.message}
                  </span>
                </div>
              );
            }

            const isSelf = msg.senderId === user?._id;

            return (
              <div
                key={msg._id}
                className={`flex flex-col max-w-[85%] ${
                  isSelf ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-400">
                    {isSelf ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-md ${
                    isSelf
                      ? 'bg-youtube-red text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/40'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Send a message..."
          className="glass-input flex-1 px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-youtube-red"
        />
        <button
          type="submit"
          disabled={!messageText.trim()}
          className="bg-youtube-red hover:bg-youtube-hover disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold p-3 rounded-2xl transition-all duration-200 shadow-lg shadow-youtube-red/10 disabled:shadow-none flex items-center justify-center shrink-0 active:scale-95"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
