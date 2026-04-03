import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from models.user import User
from models.tool import Tool
from models.chat_session import ChatSession
from models.message import Message
from models.data_analysis import DataAnalysis

async def connect_db():
    try:
        # Load MongoDB URI from environment variable
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/chatbot_db")
        
        # Create Motor client
        client = AsyncIOMotorClient(mongodb_uri)
        
        # Initialize Beanie with the client and document models
        await init_beanie(
            database=client.get_default_database(default="test"), 
            document_models=[
                User,
                Tool,
                ChatSession,
                Message,
                DataAnalysis
            ]
        )
        
        logging.info("MongoDB connected successfully")
    except Exception as e:
        logging.error(f"MongoDB connection error: {e}")
        raise e
