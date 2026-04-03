import os
import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from dotenv import load_dotenv
import sys
import asyncio

# Fix for Playwright/asyncio NotImplementedError on Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Optional Langchain imports to ensure they are available
import langchain
import langchain_openai

from db.connection import connect_db
from db.seeder import seed_default_user

# Import routers
from routes import auth
from routes import chat
from routes import tools

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup event
    logging.info("Starting up backend...")
    await connect_db()
    await seed_default_user()
    yield
    # Shutdown event
    logging.info("Shutting down backend...")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(lifespan=lifespan, title="Multi-Agent Chatbot API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this in production with real origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with the /api prefix used by your frontend
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(tools.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to the Nexus AI"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
