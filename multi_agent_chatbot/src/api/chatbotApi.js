const API_URL = '/api';

// Shared wrapper: throws specific error on 401 so the UI can catch it
async function authFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    throw new Error('401: Unauthorized — session expired or invalid token');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return res.json();
}

// ──── Auth ────
export const loginUser = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
};

// ──── Chat Sessions ────
export const createChatSession = async (token, chatName) => {
  return authFetch(`${API_URL}/chatbot/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ chatName })
  });
};

export const getChatSessions = async (token) => {
  return authFetch(`${API_URL}/chatbot/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const updateChatSession = async (token, sessionId, chatName) => {
  return authFetch(`${API_URL}/chatbot/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ chatName })
  });
};

export const deleteChatSession = async (token, sessionId) => {
  return authFetch(`${API_URL}/chatbot/session/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

// ──── Chat Messages ────
export const sendChatMessage = async (token, sessionId, message) => {
  return authFetch(`${API_URL}/chatbot/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ userMessage: message, sessionId })
  });
};

export const getMessages = async (token, sessionId) => {
  return authFetch(`${API_URL}/chatbot/messages/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const clearMessages = async (token, sessionId) => {
  return authFetch(`${API_URL}/chatbot/messages/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const checkChatbotStatus = async (token) => {
  return authFetch(`${API_URL}/chatbot/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

// ──── Tools ────
export const createTool = async (token, toolType, configurations) => {
  return authFetch(`${API_URL}/tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ toolType, configurations })
  });
};

export const getTools = async (token) => {
  return authFetch(`${API_URL}/tools`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export const deleteTool = async (token, toolId) => {
  return authFetch(`${API_URL}/tools/${toolId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

// ──── Data Analysis ────
export const saveDataAnalysis = async (token, sessionId, urlConfigurations) => {
  return authFetch(`${API_URL}/chatbot/data-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId, urlConfigurations })
  });
};

export const uploadDocument = async (token, sessionId, file) => {
  const formData = new FormData();
  formData.append('sessionId', sessionId);
  formData.append('file', file);

  const res = await fetch(`${API_URL}/chatbot/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (res.status === 401) {
    throw new Error('401: Unauthorized — session expired or invalid token');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Upload failed (${res.status})`);
  }
  return res.json();
};
