from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from app.document_loader import load_document
from app.chunker import split_text
from app.vector_store import store_chunks
from app.rag_engine import generate_answer
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
def home():
    return {"message": "OmniRAG Backend Running"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...), session_id: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = load_document(file_path)
    chunks = split_text(text)

    store_chunks(chunks, file.filename, session_id)

    return {
        "message": f"{file.filename} uploaded successfully",
        "chunks_stored": len(chunks),
        "session_id": session_id,
        "source_file": file.filename,
    }


@app.get("/ask")
def ask_question(query: str, session_id: str, source_file: str | None = None):
    result = generate_answer(
        query=query, session_id=session_id, source_file=source_file
    )
    return result
