import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "chatdb"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )

def init_db():
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    
    cur.execute("DROP TABLE IF EXISTS documents;")
    
    cur.execute("""
        CREATE TABLE documents (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL,
            content TEXT NOT NULL,
            embedding vector(1536)
        );
    """)
    
    conn.commit()
    cur.close()
    conn.close()
    print("Database table recreated successfully with 'filename' column!")

if __name__ == "__main__":
    init_db()


from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_embedding(text: str):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def insert_document_chunk(filename: str, content: str):
    vector = get_embedding(content)
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO documents (filename, content, embedding) VALUES (%s, %s, %s);",
        (filename, content, vector)
    )
    
    conn.commit()
    cur.close()
    conn.close()


def search_documents(query: str, limit: int = 3):
    query_vector = get_embedding(query)
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT filename, content, (embedding <=> %s::vector) AS distance
        FROM documents
        ORDER BY distance ASC
        LIMIT %s;
    """, (query_vector, limit))
    
    results = cur.fetchall()
    cur.close()
    conn.close()
    
    formatted_results = []
    for row in results:
        filename, content, _ = row
        formatted_results.append(f"[Source: {filename}]\n{content}")
        
    return "\n\n---\n\n".join(formatted_results) if formatted_results else "No relevant study materials found."