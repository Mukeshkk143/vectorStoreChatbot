from beanie import Document, Link
from pydantic import Field
from typing import Literal, Dict, Any, Optional
from datetime import datetime, timezone
from models.user import User

class Tool(Document):
    toolType: Literal['api', 'postgres', 'mongoDb']
    configurations: Dict[str, Any] = Field(default_factory=dict)
    userId: Link[User]
    
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "tools"
