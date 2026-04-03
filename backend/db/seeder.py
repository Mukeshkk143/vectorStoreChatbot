import logging
from models.user import User
from utils.security import get_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

async def seed_default_user():
    try:
        default_email = os.getenv('DEFAULT_EMAIL')
        default_password = os.getenv('DEFAULT_PASSWORD')
        
        # Check if the default user already exists
        existing_user = await User.find_one(User.email == default_email)
        
        if existing_user:
            logging.info('Default user already exists.')
            return
            
        # Hash the default password
        hashed_password = get_password_hash(default_password)
        
        # Create the user
        new_user = User(
            email=default_email,
            password=hashed_password
        )
        
        await new_user.insert()
        logging.info(f'Default user created: {default_email}')
        
    except Exception as e:
        logging.error(f'Error seeding default user: {e}')
