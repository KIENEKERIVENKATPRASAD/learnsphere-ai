import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
   ========================================================= */

type ChatMessage = {
  role?: string;
  content?: unknown;
  parts?: unknown;
};

/* =========================================================
   EXTRACT TEXT SAFELY
   ========================================================= */

function getMessageText(
  message: ChatMessage
): string {
  if (!message) {
    return "";
  }

  /* -----------------------------------------
     content is a normal string
     ----------------------------------------- */

  if (
    typeof message.content ===
    "string"
  ) {
    return message.content.trim();
  }

  /* -----------------------------------------
     parts format

     [
       {
         type: "text",
         text: "hello"
       }
     ]
     ----------------------------------------- */

  if (
    Array.isArray(message.parts)
  ) {
    return message.parts
      .filter(
        (part: any) =>
          part &&
          part.type === "text" &&
          typeof part.text === "string"
      )
      .map(
        (part: any) =>
          part.text
      )
      .join("\n")
      .trim();
  }

  /* -----------------------------------------
     content array format
     ----------------------------------------- */

  if (
    Array.isArray(message.content)
  ) {
    return message.content
      .filter(
        (part: any) =>
          part &&
          typeof part.text === "string"
      )
      .map(
        (part: any) =>
          part.text
      )
      .join("\n")
      .trim();
  }

  return "";
}

/* =========================================================
   DETECT DOCUMENT QUESTIONS
   ========================================================= */

function isDocumentQuestion(
  question: string
): boolean {
  const q =
    question
      .toLowerCase()
      .trim();

  const keywords = [
    "my resume",
    "my cv",
    "my pdf",
    "my document",

    "from my resume",
    "from my cv",
    "from my pdf",

    "in my resume",
    "in my cv",
    "in my pdf",

    "my skills",
    "my technical skills",
    "my technical knowledge",

    "my projects",
    "my project",

    "my education",

    "my experience",
    "my work experience",

    "my qualifications",

    "my certifications",

    "my achievements",

    "my profile",

    "my programming languages",

    "my technologies",
  ];

  return keywords.some(
    (keyword) =>
      q.includes(keyword)
  );
}

/* =========================================================
   DETECT BROAD DOCUMENT QUESTIONS
   ========================================================= */

function isBroadDocumentQuestion(
  question: string
): boolean {
  const q =
    question
      .toLowerCase()
      .trim();

  const patterns = [
    "what are my technical skills",
    "what are my skills",
    "what is my technical knowledge",

    "what are my projects",
    "what projects are in my resume",
    "what projects are in my cv",

    "what is in my resume",
    "what is in my cv",

    "summarize my resume",
    "summarise my resume",

    "summarize my cv",
    "summarise my cv",

    "tell me about my resume",
    "tell me about my cv",

    "tell me about my skills",
    "tell me about my projects",

    "show my skills",
    "show my projects",
  ];

  return patterns.some(
    (pattern) =>
      q.includes(pattern)
  );
}

/* =========================================================
   CLEAN MODEL MESSAGES
   ========================================================= */

function createModelMessages(
  messages: ChatMessage[]
) {
  return messages
    .map((message) => {
      const text =
        getMessageText(message);

      let role:
        | "user"
        | "assistant"
        | "system";

      if (
        message.role ===
        "assistant"
      ) {
        role = "assistant";
      } else if (
        message.role ===
        "system"
      ) {
        role = "system";
      } else {
        role = "user";
      }

      return {
        role,
        content: text,
      };
    })
    .filter(
      (message) =>
        message.content.length >
        0
    );
}

/* =========================================================
   POST /api/chat
   ========================================================= */

