from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from models.user import User
from utils.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Token(BaseModel):
    token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=Token)
async def login_for_access_token(login_data: LoginRequest):
    # 1. Look up user by email
    user = await User.find_one(User.email == login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Verify password
    if not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create access token
    access_token = create_access_token(subject=str(user.id))
    return {"token": access_token, "token_type": "bearer"}
