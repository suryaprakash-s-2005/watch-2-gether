import api from './api';

/**
 * Fetch chat history for the last 24 hours.
 * @param {string} roomCode - The room code to query
 * @returns {Promise<Array>} List of messages
 */
export const getRoomChatHistory = async (roomCode) => {
  const { data } = await api.get(`/chat/${roomCode.toUpperCase()}/history`);
  return data;
};
