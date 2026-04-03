from beanie import Document, Indexed
from pydantic import EmailStr, Field
from datetime import datetime, timezone
from typing import Optional

class User(Document):
    email: Indexed(str, unique=True)
    password: str
    
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
