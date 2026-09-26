# LearnSphere AI

LearnSphere AI is a multimodal educational chatbot built with Next.js and Groq.

It allows students to interact with learning materials using natural language. The application supports PDF-based Retrieval-Augmented Generation (RAG), document summarization, quiz generation, image understanding, conversational history, and follow-up questions.

## Features

### 💬 AI Chat

- Ask general educational questions using natural language.
- Continue conversations with follow-up questions.
- Conversation history is stored and can be reopened from the sidebar.

### 📄 PDF Upload and RAG

- Upload PDF learning materials.
- Extract and process PDF content.
- Retrieve relevant document chunks for user questions.
- Generate answers using the retrieved document context.
- Prevents the chatbot from relying only on general model knowledge when a relevant document is available.

### 📝 PDF Summarization

- Generate an AI summary from an uploaded PDF.
- Uses the document content as the source for the summary.

### ❓ AI Quiz Generation

- Generate quizzes from uploaded PDF content.
- Supports configurable question count and difficulty.
- Users can answer questions and receive a score.
- Quiz results can be reviewed.
- Quiz activity is stored in conversation history.

### 🖼️ Multimodal Image Understanding

- Upload an image directly in the chat.
- Ask questions about the image.
- Analyze diagrams, screenshots, educational figures, and image text.
- Supports follow-up questions about the previously attached image.

### 📚 Conversation History

- Conversations are automatically saved.
- Previous conversations can be opened from the sidebar.
- Chat, PDF-related interactions, summaries, and quizzes can be revisited.

### 📱 Responsive UI

- Designed for desktop and mobile screens.
- Mobile layout includes a compact conversation/history interface.

---

# Technology Stack

- **Frontend:** Next.js, React, TypeScript
- **Backend:** Next.js App Router API routes
- **AI:** Groq API
- **AI Models:** Groq-supported language and vision models
- **PDF Processing:** PDF text extraction and document chunking
- **RAG:** Retrieval-based document context injection
- **Styling:** CSS
- **Deployment:** Vercel
- **Version Control:** Git and GitHub

---

# Application Architecture

```text
                    LearnSphere AI
                          |
             +------------+------------+
             |                         |
          Text Input              Image Input
             |                         |
             v                         v
       Next.js API               Vision Model
             |
             v
       PDF Available?
          /       \
        Yes        No
        |           |
        v           v
   Retrieve PDF   General
     Chunks       Question
        |
        v
   Relevant Context
        |
        +-----------+
                    |
                    v
                Groq AI
                    |
                    v
              AI Response
                    |
                    v
             Conversation
                History

## Deployment

LearnSphere AI is deployed using Vercel.