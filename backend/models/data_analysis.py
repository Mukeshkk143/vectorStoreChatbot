from beanie import Document, Link
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from models.user import User
from models.chat_session import ChatSession

class UrlConfiguration(BaseModel):
    url: str
    pages: int

class DataAnalysis(Document):
    userId: Link[User]
    sessionId: Link[ChatSession]
    urlConfigurations: List[UrlConfiguration]
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "dataAnalysis"
