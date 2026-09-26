"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ImageAttachment = {
  dataUrl: string;
  name: string;
  type: string;
};

type Conversation = {
  id: string;
  title: string;
  file_hash: string | null;
  filename?: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationResponse = {
  success?: boolean;
  conversation?: Conversation;
  conversations?: Conversation[];
  messages?: ChatMessage[];
  error?: string;
};

type UploadResponse = {
  success?: boolean;
  duplicate?: boolean;
  fileHash?: string;
  filename?: string;
  pages?: number;
  chunks?: number;
  message?: string;
  error?: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

type QuizResponse = {
  success?: boolean;
  questions?: QuizQuestion[];
  error?: string;
};

type SummaryResponse = {
  success?: boolean;
  filename?: string;
  chunks?: number;
  summary?: string;
  error?: string;
};

type ChatResponse = {
  success?: boolean;
  answer?: string;
  response?: string;
  message?: string;
  content?: string;
  error?: string;
  data?: {
    answer?: string;
    response?: string;
    message?: string;
    content?: string;
  };
  messages?: ChatMessage[];
};

/* =========================================================
   INLINE MARKDOWN
   ========================================================= */

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];

  const regex =
    /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];

    if (
      token.startsWith("**") &&
      token.endsWith("**")
    ) {
      parts.push(
        <strong key={`bold-${match.index}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (
      token.startsWith("__") &&
      token.endsWith("__")
    ) {
      parts.push(
        <strong key={`bold2-${match.index}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (
      token.startsWith("`") &&
      token.endsWith("`")
    ) {
      parts.push(
        <code
          key={`code-${match.index}`}
          className="inline-code"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      token.startsWith("*") &&
      token.endsWith("*")
    ) {
      parts.push(
        <em key={`italic-${match.index}`}>
          {token.slice(1, -1)}
        </em>
      );
    } else if (
      token.startsWith("_") &&
      token.endsWith("_")
    ) {
      parts.push(
        <em key={`italic2-${match.index}`}>
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-end-${lastIndex}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts;
}

/* =========================================================
   TABLE HELPERS
   ========================================================= */

function splitTableRow(line: string): string[] {
  let value = line.trim();

  if (value.startsWith("|")) {
    value = value.slice(1);
  }

  if (value.endsWith("|")) {
    value = value.slice(0, -1);
  }

  return value
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);

  if (cells.length === 0) {
    return false;
  }

  return cells.every((cell) =>
    /^:?-{3,}:?$/.test(cell)
  );
}

function isTableStart(
  lines: string[],
  index: number
): boolean {
  if (index + 1 >= lines.length) {
    return false;
  }

  const current = lines[index].trim();
  const next = lines[index + 1].trim();

  if (!current.includes("|")) {
    return false;
  }

  return isTableSeparator(next);
}

/* =========================================================
   MARKDOWN RENDERER
   ========================================================= */

function MarkdownContent({
  content,
}: {
  content: string;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  const elements: ReactNode[] = [];

  let index = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    const text = paragraph.join("\n").trim();

    if (text) {
      elements.push(
        <p
          key={`paragraph-${elements.length}`}
          className="markdown-paragraph"
        >
          {renderInlineMarkdown(
            text
          )}
        </p>
      );
    }

    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    /* Empty line */
    if (!trimmed) {
      flushParagraph();
      index++;
      continue;
    }

    /* =====================================================
       TABLE
       ===================================================== */

    if (isTableStart(lines, index)) {
      flushParagraph();

      const headerCells =
        splitTableRow(lines[index]);

      index += 2;

      const bodyRows: string[][] = [];

      while (
        index < lines.length &&
        lines[index].trim() &&
        lines[index].includes("|")
      ) {
        bodyRows.push(
          splitTableRow(lines[index])
        );

        index++;
      }

      elements.push(
        <div
          className="table-wrapper"
          key={`table-${elements.length}`}
        >
          <table className="markdown-table">
            <thead>
              <tr>
                {headerCells.map(
                  (cell, cellIndex) => (
                    <th key={cellIndex}>
                      {renderInlineMarkdown(
                        cell
                      )}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {bodyRows.map(
                (row, rowIndex) => (
                  <tr key={rowIndex}>
                    {headerCells.map(
                      (_, cellIndex) => (
                        <td key={cellIndex}>
                          {renderInlineMarkdown(
                            row[cellIndex] ??
                              ""
                          )}
                        </td>
                      )
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      );

      continue;
    }

    /* =====================================================
       CODE BLOCK
       ===================================================== */

    if (trimmed.startsWith("```")) {
      flushParagraph();

      const language =
        trimmed.slice(3).trim();

      index++;

      const codeLines: string[] = [];

      while (
        index < lines.length &&
        !lines[index].trim().startsWith("```")
      ) {
        codeLines.push(lines[index]);
        index++;
      }

      if (
        index < lines.length &&
        lines[index].trim().startsWith("```")
      ) {
        index++;
      }

      elements.push(
        <pre
          className="code-block"
          key={`code-block-${elements.length}`}
        >
          <code data-language={language}>
            {codeLines.join("\n")}
          </code>
        </pre>
      );

      continue;
    }

    /* =====================================================
       HEADINGS
       ===================================================== */

    const headingMatch =
      /^(#{1,6})\s+(.+)$/.exec(trimmed);

    if (headingMatch) {
      flushParagraph();

      const level =
        headingMatch[1].length;

      const headingText =
        headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1
            key={`h1-${elements.length}`}
            className="markdown-h1"
          >
            {renderInlineMarkdown(
              headingText
            )}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2
            key={`h2-${elements.length}`}
            className="markdown-h2"
          >
            {renderInlineMarkdown(
              headingText
            )}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3
            key={`h3-${elements.length}`}
            className="markdown-h3"
          >
            {renderInlineMarkdown(
              headingText
            )}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={`h4-${elements.length}`}
            className="markdown-h4"
          >
            {renderInlineMarkdown(
              headingText
            )}
          </h4>
        );
      }

      index++;
      continue;
    }

    /* =====================================================
       BULLET LIST
       ===================================================== */

    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ")
    ) {
      flushParagraph();

      const listItems: string[] = [];

      while (index < lines.length) {
        const current =
          lines[index].trim();

        if (
          current.startsWith("- ") ||
          current.startsWith("* ") ||
          current.startsWith("• ")
        ) {
          listItems.push(
            current.slice(2).trim()
          );
          index++;
        } else {
          break;
        }
      }

      elements.push(
        <ul
          className="markdown-list"
          key={`ul-${elements.length}`}
        >
          {listItems.map(
            (item, itemIndex) => (
              <li key={itemIndex}>
                {renderInlineMarkdown(
                  item
                )}
              </li>
            )
          )}
        </ul>
      );

      continue;
    }

    /* =====================================================
       NUMBERED LIST
       ===================================================== */

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();

      const listItems: string[] = [];

      while (index < lines.length) {
        const current =
          lines[index].trim();

        const match =
          /^\d+\.\s+(.+)$/.exec(
            current
          );

        if (match) {
          listItems.push(match[1]);
          index++;
        } else {
          break;
        }
      }

      elements.push(
        <ol
          className="markdown-list"
          key={`ol-${elements.length}`}
        >
          {listItems.map(
            (item, itemIndex) => (
              <li key={itemIndex}>
                {renderInlineMarkdown(
                  item
                )}
              </li>
            )
          )}
        </ol>
      );

      continue;
    }

    /* =====================================================
       HORIZONTAL RULE
       ===================================================== */

    if (
      /^(-{3,}|\*{3,}|_{3,})$/.test(
        trimmed
      )
    ) {
      flushParagraph();

      elements.push(
        <hr
          key={`hr-${elements.length}`}
          className="markdown-hr"
        />
      );

      index++;
      continue;
    }

    /* =====================================================
       NORMAL TEXT
       ===================================================== */

    paragraph.push(trimmed);
    index++;
  }

  flushParagraph();

  return (
    <div className="markdown-content">
      {elements}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function Home() {
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [
    activeFileHash,
    setActiveFileHash,
  ] = useState<string | null>(null);

  const [
    activeFilename,
    setActiveFilename,
  ] = useState<string | null>(null);

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([]);

  const [input, setInput] =
    useState("");

  const [imageAttachment, setImageAttachment] =
    useState<ImageAttachment | null>(null);

  // Keeps the most recently sent image available for follow-up questions
  // in the same chat, just like a normal multimodal conversation.
  const [conversationImage, setConversationImage] =
    useState<ImageAttachment | null>(null);

  const [imageLoading, setImageLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [uploadStatus, setUploadStatus] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [summary, setSummary] =
    useState<string>("");

  const [summarizing, setSummarizing] =
    useState(false);

  const [summaryError, setSummaryError] =
    useState<string | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizFinished, setQuizFinished] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  /* =====================================================
     START EACH BROWSER SESSION WITHOUT AN ACTIVE PDF
     ===================================================== */

  useEffect(() => {
    // Every browser session starts without an active PDF.
    setActiveFileHash(null);
    setActiveFilename(null);

    try {
      localStorage.removeItem("learnsphere_active_file_hash");
      localStorage.removeItem("learnsphere_active_filename");
    } catch {
      // Ignore localStorage errors.
    }

    loadConversations();
  }, []);

  /* =====================================================
     AUTO SCROLL
     ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, sending]);

  /* =====================================================
     CONVERSATION HISTORY
     ===================================================== */

  async function loadConversations() {
    setHistoryLoading(true);

    try {
      const response = await fetch("/api/conversations", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ConversationResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load conversation history.");
      }

      setConversations(data.conversations ?? []);
    } catch (historyError) {
      console.error("History load error:", historyError);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function createConversation(firstQuestion: string) {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: firstQuestion.slice(0, 60),
        fileHash: activeFileHash ?? null,
      }),
    });

    const data = (await response.json()) as ConversationResponse;

    if (!response.ok || !data.success || !data.conversation) {
      throw new Error(data.error ?? "Failed to create conversation.");
    }

    setConversationId(data.conversation.id);
    setConversations((current) => [data.conversation!, ...current.filter((item) => item.id !== data.conversation!.id)]);

    return data.conversation.id;
  }

  async function saveConversationMessage(
    id: string,
    role: "user" | "assistant",
    content: string
  ) {
    const response = await fetch(`/api/conversations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });

    const data = (await response.json()) as ConversationResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Failed to save conversation message.");
    }
  }

  async function loadConversation(id: string) {
    if (sending || historyLoading) return;

    setError(null);
    setUploadStatus(null);
    setSummary("");
    setSummaryError(null);
    setQuizQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setQuizFinished(false);
    setQuizError(null);

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as ConversationResponse;

      if (!response.ok || !data.success || !data.conversation) {
        throw new Error(data.error ?? "Failed to load conversation.");
      }

      setConversationId(id);
      setMessages(data.messages ?? []);

      const fileHash = data.conversation.file_hash ?? null;
      const filename = data.conversation.filename ?? null;

      setActiveFileHash(fileHash);
      setActiveFilename(filename);

      try {
        if (fileHash) {
          localStorage.setItem("learnsphere_active_file_hash", fileHash);
          if (filename) {
            localStorage.setItem("learnsphere_active_filename", filename);
          }
        } else {
          localStorage.removeItem("learnsphere_active_file_hash");
          localStorage.removeItem("learnsphere_active_filename");
        }
      } catch {
        // Ignore localStorage errors.
      }
    } catch (historyError) {
      console.error("Conversation load error:", historyError);
      setError(historyError instanceof Error ? historyError.message : "Failed to load conversation.");
    }
  }

  function startNewChat() {
    if (sending) return;

    /*
     * Start a completely clean study session.
     *
     * Important:
     * - Do NOT delete the previous conversation from the database.
     * - Only clear the current session state.
     * - Clear the active PDF so a new chat never inherits the
     *   previous PDF.
     * - Clear localStorage so the PDF does not reappear later.
     */

    setConversationId(null);
    setMessages([]);
    setInput("");
    setConversationImage(null);
    setError(null);
    setUploadStatus(null);

    // Clear PDF state
    setSelectedFile(null);
    setActiveFileHash(null);
    setActiveFilename(null);

    // Clear summary state
    setSummary("");
    setSummaryError(null);

    // Clear quiz state
    setQuizQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setQuizFinished(false);
    setQuizError(null);

    // Remove any previously active PDF persisted locally.
    try {
      localStorage.removeItem("learnsphere_active_file_hash");
      localStorage.removeItem("learnsphere_active_filename");
    } catch (storageError) {
      console.error(
        "Could not clear active PDF from localStorage:",
        storageError
      );
    }

    // Clear the native file input as well.
    const fileInput = document.getElementById(
      "pdf-upload"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function deleteConversation(id: string) {
    if (sending) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as ConversationResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete conversation.");
      }

      setConversations((current) => current.filter((item) => item.id !== id));

      if (conversationId === id) {
        startNewChat();
      }
    } catch (deleteError) {
      console.error("Conversation delete error:", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete conversation.");
    }
  }

  function conversationGroup(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const difference = Math.floor((today.getTime() - itemDay.getTime()) / 86400000);

    if (difference === 0) return "Today";
    if (difference === 1) return "Yesterday";
    if (difference <= 7) return "Previous 7 days";
    return "Older";
  }

  function groupedConversations() {
    const groups: Record<string, Conversation[]> = {};
    for (const conversation of conversations) {
      const group = conversationGroup(conversation.updated_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(conversation);
    }
    return groups;
  }

  /* =====================================================
     FILE SELECTION
     ===================================================== */

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setError(null);
    setUploadStatus(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setSelectedFile(null);

      setError(
        "Please select a PDF file."
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  /* =====================================================
     UPLOAD PDF
     ===================================================== */

  async function handleUpload() {
    if (!selectedFile) {
      setError(
        "Please choose a PDF first."
      );
      return;
    }

    if (uploading) {
      return;
    }

    setUploading(true);
    setError(null);
    setUploadStatus(
      "Uploading PDF... Please wait while LearnSphere processes it."
    );

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

      let data: UploadResponse;

      try {
        data =
          (await response.json()) as UploadResponse;
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Failed to upload PDF."
        );
      }

      /* =================================================
         IMPORTANT:
         BOTH NEW AND DUPLICATE PDFs RETURN fileHash.
         ALWAYS MAKE IT ACTIVE.
         ================================================= */

      if (!data.fileHash) {
        throw new Error(
          "PDF uploaded, but the server did not return a file hash."
        );
      }

      const filename =
        data.filename ??
        selectedFile.name;

      setActiveFileHash(
        data.fileHash
      );

      setActiveFilename(
        filename
      );

      if (conversationId) {
        try {
          await fetch(`/api/conversations/${conversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileHash: data.fileHash,
              title: undefined,
            }),
          });
          await loadConversations();
        } catch (historyError) {
          console.error("Could not attach PDF to conversation:", historyError);
        }
      }

      setSummary("");
      setSummaryError(null);

      /* Persist active PDF */
      try {
        localStorage.setItem(
          "learnsphere_active_file_hash",
          data.fileHash
        );

        localStorage.setItem(
          "learnsphere_active_filename",
          filename
        );
      } catch (storageError) {
        console.error(
          "Could not save active PDF:",
          storageError
        );
      }

      setUploadStatus(
        data.duplicate
          ? `✓ ${filename} is already uploaded. It is now ready as the active PDF.`
          : `✓ ${filename} uploaded and processed successfully.`
      );

      setSelectedFile(null);

      /* Clear native file input */
      const fileInput =
        document.getElementById(
          "pdf-upload"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (uploadError) {
      console.error(
        "Upload error:",
        uploadError
      );

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload PDF."
      );

      setUploadStatus(null);
    } finally {
      setUploading(false);
    }
  }

  /* =====================================================
     EXTRACT AI RESPONSE
     ===================================================== */

  function extractAnswer(
    data: ChatResponse
  ): string {
    if (
      typeof data.answer === "string" &&
      data.answer.trim()
    ) {
      return data.answer;
    }

    if (
      typeof data.response === "string" &&
      data.response.trim()
    ) {
      return data.response;
    }

    if (
      typeof data.content === "string" &&
      data.content.trim()
    ) {
      return data.content;
    }

    if (
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }

    if (
      data.data &&
      typeof data.data.answer === "string" &&
      data.data.answer.trim()
    ) {
      return data.data.answer;
    }

    if (
      data.data &&
      typeof data.data.response === "string" &&
      data.data.response.trim()
    ) {
      return data.data.response;
    }

    if (
      data.data &&
      typeof data.data.content === "string" &&
      data.data.content.trim()
    ) {
      return data.data.content;
    }

    if (
      data.data &&
      typeof data.data.message === "string" &&
      data.data.message.trim()
    ) {
      return data.data.message;
    }

    if (
      Array.isArray(data.messages)
    ) {
      const assistantMessages =
        data.messages.filter(
          (message) =>
            message &&
            message.role ===
              "assistant" &&
            typeof message.content ===
              "string"
        );

      const lastAssistant =
        assistantMessages[
          assistantMessages.length - 1
        ];

      if (
        lastAssistant?.content
      ) {
        return lastAssistant.content;
      }
    }

    return "";
  }

  /* =====================================================
     IMAGE ATTACHMENT
     ===================================================== */

  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    // Groq vision requests currently allow up to 20 MB per image.
    // Keep the client limit lower to avoid oversized browser requests.
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setImageLoading(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Could not read the selected image."));
          }
        };

        reader.onerror = () => {
          reject(new Error("Could not read the selected image."));
        };

        reader.readAsDataURL(file);
      });

      setImageAttachment({
        dataUrl,
        name: file.name,
        type: file.type,
      });
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Could not attach the image."
      );
    } finally {
      setImageLoading(false);
      event.target.value = "";
    }
  }

  function removeImageAttachment() {
    if (sending) {
      return;
    }

    setImageAttachment(null);
  }

  /* =====================================================
     SEND MESSAGE
     ===================================================== */

  async function sendMessage(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const question =
      input.trim();

    if (!question && !imageAttachment) {
      return;
    }

    if (sending || imageLoading) {
      return;
    }

    setError(null);

    const imageForRequest =
      imageAttachment ?? conversationImage ?? null;

    const displayQuestion =
      question ||
      `Image attached: ${imageForRequest?.name ?? "image"}`;

    const userMessage: ChatMessage = {
      role: "user",
      content: displayQuestion,
    };

    /*
      IMPORTANT:
      Build a real messages array.

      This prevents:
      "No messages were provided."
      and
      "Cannot read properties of undefined (reading 'filter')"
    */

    const updatedMessages: ChatMessage[] =
      [
        ...messages,
        userMessage,
      ];

    setMessages(updatedMessages);
    setInput("");

    // Keep the image as conversation context so a follow-up such as
    // "Explain this diagram step by step" still has access to it.
    if (imageAttachment) {
      setConversationImage(imageAttachment);
    }

    setImageAttachment(null);
    setSending(true);

    let currentConversationId = conversationId;

    try {
      if (!currentConversationId) {
        currentConversationId =
          await createConversation(displayQuestion);
      }

      await saveConversationMessage(
        currentConversationId,
        "user",
        displayQuestion
      );
      /*
        Send BOTH:
        - messages
        - question
        - fileHash

        This makes the frontend compatible
        with the current /api/chat route.
      */

      const response =
        await fetch("/api/chat", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            messages:
              updatedMessages,

            question:
              question || displayQuestion,

            fileHash:
              activeFileHash ?? null,

            activeFileHash:
              activeFileHash ?? null,

            imageData:
              imageForRequest?.dataUrl ?? null,

            imageName:
              imageForRequest?.name ?? null,

            imageMimeType:
              imageForRequest?.type ?? null,
          }),
        });

      let data: ChatResponse;

      try {
        data =
          (await response.json()) as ChatResponse;
      } catch {
        throw new Error(
          "The chat server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to get response."
        );
      }

      const answer =
        extractAnswer(data);

      if (!answer) {
        throw new Error(
          "The AI returned an empty response."
        );
      }

      const assistantMessage: ChatMessage =
        {
          role: "assistant",
          content: answer,
        };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      await saveConversationMessage(
        currentConversationId,
        "assistant",
        answer
      );

      await loadConversations();
    } catch (chatError) {
      console.error(
        "[browser] Chat error:",
        chatError
      );

      const errorMessage =
        chatError instanceof Error
          ? chatError.message
          : "Failed to get response.";

      setError(errorMessage);

      /*
        Keep the user's question visible,
        but don't add a fake assistant response.
      */
    } finally {
      setSending(false);
    }
  }

  /* =====================================================
     SUMMARIZE ACTIVE PDF
     ===================================================== */

  async function summarizePdf() {
    if (!activeFileHash) {
      setSummaryError(
        "Please upload a PDF first."
      );
      return;
    }

    if (summarizing) {
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    setUploadStatus("PDF is ready. Generating your structured summary...");

    try {
      const response = await fetch(
        "/api/summarize",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fileHash: activeFileHash,
          }),
        }
      );

      let data: SummaryResponse;

      try {
        data =
          (await response.json()) as SummaryResponse;
      } catch {
        throw new Error(
          "The summary server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Failed to generate PDF summary."
        );
      }

      if (
        !data.summary ||
        !data.summary.trim()
      ) {
        throw new Error(
          "The PDF summary was empty."
        );
      }

      const generatedSummary =
        data.summary.trim();

      setSummary(generatedSummary);
      setUploadStatus("✓ Summary generated successfully.");

      /* =================================================
         SAVE SUMMARY INTO CONVERSATION HISTORY

         A summary is a study action, so it should remain
         available when the user opens this conversation
         later. If there is no conversation yet, create one
         first and attach the active PDF to it.
         ================================================= */

      let currentConversationId =
        conversationId;

      if (!currentConversationId) {
        const title =
          activeFilename
            ? `Summary: ${activeFilename}`
            : "PDF Summary";

        currentConversationId =
          await createConversation(title);
      }

      /* Avoid storing the exact same summary twice if the
         user clicks Summarize again in the same conversation. */
      const alreadyStored =
        messages.some(
          (message) =>
            message.role ===
              "assistant" &&
            message.content.trim() ===
              generatedSummary
        );

      if (!alreadyStored) {
        const summaryMessage: ChatMessage = {
          role: "assistant",
          content: generatedSummary,
        };

        setMessages((current) => [
          ...current,
          summaryMessage,
        ]);

        await saveConversationMessage(
          currentConversationId,
          "assistant",
          generatedSummary
        );
      }

      /* Keep the conversation list timestamp/title fresh. */
      await loadConversations();
    } catch (summaryError) {
      console.error(
        "Summary error:",
        summaryError
      );

      setSummaryError(
        summaryError instanceof Error
          ? summaryError.message
          : "Failed to generate PDF summary."
      );
    } finally {
      setSummarizing(false);
    }
  }

  /* =====================================================
     QUIZ
     ===================================================== */

  async function generateQuiz() {
    if (!activeFileHash || quizLoading) return;
    setQuizLoading(true); setQuizError(null); setQuizQuestions([]);
    setUploadStatus("PDF is ready. Creating your quiz...");
    setSelectedAnswers({}); setCurrentQuestion(0); setQuizFinished(false);
    try {
      const response = await fetch("/api/quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileHash: activeFileHash, questionCount: quizCount, difficulty: quizDifficulty }),
      });
      const data = (await response.json()) as QuizResponse;
      if (!response.ok || !data.success) throw new Error(data.error ?? "Failed to generate quiz.");
      if (!data.questions?.length) throw new Error("No quiz questions were generated.");
      setQuizQuestions(data.questions);
      setUploadStatus(`✓ Quiz generated successfully — ${data.questions.length} questions ready.`);
    } catch (err) {
      console.error("Quiz error:", err);
      setQuizError(err instanceof Error ? err.message : "Failed to generate quiz.");
      setUploadStatus(null);
    } finally { setQuizLoading(false); }
  }

  function selectQuizAnswer(answer: string) {
    setSelectedAnswers((current) => ({ ...current, [currentQuestion]: answer }));
  }

  function resetQuiz() {
    setQuizQuestions([]); setSelectedAnswers({}); setCurrentQuestion(0);
    setQuizFinished(false); setQuizError(null);
  }

  const quizScore = quizQuestions.reduce((score, question, index) =>
    score + (selectedAnswers[index] === question.answer ? 1 : 0), 0
  );

  /* =====================================================
     CLEAR CHAT
     ===================================================== */

  function clearChat() {
    startNewChat();
  }

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          background: #020617;
          color: #f8fafc;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        body {
          min-height: 100vh;
        }

        button,
        input {
          font: inherit;
        }

        .app-shell {
          min-height: 100vh;
          display: flex;
          background: #020617;
        }

        .history-sidebar {
          width: 270px;
          flex: 0 0 270px;
          min-height: 100vh;
          border-right: 1px solid #1e293b;
          background: #0b1220;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .history-mobile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .history-brand {
          padding: 7px 9px 10px;
          color: #f8fafc;
          font-size: 15px;
          font-weight: 800;
        }

        .history-close {
          display: none;
          width: 34px;
          height: 34px;
          border: 1px solid #334155;
          border-radius: 9px;
          background: #111827;
          color: #cbd5e1;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .history-overlay {
          display: none;
          border: 0;
          padding: 0;
          margin: 0;
          background: rgba(0, 0, 0, 0.58);
        }

        .new-chat-button {
          width: 100%;
          border: 1px solid #334155;
          background: #111827;
          color: #f8fafc;
          border-radius: 8px;
          padding: 10px 11px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }

        .new-chat-button:hover {
          background: #1e293b;
        }

        .history-list {
          flex: 1;
          overflow-y: auto;
          padding-right: 2px;
        }

        .history-group-title {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          padding: 12px 8px 5px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 5px;
          width: 100%;
          margin-bottom: 2px;
          border: 1px solid transparent;
          background: transparent;
          color: #cbd5e1;
          border-radius: 7px;
          padding: 9px 7px;
          text-align: left;
          cursor: pointer;
        }

        .history-item:hover {
          background: #172033;
        }

        .history-item.active {
          background: #1e293b;
          border-color: #334155;
          color: #fff;
        }

        .history-title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 13px;
        }

        .history-delete {
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          border-radius: 5px;
          padding: 3px 5px;
          opacity: 0;
        }

        .history-item:hover .history-delete,
        .history-item.active .history-delete {
          opacity: 1;
        }

        .history-delete:hover {
          color: #fca5a5;
          background: #450a0a;
        }

        .history-empty {
          color: #64748b;
          font-size: 12px;
          padding: 16px 8px;
          line-height: 1.5;
        }

        .history-toggle {
          display: none;
          border: 1px solid #334155;
          background: #111827;
          color: #cbd5e1;
          border-radius: 7px;
          padding: 7px 9px;
          cursor: pointer;
        }

        .main-area {
          flex: 1;
          min-width: 0;
        }

        .page {
          min-height: 100vh;
          padding: 28px 16px 40px;
          background: #020617;
        }

        .container {
          width: 100%;
          max-width: 820px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 22px;
        }

        .header h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .header p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .card {
          background: #111827;
          border: 1px solid #1e293b;
          border-radius: 12px;
          box-shadow:
            0 10px 30px
              rgba(0, 0, 0, 0.2);
        }

        .upload-card {
          padding: 18px;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .section-description {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 14px;
        }

        .upload-row {
          display: flex;
          gap: 10px;
          align-items: stretch;
        }

        .file-input-wrapper {
          flex: 1;
          min-width: 0;
          border: 1px solid #334155;
          background: #020617;
          border-radius: 9px;
          padding: 7px;
        }

        .file-input {
          width: 100%;
          color: #cbd5e1;
          cursor: pointer;
        }

        .file-input::file-selector-button {
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 13px;
          border-radius: 6px;
          margin-right: 10px;
          cursor: pointer;
          font-weight: 600;
        }

        .upload-button {
          border: none;
          border-radius: 9px;
          padding: 0 20px;
          background: #047857;
          color: white;
          font-weight: 700;
          cursor: pointer;
          min-width: 110px;
        }

        .upload-button:hover:not(:disabled) {
          background: #059669;
        }

        .upload-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .status {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 7px;
          border: 1px solid #065f46;
          background: #052e2b;
          color: #86efac;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status.processing {
          border-color: #1d4ed8;
          background: #0b1b3a;
          color: #93c5fd;
        }

        .status-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #334155;
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: status-spin .8s linear infinite;
          flex: 0 0 12px;
        }

        @keyframes status-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 7px;
          border: 1px solid #7f1d1d;
          background: #450a0a;
          color: #fca5a5;
          font-size: 13px;
        }

        .active-file {
          margin-top: 12px;
          padding: 13px;
          border-radius: 8px;
          border: 1px solid #2563eb;
          background: #111c3d;
        }

        .active-file-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #60a5fa;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 7px;
        }

        .active-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
        }

        .active-file-name {
          color: #e2e8f0;
          font-size: 13px;
          word-break: break-word;
        }

        .active-file-description {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 5px;
        }


        .quiz-card { margin-bottom: 16px; padding: 18px; }
        .quiz-description { color:#94a3b8; font-size:13px; margin:5px 0 14px; }
        .quiz-controls { display:flex; gap:10px; margin-bottom:12px; }
        .quiz-control { flex:1; }
        .quiz-control label { display:block; color:#cbd5e1; font-size:12px; font-weight:700; margin-bottom:6px; }
        .quiz-control select { width:100%; background:#020617; color:#f8fafc; border:1px solid #334155; border-radius:8px; padding:9px; }
        .quiz-button { border:none; border-radius:8px; padding:10px 15px; background:#7c3aed; color:white; font-weight:700; cursor:pointer; }
        .quiz-button:disabled { opacity:.55; cursor:not-allowed; }
        .quiz-error { margin-top:10px; padding:10px 12px; border-radius:7px; border:1px solid #7f1d1d; background:#450a0a; color:#fca5a5; font-size:13px; }
        .quiz-progress { color:#60a5fa; font-size:12px; font-weight:700; margin:18px 0 10px; }
        .quiz-question { font-size:17px; font-weight:700; line-height:1.5; margin-bottom:14px; }
        .quiz-options { display:flex; flex-direction:column; gap:8px; }
        .quiz-option { width:100%; display:flex; gap:10px; align-items:center; text-align:left; padding:11px; border:1px solid #334155; border-radius:8px; background:#0f172a; color:#cbd5e1; cursor:pointer; }
        .quiz-option.selected { border-color:#7c3aed; background:#2e1065; color:#fff; }
        .quiz-letter { width:26px; height:26px; min-width:26px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#1e293b; font-size:12px; font-weight:700; }
        .quiz-actions { display:flex; justify-content:space-between; gap:10px; margin-top:15px; }
        .quiz-secondary { border:1px solid #334155; background:#1e293b; color:#cbd5e1; border-radius:8px; padding:10px 15px; cursor:pointer; }
        .quiz-secondary:disabled { opacity:.35; cursor:not-allowed; }
        .quiz-review { margin-top:18px; padding-top:16px; border-top:1px solid #1e293b; }
        .quiz-score { text-align:center; font-size:38px; font-weight:800; color:#60a5fa; margin:8px 0 20px; }
        .review-item { padding:14px; margin-bottom:10px; border:1px solid #334155; border-radius:9px; background:#0b1220; }
        .review-question { font-weight:700; line-height:1.45; margin-bottom:9px; }
        .review-answer { font-size:13px; margin:4px 0; color:#cbd5e1; }
        .review-correct { color:#86efac; font-weight:700; }
        .review-wrong { color:#fca5a5; font-weight:700; }
        .review-explanation { margin-top:9px; padding-top:9px; border-top:1px solid #243047; color:#94a3b8; font-size:13px; line-height:1.5; }

        .summary-card {
          margin-bottom: 16px;
          padding: 18px;
        }

        .summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .summary-title {
          font-size: 16px;
          font-weight: 700;
        }

        .summary-description {
          color: #94a3b8;
          font-size: 13px;
          margin-bottom: 14px;
        }

        .summary-button {
          border: none;
          border-radius: 8px;
          padding: 10px 15px;
          background: #7c3aed;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .summary-button:hover:not(:disabled) {
          background: #6d28d9;
        }

        .summary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .summary-error {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 7px;
          border: 1px solid #7f1d1d;
          background: #450a0a;
          color: #fca5a5;
          font-size: 13px;
        }

        .summary-content {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #1e293b;
        }

        .summary-content .markdown-content {
          background: #0b1220;
          border: 1px solid #243047;
          border-radius: 10px;
          padding: 16px;
        }

        .chat-card {
          overflow: hidden;
        }

        .chat-header {
          padding: 12px 16px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-title {
          font-size: 13px;
          font-weight: 700;
        }

        .chat-subtitle {
          color: #64748b;
          font-size: 11px;
          margin-top: 3px;
        }

        .clear-button {
          border: 1px solid #334155;
          background: transparent;
          color: #cbd5e1;
          border-radius: 7px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .clear-button:hover {
          background: #1e293b;
        }

        .messages {
          padding: 18px;
          min-height: 420px;
          max-height: 700px;
          overflow-y: auto;
        }

        .message-row {
          display: flex;
          margin-bottom: 14px;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .message-row.assistant {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 92%;
          border-radius: 10px;
          padding: 11px 13px;
          line-height: 1.65;
          font-size: 14px;
        }

        .user-bubble {
          background: #2563eb;
          color: white;
          border-top-right-radius: 4px;
        }

        .assistant-bubble {
          background: #1e293b;
          color: #e2e8f0;
          border: 1px solid #334155;
          border-top-left-radius: 4px;
        }

        .message-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #94a3b8;
          letter-spacing: 0.2px;
        }

        .user-bubble .message-label {
          color: #dbeafe;
        }

        .markdown-content {
          width: 100%;
          overflow-wrap: anywhere;
        }

        .markdown-paragraph {
          margin: 0 0 12px;
        }

        .markdown-paragraph:last-child {
          margin-bottom: 0;
        }

        .markdown-h1,
        .markdown-h2,
        .markdown-h3,
        .markdown-h4 {
          margin: 15px 0 8px;
          color: #f8fafc;
          line-height: 1.35;
        }

        .markdown-h1 {
          font-size: 22px;
        }

        .markdown-h2 {
          font-size: 19px;
        }

        .markdown-h3 {
          font-size: 17px;
        }

        .markdown-h4 {
          font-size: 15px;
        }

        .markdown-list {
          margin: 7px 0 13px;
          padding-left: 22px;
        }

        .markdown-list li {
          margin: 4px 0;
        }

        .inline-code {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 4px;
          padding: 2px 5px;
          color: #93c5fd;
          font-family:
            Consolas,
            Monaco,
            monospace;
          font-size: 0.9em;
        }

        .code-block {
          background: #020617;
          border: 1px solid #334155;
          border-radius: 7px;
          padding: 12px;
          overflow-x: auto;
          margin: 12px 0;
        }

        .code-block code {
          font-family:
            Consolas,
            Monaco,
            monospace;
          color: #cbd5e1;
          font-size: 13px;
          white-space: pre;
        }

        /* =================================================
           REAL TABLE
           ================================================= */

        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          margin: 14px 0;
          border: 1px solid #334155;
          border-radius: 7px;
        }

        .markdown-table {
          width: 100%;
          min-width: 500px;
          border-collapse: collapse;
          table-layout: auto;
          background: #1e293b;
        }

        .markdown-table th {
          background: #1e293b;
          color: #f8fafc;
          font-weight: 700;
          text-align: left;
          padding: 10px;
          border: 1px solid #334155;
          vertical-align: top;
        }

        .markdown-table td {
          color: #cbd5e1;
          padding: 10px;
          border: 1px solid #334155;
          vertical-align: top;
          line-height: 1.5;
        }

        .markdown-table tr:nth-child(even) td {
          background: #172033;
        }

        .markdown-table tr:hover td {
          background: #243147;
        }

        .markdown-hr {
          border: none;
          border-top: 1px solid #334155;
          margin: 15px 0;
        }

        .typing {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 0;
        }

        .typing span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94a3b8;
          animation: typing 1.2s infinite;
        }

        .typing span:nth-child(2) {
          animation-delay: 0.15s;
        }

        .typing span:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }

          30% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }

        .image-attachment {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-top: 1px solid #1e293b;
          background: #07111f;
        }

        .image-attachment-preview {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid #334155;
          background: #020617;
        }

        .image-attachment-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .image-attachment-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #cbd5e1;
          font-size: 12px;
        }

        .image-attachment-info strong {
          color: #f8fafc;
          font-size: 12px;
        }

        .image-attachment-info span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .image-remove-button {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          border: 1px solid #334155;
          border-radius: 8px;
          background: #111827;
          color: #cbd5e1;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
        }

        .image-remove-button:hover:not(:disabled) {
          background: #1e293b;
        }

        .image-button {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #334155;
          border-radius: 8px;
          background: #0f172a;
          color: #cbd5e1;
          cursor: pointer;
          font-size: 18px;
        }

        .image-button:hover {
          border-color: #2563eb;
          background: #111c31;
        }

        .input-area {
          padding: 12px;
          border-top: 1px solid #1e293b;
          display: flex;
          gap: 8px;
        }

        .message-input {
          flex: 1;
          min-width: 0;
          border: 1px solid #334155;
          background: #020617;
          color: #f8fafc;
          border-radius: 8px;
          padding: 10px 12px;
          outline: none;
        }

        .message-input:focus {
          border-color: #2563eb;
        }

        .send-button {
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 8px;
          padding: 0 17px;
          font-weight: 700;
          cursor: pointer;
        }

        .send-button:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .history-sidebar {
            width: 230px;
            flex-basis: 230px;
          }
        }

        @media (max-width: 650px) {
          html,
          body {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .app-shell {
            display: block;
            width: 100%;
            min-height: 100dvh;
          }

          .history-sidebar {
            display: none;
            position: fixed;
            inset: 0 auto 0 0;
            z-index: 100;
            width: min(84vw, 310px);
            height: 100dvh;
            min-height: 100dvh;
            padding: 14px 10px;
            box-shadow: 12px 0 35px rgba(0, 0, 0, 0.45);
            overflow: hidden;
            z-index: 100;
          }

          .history-sidebar.open {
            display: flex;
            z-index: 100;
          }

          .history-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 34px;
          }

          .history-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 95;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.62);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            cursor: pointer;
          }

          .history-list {
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .history-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            position: fixed;
            z-index: 90;
            top: calc(10px + env(safe-area-inset-top));
            left: 10px;
            width: 42px;
            min-width: 42px;
            height: 42px;
            padding: 0;
            margin: 0;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.94);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            font-size: 20px;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
          }

          .main-area {
            width: 100%;
            min-width: 0;
          }

          .page {
            width: 100%;
            min-height: 100dvh;
            padding: 68px 12px calc(28px + env(safe-area-inset-bottom));
            overflow-x: hidden;
          }

          .container {
            width: 100%;
            max-width: 100%;
            margin: 0;
          }

          .header {
            margin: 0 0 16px;
            padding: 0 8px;
          }

          .header h1 {
            font-size: 25px;
            line-height: 1.15;
          }

          .header p {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.45;
          }

          .card {
            width: 100%;
            border-radius: 14px;
          }

          .upload-card,
          .summary-card,
          .quiz-card,
          .chat-card {
            margin-bottom: 12px;
          }

          .upload-card {
            padding: 14px;
          }

          .upload-row {
            display: flex;
            flex-direction: column;
            gap: 9px;
          }

          .file-input-wrapper {
            width: 100%;
            min-width: 0;
          }

          .file-input {
            width: 100%;
            max-width: 100%;
          }

          .upload-button,
          .summary-button,
          .quiz-button {
            width: 100%;
            min-height: 44px;
          }

          .status {
            font-size: 12px;
            line-height: 1.45;
          }

          .chat-card {
            overflow: hidden;
          }

          .chat-header {
            padding: 12px 14px;
          }

          .messages {
            min-height: 280px;
            max-height: 55dvh;
            padding: 10px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }

          .message-bubble {
            max-width: 92%;
            padding: 10px 12px;
            font-size: 14px;
            line-height: 1.5;
            overflow-wrap: anywhere;
          }

          .message-bubble table {
            display: block;
            width: 100%;
            overflow-x: auto;
            white-space: nowrap;
          }

          .image-attachment {
            padding: 8px 10px;
          }

          .image-button {
            width: 42px;
            flex-basis: 42px;
          }

          .input-area {
            position: sticky;
            bottom: 0;
            z-index: 20;
            display: flex;
            gap: 8px;
            padding: 10px;
            padding-bottom: calc(10px + env(safe-area-inset-bottom));
            background: rgba(15, 23, 42, 0.97);
            border-top: 1px solid #1e293b;
            backdrop-filter: blur(12px);
          }

          .message-input {
            min-width: 0;
            width: 100%;
            height: 44px;
            font-size: 16px;
          }

          .send-button {
            flex: 0 0 72px;
            min-width: 72px;
            min-height: 44px;
          }

          .quiz-controls,
          .quiz-actions {
            flex-direction: column;
            gap: 9px;
          }

          .quiz-control,
          .quiz-secondary,
          .quiz-button {
            width: 100%;
          }

          .quiz-option {
            min-height: 48px;
            padding: 10px;
            font-size: 14px;
          }

          .summary-content {
            overflow-x: auto;
          }

          .summary-content table {
            min-width: 560px;
          }
        }

        @media (max-width: 380px) {
          .page {
            padding-left: 8px;
            padding-right: 8px;
          }

          .header h1 {
            font-size: 22px;
          }

          .send-button {
            flex-basis: 64px;
            min-width: 64px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .message-bubble {
            max-width: 95%;
          }
        }

      `}</style>

      <div className="app-shell">
        <aside className={`history-sidebar ${historyOpen ? "open" : ""}`}>
          <div className="history-mobile-header">
            <div className="history-brand">LearnSphere AI</div>
            <button
              type="button"
              className="history-close"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
            >
              ×
            </button>
          </div>
          <button
            type="button"
            className="new-chat-button"
            onClick={startNewChat}
          >
            ＋ New Chat
          </button>

          <div className="history-list">
            {historyLoading && conversations.length === 0 ? (
              <div className="history-empty">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="history-empty">Your previous conversations will appear here.</div>
            ) : (
              Object.entries(groupedConversations()).map(([group, items]) => (
                <div key={group}>
                  <div className="history-group-title">{group}</div>
                  {items.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`history-item ${conversation.id === conversationId ? "active" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => { loadConversation(conversation.id); setHistoryOpen(false); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          loadConversation(conversation.id);
                          setHistoryOpen(false);
                        }
                      }}
                    >
                      <span className="history-title">{conversation.title}</span>
                      <button
                        type="button"
                        className="history-delete"
                        title="Delete conversation"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {historyOpen && (
          <button
            type="button"
            className="history-overlay"
            aria-label="Close history"
            onClick={() => setHistoryOpen(false)}
          />
        )}

        <button
          type="button"
          className="history-toggle"
          aria-label="Open conversation history"
          title="History"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          ☰
        </button>

        <div className="main-area">
          <main className="page">
            <div className="container">

          {/* =================================================
              HEADER
              ================================================= */}

          <header className="header">
            <h1>
              LearnSphere AI
            </h1>

            <p>
              Your Multimodal AI Study Assistant
            </p>
          </header>

          {/* =================================================
              UPLOAD SECTION
              ================================================= */}

          <section className="card upload-card">
            <div className="section-title">
              📄 Upload Study Material
            </div>

            <div className="section-description">
              Upload a PDF and ask questions
              about its contents.
            </div>

            <div className="upload-row">
              <div className="file-input-wrapper">
                <input
                  id="pdf-upload"
                  className="file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={
                    handleFileChange
                  }
                  disabled={uploading}
                />
              </div>

              <button
                type="button"
                className="upload-button"
                onClick={
                  handleUpload
                }
                disabled={
                  !selectedFile ||
                  uploading
                }
              >
                {uploading
                  ? "Uploading..."
                  : "Upload PDF"}
              </button>
            </div>

            {/* Upload status */}

            {uploadStatus && (
              <div
                className={`status ${
                  uploading || summarizing || quizLoading
                    ? "processing"
                    : ""
                }`}
              >
                {uploading || summarizing || quizLoading ? (
                  <span className="status-spinner" />
                ) : (
                  <span>●</span>
                )}
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* Error */}

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            {/* =================================================
                ACTIVE PDF
                ================================================= */}

            {activeFileHash &&
              activeFilename && (
                <div className="active-file">
                  <div className="active-file-title">
                    <span className="active-dot" />
                    Active PDF
                  </div>

                  <div className="active-file-name">
                    {activeFilename}
                  </div>

                  <div className="active-file-description">
                    Ask questions about
                    this document.
                  </div>
                </div>
              )}
          </section>

          {/* =================================================
              PDF SUMMARY
              ================================================= */}

          {activeFileHash && (
            <section className="card summary-card">
              <div className="summary-header">
                <div>
                  <div className="summary-title">
                    📝 PDF Summary
                  </div>

                  <div className="summary-description">
                    Generate a structured summary from
                    the currently active PDF.
                  </div>
                </div>

                <button
                  type="button"
                  className="summary-button"
                  onClick={summarizePdf}
                  disabled={summarizing}
                >
                  {summarizing
                    ? "Summarizing..."
                    : "📝 Summarize PDF"}
                </button>
              </div>

              {summaryError && (
                <div className="summary-error">
                  {summaryError}
                </div>
              )}

              {summary && (
                <div className="summary-content">
                  <MarkdownContent
                    content={summary}
                  />
                </div>
              )}
            </section>
          )}

          {/* =================================================
              QUIZ
              ================================================= */}
          {activeFileHash && (
            <section className="card quiz-card">
              <div className="section-title">🧠 Quiz Generator</div>
              <div className="quiz-description">Generate MCQs from the currently active PDF.</div>
              {!quizQuestions.length && (
                <>
                  <div className="quiz-controls">
                    <div className="quiz-control"><label>Questions</label><select value={quizCount} onChange={(e) => setQuizCount(Number(e.target.value))} disabled={quizLoading}><option value={5}>5 Questions</option><option value={10}>10 Questions</option><option value={15}>15 Questions</option><option value={20}>20 Questions</option></select></div>
                    <div className="quiz-control"><label>Difficulty</label><select value={quizDifficulty} onChange={(e) => setQuizDifficulty(e.target.value)} disabled={quizLoading}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
                  </div>
                  <button type="button" className="quiz-button" onClick={generateQuiz} disabled={quizLoading}>{quizLoading ? "Generating Quiz..." : "🧠 Generate Quiz"}</button>
                </>
              )}
              {quizError && <div className="quiz-error">{quizError}</div>}
              {quizQuestions.length > 0 && !quizFinished && (
                <div>
                  <div className="quiz-progress">Question {currentQuestion + 1} of {quizQuestions.length}</div>
                  <div className="quiz-question">{quizQuestions[currentQuestion].question}</div>
                  <div className="quiz-options">{quizQuestions[currentQuestion].options.map((option, index) => <button key={index} type="button" className={`quiz-option ${selectedAnswers[currentQuestion] === option ? "selected" : ""}`} onClick={() => selectQuizAnswer(option)}><span className="quiz-letter">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
                  <div className="quiz-actions">
                    <button type="button" className="quiz-secondary" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((n) => Math.max(0, n - 1))}>Previous</button>
                    {currentQuestion === quizQuestions.length - 1 ? <button type="button" className="quiz-button" disabled={!selectedAnswers[currentQuestion]} onClick={() => setQuizFinished(true)}>Finish Quiz</button> : <button type="button" className="quiz-button" disabled={!selectedAnswers[currentQuestion]} onClick={() => setCurrentQuestion((n) => n + 1)}>Next Question</button>}
                  </div>
                </div>
              )}
              {quizFinished && quizQuestions.length > 0 && (
                <div className="quiz-review">
                  <div style={{textAlign:"center",fontWeight:700,fontSize:18}}>🎉 Quiz Complete!</div>
                  <div className="quiz-score">{quizScore} / {quizQuestions.length}</div>
                  <div style={{textAlign:"center",color:"#94a3b8",marginBottom:18}}>{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                  {quizQuestions.map((question,index) => { const selected=selectedAnswers[index]; const correct=selected===question.answer; return <div className="review-item" key={index}><div className="review-question">{index+1}. {question.question}</div><div className={`review-answer ${correct ? "review-correct" : "review-wrong"}`}>{correct ? "✅ Correct" : "❌ Incorrect"}</div><div className="review-answer"><strong>Your answer:</strong> {selected || "Not answered"}</div><div className="review-answer"><strong>Correct answer:</strong> {question.answer}</div><div className="review-explanation"><strong>Explanation:</strong> {question.explanation}</div></div>; })}
                  <button type="button" className="quiz-button" onClick={resetQuiz}>🔄 Generate New Quiz</button>
                </div>
              )}
            </section>
          )}

          {/* =================================================
              CHAT
              ================================================= */}

          <section className="card chat-card">
            <div className="chat-header">
              <div>
                <div className="chat-title">
                  LearnSphere AI
                </div>

                <div className="chat-subtitle">
                  Ask questions about
                  your studies
                </div>
              </div>

              <button
                type="button"
                className="clear-button"
                onClick={clearChat}
                disabled={
                  messages.length === 0
                }
              >
                Clear chat
              </button>
            </div>

            <div className="messages">
              {messages.length === 0 && (
                <div
                  style={{
                    color: "#64748b",
                    textAlign: "center",
                    padding: "60px 20px",
                    fontSize: "14px",
                  }}
                >
                  Upload a PDF, attach an image,
                  or ask LearnSphere AI anything.
                </div>
              )}

              {messages.map(
                (message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`message-row ${message.role}`}
                  >
                    <div
                      className={`message-bubble ${
                        message.role ===
                        "user"
                          ? "user-bubble"
                          : "assistant-bubble"
                      }`}
                    >
                      <span className="message-label">
                        {message.role ===
                        "user"
                          ? "YOU"
                          : "LEARNSPHERE AI"}
                      </span>

                      {message.role ===
                      "assistant" ? (
                        <MarkdownContent
                          content={
                            message.content
                          }
                        />
                      ) : (
                        <div
                          style={{
                            whiteSpace:
                              "pre-wrap",
                          }}
                        >
                          {
                            message.content
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {sending && (
                <div className="message-row assistant">
                  <div className="message-bubble assistant-bubble">
                    <span className="message-label">
                      LEARNSPHERE AI
                    </span>

                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              <div
                ref={messagesEndRef}
              />
            </div>

            {/* =================================================
                INPUT
                ================================================= */}

            {imageAttachment && (
              <div className="image-attachment">
                <div className="image-attachment-preview">
                  <img
                    src={imageAttachment.dataUrl}
                    alt="Selected image preview"
                  />
                </div>

                <div className="image-attachment-info">
                  <strong>Image attached</strong>
                  <span>{imageAttachment.name}</span>
                </div>

                <button
                  type="button"
                  className="image-remove-button"
                  onClick={removeImageAttachment}
                  disabled={sending}
                  aria-label="Remove image"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            )}

            <form
              className="input-area"
              onSubmit={sendMessage}
            >
              <label
                className="image-button"
                title="Attach an image"
                aria-label="Attach an image"
              >
                🖼️
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageChange}
                  disabled={sending || imageLoading}
                  hidden
                />
              </label>

              <input
                className="message-input"
                type="text"
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value
                  )
                }
                placeholder={
                  imageAttachment
                    ? "Ask about this image..."
                    : activeFileHash
                      ? "Ask something about your PDF..."
                      : "Ask LearnSphere AI..."
                }
                disabled={sending}
              />

              <button
                className="send-button"
                type="submit"
                disabled={
                  sending ||
                  imageLoading ||
                  (!input.trim() && !imageAttachment)
                }
              >
                {sending
                  ? "..."
                  : "Send"}
              </button>
            </form>
          </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}