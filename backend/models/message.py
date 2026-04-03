from beanie import Document, Link
from pydantic import Field
from datetime import datetime, timezone
from models.user import User
from models.chat_session import ChatSession

class Message(Document):
    userId: Link[User]
    sessionId: Link[ChatSession]
    userMessage: str
    aiMessage: str
    
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "messages"
        # Index for fast session-based queries
        indexes = [
            [("sessionId", 1), ("createdAt", 1)]
        ]
