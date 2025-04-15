import os
import getpass
import faiss
import numpy as np
import warnings
import logging

# Suppress warnings
logging.getLogger("pdfminer").setLevel(logging.ERROR)
warnings.filterwarnings("ignore")

from google import genai
from google.genai import types
from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import(
    UnstructuredPDFLoader,
    TextLoader,
    CSVLoader,
    JSONLoader,
    UnstructuredPowerPointLoader,
    UnstructuredExcelLoader,
    UnstructuredXMLLoader,
    UnstructuredWordDocumentLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter


def authenticate():
    """Authenticates with the Google Generative AI API using an API key."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        api_key = getpass.getpass("Enter your API Key: ")
    
    client = genai.Client(api_key=api_key)
    return client


def load_documents_gradio(uploaded_files):
  docs = []
  for file in uploaded_files:
    file_path = file.name
    # Detect type and load accordingly
    if file_path.lower().endswith('.pdf'):
      docs.extend(UnstructuredPDFLoader(file_path).load())
    elif file_path.lower().endswith('.txt'):
      docs.extend(TextLoader(file_path).load())
    elif file_path.lower().endswith('.csv'):
      docs.extend(CSVLoader(file_path).load())
    elif file_path.lower().endswith('.json'):
      docs.extend(JSONLoader(file_path).load())
    elif file_path.lower().endswith('.pptx'):
      docs.extend(UnstructuredPowerPointLoader(file_path).load())
    elif file_path.lower().endswith('.xlsx'):
      docs.extend(UnstructuredExcelLoader(file_path).load())
    elif file_path.lower().endswith('.xml'):
      docs.extend(UnstructuredXMLLoader(file_path).load())
    elif file_path.lower().endswith('.docx'):
      docs.extend(UnstructuredWordDocumentLoader(file_path).load())
    else:
      print(f'Unsupported File Type: {file_path}')
  return docs


def split_documents(docs, chunk_size=500, chunk_overlap=100):
    """Splits documents into smaller chunks using RecursiveCharacterTextSplitter."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    return splitter.split_documents(docs)


def build_vectorstore(docs, embedding_model_name="all-MiniLM-L6-v2"):
    """Builds a FAISS vector store from the document chunks."""
    texts = [doc.page_content.strip() for doc in docs if doc.page_content.strip()]
    if not texts:
        raise ValueError("No valid text found in the documents.")

    print(f"No. of Chunks: {len(texts)}")

    model = SentenceTransformer(embedding_model_name)
    embeddings = model.encode(texts)
    print(embeddings.shape)

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(np.array(embeddings).astype("float32"))

    return {
        "index": index,
        "texts": texts,
        "embedding_model": model,
        "embeddings": embeddings,
        "chunks": len(texts),
    }


def retrieve_context(query, store, k=6):
    """Retrieves the top-k context chunks most similar to the query."""
    query_vec = store["embedding_model"].encode([query])
    k = min(k, len(store["texts"]))
    distances, indices = store["index"].search(query_vec, k)
    return [store["texts"][i] for i in indices[0]]


def retrieve_context_approx(query, store, k=6):
    """Retrieves context chunks using approximate nearest neighbor search."""
    ncells = 50
    D = store["index"].d
    index = faiss.IndexFlatL2(D)
    nindex = faiss.IndexIVFFlat(index, D, ncells)
    nindex.nprobe = 10

    if not nindex.is_trained:
        nindex.train(np.array(store["embeddings"]).astype("float32"))

    nindex.add(np.array(store["embeddings"]).astype("float32"))
    query_vec = store["embedding_model"].encode([query])
    k = min(k, len(store["texts"]))
    _, indices = nindex.search(np.array(query_vec).astype("float32"), k)
    return [store["texts"][i] for i in indices[0]]


def build_prompt(context_chunks, query):
    """Builds the prompt for the Gemini API using context and query."""
    context = "\n".join(context_chunks)
    return f"""You are a highly knowledgeable and helpful assistant. Use the following context to generate a **detailed and step-by-step** answer to the user's question. Include explanations, examples, and reasoning wherever helpful.

Context:
{context}

Question: {query}
Answer:"""


def ask_gemini(prompt, client):
    """Calls the Gemini API with the given prompt and returns the response."""
    response = client.models.generate_content(
        model="gemini-2.0-flash",  # Or your preferred model
        contents=[prompt],
        config=types.GenerateContentConfig(max_output_tokens=2048, temperature=0.5, seed=42),
    )
    return response.text