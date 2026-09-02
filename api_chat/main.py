import re
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import ask_agent
from db import insert_document_chunk

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    reply = ask_agent(request.query)
    return {"response": reply}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode("utf-8")
    raw_chunks = [c.strip() for c in re.split(r'[\r\n]{2,}', text) if c.strip()]
    
    stored_count = 0
    for chunk in raw_chunks:
        insert_document_chunk(filename=file.filename, content=chunk)
        stored_count += 1
        
    return {
        "status": "success",
        "filename": file.filename,
        "chunks_stored": stored_count
    }