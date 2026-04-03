from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any
from beanie import PydanticObjectId

from models.user import User
from models.tool import Tool
from utils.security import get_current_user

router = APIRouter(prefix="/tools", tags=["Tools"])

class ToolCreateRequest(BaseModel):
    toolType: str
    configurations: Dict[str, Any]

@router.get("/")
async def get_tools(current_user: User = Depends(get_current_user)):
    # Find all tools belonging to the user
    tools = await Tool.find(Tool.userId.id == current_user.id).to_list()
    return tools

@router.post("/")
async def create_tool(tool_data: ToolCreateRequest, current_user: User = Depends(get_current_user)):
    if tool_data.toolType not in ['api', 'postgres', 'mongoDb']:
        raise HTTPException(status_code=400, detail="Invalid toolType")
        
    tool = Tool(
        toolType=tool_data.toolType,
        configurations=tool_data.configurations,
        userId=current_user
    )
    await tool.insert()
    return tool

@router.delete("/{toolId}")
async def delete_tool(toolId: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(toolId)
        tool = await Tool.get(object_id)
        if not tool or tool.userId.id != current_user.id:
            raise HTTPException(status_code=404, detail="Tool not found")
        
        await tool.delete()
        return {"message": "Tool deleted successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid tool ID")
