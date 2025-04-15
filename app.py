import gradio as gr
from utils import (
    authenticate,
    split_documents,
    build_vectorstore,
    retrieve_context,
    retrieve_context_approx,
    build_prompt,
    ask_gemini,
    load_documents_gradio,  # Import the new function
)

client = authenticate()
store = {"value": None}


def upload_and_process(files):
    if files is None:
        return "Please upload a file!"

    raw_docs = load_documents_gradio(files)
    chunks = split_documents(raw_docs)
    store["value"] = build_vectorstore(chunks)
    return "Document processed successfully! You can now ask questions."


def handle_question(query):
    if store["value"] is None:
        return "Please upload and process a document first."

    if store["value"]["chunks"] <= 50:
        top_chunks = retrieve_context(query, store["value"])
    else:
        top_chunks = retrieve_context_approx(query, store["value"])

    prompt = build_prompt(top_chunks, query)
    answer = ask_gemini(prompt, client)
    return f"### My Insights :\n\n{answer.strip()}"


with gr.Blocks(theme='NoCrypt/miku') as demo:
    gr.Markdown("## Ask Questions from Your Uploaded Documents")
    #gr.Image(value="bg.JPG", visible=True)

    file_input = gr.File(label="Upload Your File", file_types=['.pdf', '.txt', '.docx', '.csv', '.json', '.pptx', '.xml', '.xlsx'], file_count='multiple')

    process_btn = gr.Button("Process Document")
    status = gr.Textbox(label="Processing Status")

    question = gr.Textbox(label="Ask a Question")
    answer = gr.Markdown()

    process_btn.click(upload_and_process, inputs=file_input, outputs=status)
    question.submit(handle_question, inputs=question, outputs=answer)

demo.launch(share=True)  # Or demo.deploy(hf_space="your-username/your-space-name")