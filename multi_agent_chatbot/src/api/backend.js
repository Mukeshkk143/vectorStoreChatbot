const API_URL = '/api';

export const loginUser = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
};

export const checkChatbotStatus = async (token) => {
  const res = await fetch(`${API_URL}/chatbot/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) { throw new Error('Failed to fetch status'); }
  return res.json();
};

export const sendChatMessage = async (token, message) => {
  const res = await fetch(`${API_URL}/chatbot/message`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  if (!res.ok) { throw new Error('Failed to send message'); }
  return res.json();
};
