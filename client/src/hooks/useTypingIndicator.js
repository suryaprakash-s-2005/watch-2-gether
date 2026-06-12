import { useEffect, useRef } from 'react';
import useSocketStore from '../store/socketStore';

/**
 * Hook to manage emitting typing events to the socket server.
 * @param {string} roomCode - The active room's code
 * @returns {object} { startTyping, stopTyping } functions
 */
export const useTypingIndicator = (roomCode) => {
  const { socket } = useSocketStore();
  const isTypingRef = useRef(false);
  const timeoutRef = useRef(null);

  const startTyping = () => {
    if (!socket || !roomCode) return;

    // Emit 'typing-start' only if user was not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing-start', { roomCode });
    }

    // Reset the inactivity timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // After 2 seconds of inactivity, emit typing-stop
    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const stopTyping = () => {
    if (!socket || !roomCode) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing-stop', { roomCode });
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Clean up any timeouts when the component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
};

export default useTypingIndicator;
