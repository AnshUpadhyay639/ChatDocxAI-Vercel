# ChatDocxAI

ChatDocxAI is an advanced document analysis and question-answering system that leverages the power of Google's Gemini AI to provide intelligent insights from your documents. This versatile tool allows you to upload various document formats and engage in natural conversations about their contents. Whether you're analyzing research papers, business reports, or any other document type, ChatDocxAI helps you extract meaningful information through simple questions.

The system employs sophisticated natural language processing techniques to:
- Break down complex documents into digestible chunks
- Maintain context awareness across the entire document
- Provide accurate, contextually relevant answers
- Handle multiple document formats seamlessly

Perfect for researchers, business analysts, students, and anyone who needs to quickly extract information from documents without manually reading through them.

## Features

- Support for multiple document formats:
  - PDF (.pdf)
  - Text (.txt)
  - Word Documents (.docx)
  - Excel Spreadsheets (.xlsx)
  - PowerPoint Presentations (.pptx)
  - XML files (.xml)
  - CSV files (.csv)
  - JSON files (.json)
- Interactive web interface using Gradio
- Intelligent document processing and chunking
- Advanced context retrieval for accurate answers
- Train on multiple documents at once

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/ChatDocxAI.git
cd ChatDocxAI
```

2. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Run the application:
```bash
python app.py
```

2. The application will start and provide you with two URLs:
   - A local URL (http://127.0.0.1:7860) for local access
   - A public URL (https://xxx.gradio.live) that anyone can access
   
   You can share the public URL with others to let them interact with your document Q&A system.

3. Upload your documents using the file upload interface

4. Click "Process Document" to analyze your uploaded files

5. Ask questions about your documents in the question box

## How It Works

1. **Document Processing**: When you upload documents, they are processed and split into manageable chunks
2. **Vector Storage**: The chunks are converted into vectors and stored for efficient retrieval
3. **Question Handling**: When you ask a question, the system:
   - Retrieves relevant context from your documents
   - Builds an intelligent prompt
   - Uses Gemini AI to generate accurate answers

## Dependencies

- gradio: For the web interface
- google-genai: For Gemini AI integration
- langchain: For document processing and chain operations
- faiss-cpu: For vector storage and retrieval
- sentence-transformers: For text embeddings
- unstructured: For document parsing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

