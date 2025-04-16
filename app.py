import gradio as gr
from utils import (
    authenticate,
    split_documents,
    build_vectorstore,
    retrieve_context,
    retrieve_context_approx,
    build_prompt,
    ask_gemini,
    load_documents_gradio,
    transcribe
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

def route_question(text_input, audio_input):
  if text_input.strip():
    return handle_question(text_input)
  elif audio_input is not None:
    transcribed = transcribe(audio_input)
    return handle_question(transcribed)
  else:
    return "Please provide a question by typing or speaking."

def show_audio():
  return gr.update(visible=True)

css="""
#micbttn {
  background-color: #FFCCCB;
  font-size: 30px;
  height: 59px;
}

#micINP {
  background-color: #FFCCCB;
}
"""

with gr.Blocks(css=css, theme='NoCrypt/miku') as demo:
  gr.Markdown("## Ask Questions from Your Uploaded Documents")
  file_input = gr.File(label="Upload Your File", file_types=['.pdf', '.txt', '.docx', '.csv', '.json', '.pptx', '.xml', '.xlsx'], file_count='multiple')

  process_btn = gr.Button("Process Document")
  status = gr.Textbox(label="Processing Status")

  gr.Markdown("### Ask your question (type or speak):")

  with gr.Row():
    text_question = gr.Textbox(placeholder="Type your question...", scale=9, show_label=False)
    mic_btn = gr.Button("🎤", scale=1, elem_id="micbttn")
  
  audio_input = gr.Audio(sources=["microphone"], type="numpy", visible=False, label=None, elem_id="micINP")
  
  submit_btn = gr.Button("Submit")
  answer = gr.Markdown()

  process_btn.click(upload_and_process, inputs=file_input, outputs=status)
  mic_btn.click(show_audio, outputs=audio_input)
  submit_btn.click(route_question, inputs=[text_question, audio_input], outputs=answer)

demo.launch(share=True)  # Or demo.deploy(hf_space="your-username/your-space-name")