# LearnSphere AI

**LearnSphere AI** is a multimodal educational AI platform built with Next.js, React, TypeScript, and Groq.

It allows students to interact with learning materials using natural language. The application supports PDF-based Retrieval-Augmented Generation (RAG), document summarization, quiz generation, image understanding, conversational history, and follow-up questions.

## 🚀 Live Demo

**Live Application:**  
https://learnsphere-ai-ashen.vercel.app/

---

## ✨ Features

### 💬 AI Chat

- Ask general educational questions using natural language.
- Continue conversations with follow-up questions.
- Maintain contextual conversations.
- Conversation history is stored and can be reopened from the sidebar.

### 📄 PDF Upload & RAG

- Upload PDF learning materials.
- Extract and process PDF content.
- Split documents into relevant chunks.
- Retrieve relevant document context for questions.
- Generate answers using retrieved document information.

### 📝 PDF Summarization

- Generate AI-powered summaries from uploaded PDFs.
- Uses the uploaded document as the source for summarization.
- Helps students quickly understand lengthy learning materials.

### ❓ AI Quiz Generation

- Generate quizzes from uploaded PDF content.
- Supports configurable question count.
- Supports different difficulty levels.
- Allows users to answer questions interactively.
- Calculates quiz scores.
- Quiz activity can be revisited through conversation history.

### 🖼️ Multimodal Image Understanding

- Upload images directly in the chat.
- Ask questions about uploaded images.
- Analyze educational diagrams, screenshots, figures, and image content.
- Supports follow-up questions about previously uploaded images.

### 📚 Conversation History

- Conversations are automatically stored.
- Previous conversations can be reopened from the sidebar.
- Chat, PDF interactions, summaries, and quizzes can be revisited.

### 📱 Responsive Interface

- Designed for desktop and mobile screens.
- Responsive chat interface.
- Mobile-friendly conversation/history navigation.

---

# 🛠️ Technology Stack

## Frontend

- **Next.js 16** — Full-stack React framework
- **React 19** — User interface development
- **TypeScript** — Type-safe application development
- **CSS** — Application styling
- **React Markdown** — Rendering Markdown-based AI responses

## Backend

- **Next.js App Router** — Application and server-side API architecture
- **Next.js API Routes** — Backend endpoints for chat, upload, summarization, quizzes, and conversations
- **Node.js** — Server-side runtime

## Artificial Intelligence

- **Groq API** — AI inference
- **Groq AI Models** — Text generation and multimodal/image understanding
- **AI SDK** — Integration with AI models and streaming responses
- **Hugging Face Transformers** — Embedding generation
- **all-MiniLM-L6-v2** — Text embedding model
- **RAG (Retrieval-Augmented Generation)** — Retrieves relevant document content before generating answers

## Document Processing

- **PDF.js / pdfjs-dist** — PDF processing and text extraction
- **pdf-parse** — PDF content extraction
- **unpdf** — PDF processing utilities
- **Document Chunking** — Splits extracted content into smaller searchable sections

## Database & Storage

- **Supabase** — Database and backend services
- **Supabase JavaScript Client** — Application-to-database communication

## Deployment & Development

- **Vercel** — Production deployment and hosting
- **Git** — Version control
- **GitHub** — Source code repository and project management
- **npm** — Dependency management

---

# 🏗️ Application Architecture

```text
                         ┌──────────────────────┐
                         │     LearnSphere AI   │
                         │     Web Interface    │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
             ┌─────────────┐                 ┌─────────────┐
             │ Text Input  │                 │ Image Input │
             └──────┬──────┘                 └──────┬──────┘
                    │                               │
                    ▼                               ▼
             ┌─────────────┐                 ┌─────────────┐
             │ Next.js API │                 │ Vision Model│
             │   Routes    │                 └──────┬──────┘
             └──────┬──────┘                        │
                    │                               │
                    │ PDF Available?                │
                    │                               │
             ┌──────┴──────┐                        │
             │             │                        │
            Yes            No                       │
             │             │                        │
             ▼             ▼                        │
      ┌─────────────┐ ┌─────────────┐                │
      │ PDF Chunks  │ │   General   │                │
      │ & Retrieval │ │  Question   │                │
      └──────┬──────┘ └──────┬──────┘                │
             │                │                       │
             └────────┬───────┴───────────────────────┘
                      │
                      ▼
               ┌─────────────┐
               │   Groq AI   │
               │    Models   │
               └──────┬──────┘
                      │
             ┌────────┴─────────┐
             │                  │
             ▼                  ▼
      ┌─────────────┐    ┌─────────────┐
      │ AI Response │    │  Summary /  │
      │             │    │    Quiz     │
      └──────┬──────┘    └──────┬──────┘
             │                  │
             └────────┬─────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Conversation  │
              │    History    │
              └───────────────┘
