from beanie import Document, Link, Indexed, PydanticObjectId
from pydantic import Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from models.user import User
from models.tool import Tool

class ChatSession(Document):
    chatName: str = "New Chat"
    userId: Link[User]
    toolsId: Optional[Link[Tool]] = None
    session_id: Indexed(str, unique=True) = Field(default_factory=lambda: str(uuid.uuid4()))
    documentIds: List[str] = []
    
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_sessions"