export async function POST(
  req: Request
) {
  try {
    console.log(
      "================================="
    );

    console.log(
      "CHAT REQUEST"
    );

    /* =====================================================
       1. READ BODY
       ===================================================== */

    const body =
      await req.json();

    const messages: ChatMessage[] =
      Array.isArray(
        body?.messages
      )
        ? body.messages
        : [];

    /*
      The page sends the currently active PDF hash.

      Example:

      activeFileHash:
      "4a8f807..."
    */

    const activeFileHash =
      typeof body?.activeFileHash === "string"
        ? body.activeFileHash
        : typeof body?.fileHash === "string"
          ? body.fileHash
          : null;

    const imageData =
      typeof body?.imageData === "string" &&
      body.imageData.startsWith("data:image/")
        ? body.imageData
        : null;

    const imageName =
      typeof body?.imageName === "string"
        ? body.imageName
        : null;

    const imageMimeType =
      typeof body?.imageMimeType === "string"
        ? body.imageMimeType
        : null;

    /* =====================================================
       2. VALIDATE MESSAGES
       ===================================================== */

    if (
      messages.length ===
      0
    ) {
      return Response.json(
        {
          error:
            "No messages were provided.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       3. GET LAST USER MESSAGE
       ===================================================== */

    const userMessages =
      messages.filter(
        (message) =>
          message?.role ===
          "user"
      );

    if (
      userMessages.length ===
      0
    ) {
      return Response.json(
        {
          error:
            "No user message was provided.",
        },
        {
          status: 400,
        }
      );
    }

    const lastMessage =
      userMessages[
        userMessages.length - 1
      ];

    const question =
      getMessageText(
        lastMessage
      );

    if (!question) {
      return Response.json(
        {
          error:
            "Could not read the user question.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "User question:",
      question
    );

    console.log(
      "Active file hash:",
      activeFileHash ??
        "NONE"
    );

    /* =====================================================
       4. DETECT QUESTION TYPE
       ===================================================== */

    const documentQuestion =
      isDocumentQuestion(
        question
      );

    const broadDocumentQuestion =
      isBroadDocumentQuestion(
        question
      );

    /* =====================================================
       5. RETRIEVED DOCUMENTS
       ===================================================== */

    let documents: any[] = [];

    /* =====================================================
       6. NO ACTIVE PDF
       ===================================================== */

    if (!activeFileHash) {
      console.log(
        "================================="
      );

      console.log(
        "No active PDF."
      );

      /* -----------------------------------------------
         Resume/document question without PDF
         ----------------------------------------------- */

      if (
        documentQuestion
      ) {
        console.log(
          "Document-specific question detected but no active PDF exists."
        );

        return Response.json(
          {
            answer:
              "Please upload your PDF or resume first. Once it is uploaded, I can answer questions about your skills, projects, education, experience, and other information from the document.",
          },
          {
            status: 200,
          }
        );
      }

      /* -----------------------------------------------
         Normal question
         ----------------------------------------------- */

      console.log(
        "General question. No RAG search required."
      );
    }

    /* =====================================================
       7. ACTIVE PDF EXISTS
       ===================================================== */

    if (
      activeFileHash
    ) {
      console.log(
        "================================="
      );

      console.log(
        "Active PDF detected."
      );

      /* =================================================
         7A. BROAD DOCUMENT QUESTION
         ================================================= */

      if (
        broadDocumentQuestion
      ) {
        console.log(
          "Broad document question detected."
        );

        console.log(
          "Retrieving ALL chunks from active PDF..."
        );

        const {
          data,
          error,
        } = await supabase
          .from("documents")
          .select(
            "id, content, metadata, file_hash"
          )
          .eq(
            "file_hash",
            activeFileHash
          )
          .order("id", {
            ascending: true,
          });

        if (error) {
          console.error(
            "Document retrieval error:",
            error
          );

          throw error;
        }

        documents =
          data ?? [];

        console.log(
          `Retrieved ${documents.length} chunks from active PDF`
        );
      }

      /* =================================================
         7B. SPECIFIC DOCUMENT QUESTION
         ================================================= */

      else if (
        documentQuestion
      ) {
        console.log(
          "Document-specific question detected."
        );

        console.log(
          "Generating question embedding..."
        );

        const questionEmbedding =
          await generateEmbedding(
            question
          );

        console.log(
          "Question embedding dimensions:",
          questionEmbedding.length
        );

        console.log(
          "Searching active PDF only..."
        );

        const {
          data: matches,
          error: searchError,
        } =
          await supabase.rpc(
            "match_documents",
            {
              query_embedding:
                questionEmbedding,

              match_threshold:
                0.15,

              match_count:
                8,
            }
          );

        if (searchError) {
          console.error(
            "Supabase search error:",
            searchError
          );

          throw searchError;
        }

        console.log(
          `Found ${
            matches?.length ?? 0
          } raw results`
        );

        /* -----------------------------------------------
           Get IDs belonging to active PDF
           ----------------------------------------------- */

        const {
          data:
            activeDocuments,
          error:
            activeError,
        } =
          await supabase
            .from("documents")
            .select("id")
            .eq(
              "file_hash",
              activeFileHash
            );

        if (activeError) {
          console.error(
            "Active document lookup error:",
            activeError
          );

          throw activeError;
        }

        const activeIds =
          new Set(
            (
              activeDocuments ??
              []
            ).map(
              (doc: any) =>
                doc.id
            )
          );

        /* -----------------------------------------------
           Filter results
           ----------------------------------------------- */

        documents =
          (
            matches ??
            []
          ).filter(
            (doc: any) =>
              activeIds.has(
                doc.id
              )
          );

        console.log(
          `Found ${documents.length} relevant chunks`
        );
      }
    }

    /* =====================================================
       8. REMOVE DUPLICATE CHUNKS
       ===================================================== */

    const uniqueDocuments =
      new Map<number, any>();

    for (
      const document of documents
    ) {
      if (
        document &&
        document.id !==
          undefined
      ) {
        uniqueDocuments.set(
          document.id,
          document
        );
      }
    }

    documents =
      Array.from(
        uniqueDocuments.values()
      );

    console.log(
      `Using ${documents.length} unique document chunks`
    );

    /* =====================================================
       9. BUILD CONTEXT
       ===================================================== */

    let context =
      "No uploaded document context is available.";

    if (
      documents.length >
      0
    ) {
      context =
        documents
          .map(
            (
              document: any,
              index: number
            ) => {
              const filename =
                document
                  .metadata
                  ?.filename ??
                "Unknown document";

              const chunkIndex =
                document
                  .metadata
                  ?.chunk_index ??
                index;

              return `
DOCUMENT CHUNK ${
                index + 1
              }

FILE:
${filename}

CHUNK:
${chunkIndex}

CONTENT:
${document.content}
`;
            }
          )
          .join(
            "\n==============================\n"
          );
    }

    /* =====================================================
       10. SOURCE FILES
       ===================================================== */

    const sourceFiles = [
      ...new Set(
        documents.map(
          (
            document: any
          ) =>
            document
              .metadata
              ?.filename
        )
      ),
    ].filter(Boolean);

    const sourcesText =
      sourceFiles.length >
      0
        ? sourceFiles
            .map(
              (
                filename
              ) =>
                `- ${filename}`
            )
            .join("\n")
        : "No uploaded document was used.";

    /* =====================================================
       11. SYSTEM PROMPT
       ===================================================== */

    const systemPrompt = `
You are LearnSphere AI, an educational AI assistant.

Your job is to help students understand academic concepts
and information from their uploaded study materials.

IMPORTANT RULES:

1. If document context is provided and the user asks about
their resume, skills, projects, education, experience,
certifications, or other personal information, use ONLY
the provided document context.

2. NEVER invent personal information.

3. NEVER use information from previous conversations to
answer questions about the user's resume.

4. If the document does not contain enough information,
say that you could not find enough information in the
uploaded document.

5. For general educational questions such as:

"What is an API?"
"What is cloud computing?"
"What is Python?"

answer normally using your general knowledge.

6. Explain concepts in simple English.

7. Use Markdown formatting.

8. Use clear headings when useful.

9. Use bullet points when useful.

10. TABLE RULE:

If a table is useful, create a COMPLETE Markdown table.

Correct:

| Skill | Category |
|---|---|
| Python | Programming |
| SQL | Database |
| ESP32 | Embedded |

The separator row is REQUIRED.

NEVER create incomplete tables.

11. For resume information, prefer bullet points unless
a table genuinely improves readability.

12. NEVER use HTML tags such as:

<br>
<div>
<span>
<table>

13. Do not mention internal implementation details such as:

Supabase
embeddings
vector similarity
RPC
database IDs
RAG

14. If document context is provided, answer directly from it.

15. If no document context is provided and the user asks
about their personal resume information, tell them to
upload their document first.

16. When uploaded document information is used, include:

### Sources

${sourcesText}
`;

    /* =====================================================
       12. CLEAN MESSAGE HISTORY
       ===================================================== */

    const cleanMessages =
      createModelMessages(
        messages
      );

    console.log(
      `Prepared ${cleanMessages.length} model messages`
    );

    /* =====================================================
       13. DOCUMENT INSTRUCTION
       ===================================================== */

    const documentInstruction = `
CURRENT DOCUMENT CONTEXT:

----------------------------------------
${context}
----------------------------------------

LATEST USER QUESTION:

${question}
`;

    /* =====================================================
       14. MULTIMODAL IMAGE RESPONSE
       ===================================================== */

    if (imageData) {
      console.log(
        "Image input detected.",
        imageName ?? "image"
      );

      if (imageData.length > 14 * 1024 * 1024) {
        return Response.json(
          {
            error:
              "The selected image is too large. Please choose a smaller image.",
          },
          {
            status: 400,
          }
        );
      }

      const visionPrompt = `
You are LearnSphere AI, an educational AI assistant.

Analyze the attached image and answer the user's question.
If the image contains text, read it carefully.
If the image is a diagram, chart, circuit, equation, screenshot,
or educational figure, explain the relevant parts clearly.

Use the uploaded PDF context below when it is relevant, but do not
invent information that is not visible in the image or supported
by the document context.

Keep the answer in simple English and use Markdown.

PDF CONTEXT:
----------------------------------------
${context}
----------------------------------------

USER QUESTION:
${question || "Please analyze this image and explain what it shows."}
`;

      const visionResponse =
        await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "qwen/qwen3.8-27b",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: visionPrompt,
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: imageData,
                      },
                    },
                  ],
                },
              ],
              temperature: 1,
              max_completion_tokens: 2048,
              stream: false,
            }),
          }
        );

      const visionData =
        await visionResponse.json();

      if (!visionResponse.ok) {
        console.error(
          "Groq vision API error:",
          visionData
        );

        throw new Error(
          visionData?.error?.message ??
            "Groq could not analyze the image."
        );
      }

      const answer =
        visionData?.choices?.[0]?.message?.content?.trim();

      if (!answer) {
        throw new Error(
          "The vision model returned an empty response."
        );
      }

      console.log(
        "Multimodal AI response generated successfully."
      );

      return Response.json(
        {
          answer,
        },
        {
          status: 200,
        }
      );
    }

    /* =====================================================
       15. GENERATE TEXT RESPONSE WITH GROQ
       ===================================================== */

    console.log(
      "Generating AI response..."
    );

    const result =
      await generateText({
        model: groq(
          "openai/gpt-oss-120b"
        ),

        system:
          systemPrompt,

        messages: [
          ...cleanMessages,

          {
            role: "user",
            content:
              documentInstruction,
          },
        ] as any,
      });

    /* =====================================================
       15. GET TEXT
       ===================================================== */

    const answer =
      result.text?.trim();

    if (!answer) {
      throw new Error(
        "The AI returned an empty response."
      );
    }

    console.log(
      "AI response generated successfully."
    );

    /* =====================================================
       16. RETURN JSON
       ===================================================== */

    return Response.json(
      {
        answer,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate a response.",
      },
      {
        status: 500,
      }
    );
  }
}