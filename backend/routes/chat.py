from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from beanie import PydanticObjectId
import logging
import io
import os
import sys
import uuid
import asyncio
import concurrent.futures
from pypdf import PdfReader
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from utils.scraper import run_multi_link_scraper

#  prompt templates
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.runnables import RunnableLambda

from models.user import User
from models.chat_session import ChatSession
from models.message import Message
from models.tool import Tool
from models.data_analysis import DataAnalysis, UrlConfiguration
from utils.security import get_current_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# In memory chat history records 
session_histories = {}
# Using "text-embedding-ada-002" for embeddings
def get_session_history(session_id: str):
    if session_id not in session_histories:
        session_histories[session_id] = InMemoryChatMessageHistory()
    return session_histories[session_id]

def _run_scraper_in_thread(url_configs):
    """Run the async scraper in a dedicated thread with its own ProactorEventLoop (required for Playwright on Windows)."""
    if sys.platform == "win32":
        loop = asyncio.ProactorEventLoop()
    else:
        loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(run_multi_link_scraper(url_configs))
    finally:
        loop.close()


class SessionCreateRequest(BaseModel):
    chatName: str
    toolsId: Optional[str] = None

class SessionUpdateRequest(BaseModel):
    chatName: str

class MessageRequest(BaseModel):
    sessionId: str
    userMessage: str

class DataAnalysisRequest(BaseModel):
    sessionId: str
    urlConfigurations: List[UrlConfiguration]

@router.get("/status")
async def get_status(current_user: User = Depends(get_current_user)):
    return {"status": "ok", "user": str(current_user.email)}

@router.get("/sessions")
async def get_sessions(current_user: User = Depends(get_current_user)):
    sessions = await ChatSession.find(ChatSession.userId.id == current_user.id).to_list()
    return sessions

@router.post("/session")
async def create_session(session_data: SessionCreateRequest, current_user: User = Depends(get_current_user)):
    # Validate optional tool
    tool_link = None
    if session_data.toolsId:
        try:
            tool_obj_id = PydanticObjectId(session_data.toolsId)
            tool = await Tool.get(tool_obj_id)
            if not tool or tool.userId.to_ref().id != current_user.id:
                raise HTTPException(status_code=404, detail="Tool not found")
            tool_link = tool
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid toolsId format")

    new_session = ChatSession(
        chatName=session_data.chatName,
        userId=current_user,
        toolsId=tool_link
    )
    await new_session.insert()
    return new_session

@router.put("/session/{sessionId}")
async def update_session(sessionId: str, session_data: SessionUpdateRequest, current_user: User = Depends(get_current_user)):
    try:
        session = await ChatSession.get(PydanticObjectId(sessionId))
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session.chatName = session_data.chatName
        await session.save()
        return session
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

