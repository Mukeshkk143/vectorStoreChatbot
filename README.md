# Multi-Agent RAG Chatbot



It is a powerful, full-stack AI chatbot designed for advanced document analysis and web exploration. It combines high-performance web scraping (Crawl4AI), vector storage (FAISS), and LLM-powered reasoning (LangChain + OpenAI) to provide context-aware answers from your own data and the open web.

---

## 🚀 Key Features

- **📄 Document RAG**: Upload PDFs (up to 5MB) and instantly index them for semantic search.
- **🌐 Web Scanning**: Deep crawl websites via BFS strategy using **Crawl4AI** to inject live web data into your chat session.
- **⚡ Vectorized Search**: Uses **FAISS** for fast, local similarity search across documents and scanned URLs.
- **🧠 Contextual Memory**: Implements LangChain's **InMemoryChatMessageHistory** with the `RunnableWithMessageHistory` wrapper for seamless multi-turn conversations.
- **🛡️ Secure Auth**: JWT-based authentication with password hashing and session-protected data access.
- **🎨 Premium UI**: A sleek, dark-themed React interface with real-time scanning progress and optimistic UI updates.

---

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework.
- **LangChain**: Framework for LLM orchestration and RAG pipelines.
- **Beanie (MongoDB)**: Asynchronous ODM for structured data storage.
- **FAISS**: Efficient local vector database for embeddings.
- **Crawl4AI**: High-speed, browser-based web crawler for data extraction.

### Frontend
- **React 19**: Modern UI component architecture.
- **Vite 6**: Lightning-fast build tool and dev server.
- **Tailwind CSS 4**: Utility-first styling for a premium aesthetic.

---

## 📥 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB instance (Local or Atlas)
- OpenAI API Key

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install chromium  # Required for Crawl4AI
```

Configure your `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_32_character_secret_here
DEFAULT_EMAIL=admin@nexusai.com
DEFAULT_PASSWORD=your_secure_password
```

Run the server:
```bash
python main.py
```

### 2. Frontend Setup
```bash
cd multi_agent_chatbot
npm install
npm run dev
```

---

## 📂 Project Structure

```text
├── backend/
│   ├── db/            # Database connection & seeding
│   ├── models/        # Beanie (MongoDB) models
│   ├── routes/        # API endpoints (Auth, Chat, Tools)
│   ├── utils/         # Scraper logic & security utilities
│   ├── vector_stores/ # Dynamic FAISS indices (per session)
│   └── main.py        # Entry point with Asyncio loop fixes
└── multi_agent_chatbot/
    ├── src/
    │   ├── api/       # Frontend API wrappers
    │   ├── components/# Generic & UI components
    │   └── App.jsx    # Main router & state orchestration
```

---

## 🏗️ Architecture Notes

- **Windows Compatibility**: The backend uses the `WindowsProactorEventLoopPolicy` and isolated threads for scraping to handle Playwright's subprocess requirements on Windows.
- **RAG Pipeline**: Uses `OpenAIEmbeddings` for vectorization and `gpt-4o` for high-quality reasoning.
- **Data Privacy**: Documents are processed into embeddings and stored locally by `sessionId`; raw document text is not permanently stored in the primary database.

---

