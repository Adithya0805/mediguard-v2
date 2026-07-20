import sys
import os

# Adjust path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.embeddings import get_embeddings

def main():
    print("Getting embeddings model...")
    embeddings = get_embeddings()
    print("Model initialized. Calling embed_query...")
    query_vector = embeddings.embed_query("chest pain diagnosis")
    print(f"embed_query success! Vector length: {len(query_vector)}")
    print("Calling embed_documents...")
    doc_vectors = embeddings.embed_documents(["chest pain diagnosis", "heart failure symptoms"])
    print(f"embed_documents success! Vector length: {len(doc_vectors)}")

if __name__ == "__main__":
    main()