@router.delete("/session/{sessionId}")
async def delete_session(sessionId: str, current_user: User = Depends(get_current_user)):
    try:
        session_obj_id = PydanticObjectId(sessionId)
        session = await ChatSession.get(session_obj_id)
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")

        # Wipe out all messages belonging to this session
        await Message.find(Message.sessionId.id == session_obj_id).delete()
        
        # Wipe session
        await session.delete()
        return {"message": "Session deleted"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

@router.get("/messages/{sessionId}")
async def get_messages(sessionId: str, current_user: User = Depends(get_current_user)):
    try:
        session_obj_id = PydanticObjectId(sessionId)
        # Auth check
        session = await ChatSession.get(session_obj_id)
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")
            
        messages = await Message.find(Message.sessionId.id == session_obj_id).to_list()
        return messages
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

@router.delete("/messages/{sessionId}")
async def clear_messages(sessionId: str, current_user: User = Depends(get_current_user)):
    try:
        session_obj_id = PydanticObjectId(sessionId)
        session = await ChatSession.get(session_obj_id)
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")
            
        await Message.find(Message.sessionId.id == session_obj_id).delete()
        return {"message": "Messages cleared"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")

@router.post("/message")
async def send_message(message_data: MessageRequest, current_user: User = Depends(get_current_user)):
    try:
        session_obj_id = PydanticObjectId(message_data.sessionId)
        session = await ChatSession.get(session_obj_id)
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")

        # 1. Check if FAISS vector store exists for this session
        vector_store_path = os.path.join("vector_stores", message_data.sessionId)
        context = ""

        if os.path.exists(os.path.join(vector_store_path, "index.faiss")):
            try:
                embeddings = OpenAIEmbeddings()
                vector_db = FAISS.load_local(
                    vector_store_path, embeddings, allow_dangerous_deserialization=True
                )
                # 2. Similarity search — retrieve top 4 relevant chunks
                docs = vector_db.similarity_search(message_data.userMessage, k=4)
                context = "\n\n".join([d.page_content for d in docs])
                logging.info(f"Retrieved {docs} context chunks from FAISS for session {message_data.sessionId}")
            except Exception as faiss_err:
                logging.warning(f"FAISS search failed, falling back to no context: {faiss_err}")

        # 3. Build messages for ChatOpenAI
        llm = ChatOpenAI(model="gpt-4o", temperature=0.3)

        if context:
            messages = [
                SystemMessage(content=(
                    "You are a helpful assistant. Use the following context retrieved from the user's documents/websites to answer their question. "
                    "If the answer is not in the context, say so clearly.\n\n"
                    f"Context:\n{context}"
                )),
                HumanMessage(content=message_data.userMessage)
            ]
        else:
            messages = [
                SystemMessage(content="You are a helpful AI assistant. Answer the user's question as clearly as possible."),
                HumanMessage(content=message_data.userMessage)
            ]

        # 4. Call the LLM

        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a helpful assistant.\n\n"
             "Use this context for answer the question if relevant:\n{context}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])

        # ✅ Chain
        chain = prompt | llm

        # ✅ Memory wrapper
        chain_with_memory = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="history",
        )

        # ✅ Invoke
        response = chain_with_memory.invoke(
            {
                "input": message_data.userMessage,
                "context": context
            },
            config={"configurable": {"session_id": message_data.sessionId}},
        )
        ai_reply = response.content
        print(f"ai_replyai_reply",ai_reply)

        # 5. Save and return the message
        new_message = Message(
            userId=current_user,
            sessionId=session,
            userMessage=message_data.userMessage,
            aiMessage=ai_reply
        )
        await new_message.insert()
        return new_message

    except Exception as e:
        logging.error(f"Error sending message: {e}")
        raise HTTPException(status_code=400, detail="Invalid request format")

@router.post("/data-analysis")
async def save_data_analysis(data: DataAnalysisRequest, current_user: User = Depends(get_current_user)):
    try:
        session_obj_id = PydanticObjectId(data.sessionId)
        session = await ChatSession.get(session_obj_id)
        
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")
        
        analysis_doc = DataAnalysis(
            userId=current_user,
            sessionId=session,
            urlConfigurations=data.urlConfigurations
        )
        
        await analysis_doc.insert()
        # 2. Trigger the Web Scraper in a dedicated thread (Windows ProactorEventLoop fix)
        url_configs_dicts = [{"url": c.url, "pages": c.pages} for c in data.urlConfigurations]
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_run_scraper_in_thread, url_configs_dicts)
            scraped_results = await asyncio.get_event_loop().run_in_executor(None, future.result)
        
        # 3. Add Scraped Content to FAISS Vector Store
        if scraped_results:
            scraped_documents = [
                Document(
                    page_content=res["content"],
                    metadata={"source": res["url"], "type": "web_scan", "sessionId": data.sessionId}
                )
                for res in scraped_results if res.get("content", "").strip()
            ]
            
            if scraped_documents:
                vector_store_path = os.path.join("vector_stores", data.sessionId)
                os.makedirs("vector_stores", exist_ok=True)
                try:
                    embeddings = OpenAIEmbeddings()
                    if os.path.exists(os.path.join(vector_store_path, "index.faiss")):
                        vector_db = FAISS.load_local(vector_store_path, embeddings, allow_dangerous_deserialization=True)
                        vector_db.add_documents(scraped_documents)
                    else:
                        vector_db = FAISS.from_documents(scraped_documents, embeddings)
                    vector_db.save_local(vector_store_path)
                    logging.info(f"FAISS index updated with web scan results for session {data.sessionId}")
                except Exception as e:
                    logging.error(f"FAISS update failed for web scan: {e}")

        return {
            "message": "Data analysis and web scan completed", 
            "id": str(analysis_doc.id),
            "scrapedCount": len(scraped_results)
        }
        
    except Exception as e:
        logging.error(f"Error saving data analysis: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid request format")

@router.post("/upload")
async def upload_document(
    sessionId: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Validate Session
        session_obj_id = PydanticObjectId(sessionId)
        session = await ChatSession.get(session_obj_id)
        if not session or session.userId.to_ref().id != current_user.id:
            raise HTTPException(status_code=404, detail="Session not found")

        # 2. Validate File (PDF only, max 5MB)
        if file.content_type != "application/pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")

        # 3. Extract Text from PDF and Create Documents
        pdf_reader = PdfReader(io.BytesIO(file_content))
        extracted_text = ""
        documents = []
        
        for i, page in enumerate(pdf_reader.pages):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                extracted_text += page_text + "\n"
                # Create LangChain Document for FAISS
                documents.append(Document(
                    page_content=page_text,
                    metadata={"source": file.filename, "page": i + 1, "sessionId": sessionId}
                ))

        if not documents:
            raise HTTPException(status_code=400, detail="PDF is empty or text could not be extracted")

        # 4. Generate documentId using uuid
        doc_id = str(uuid.uuid4())

        # 5. FAISS Vector Store Logic (Stored in session-specific folder)
        vector_store_path = os.path.join("vector_stores", sessionId)
        os.makedirs("vector_stores", exist_ok=True)
        
        try:
            embeddings = OpenAIEmbeddings()
            if os.path.exists(os.path.join(vector_store_path, "index.faiss")):
                # Update existing index
                vector_db = FAISS.load_local(vector_store_path, embeddings, allow_dangerous_deserialization=True)
                vector_db.add_documents(documents)
            else:
                # Create new index
                vector_db = FAISS.from_documents(documents, embeddings)
            
            vector_db.save_local(vector_store_path)
            logging.info(f"FAISS index saved for session {sessionId}")
        except Exception as e:
            logging.error(f"FAISS storage failed for session {sessionId}: {e}")
            # Note: We continue even if FAISS fails, as the document reference is still in DB

        # 5. Update ChatSession (Only document ID stored)
        if session.documentIds is None:
            session.documentIds = []
        session.documentIds.append(doc_id)
        await session.save()

        return {
            "message": "Document processed correctly",
            "documentId": doc_id,
            "filename": file.filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
