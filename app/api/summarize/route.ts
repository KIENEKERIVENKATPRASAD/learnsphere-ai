import { supabase } from "@/lib/supabase";

const GROQ_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export async function POST(req: Request) {
  try {
    console.log("=================================");
    console.log("SUMMARY REQUEST");

    // =====================================================
    // 1. GET REQUEST BODY
    // =====================================================

    const body = await req.json();

    const fileHash = body.fileHash;

    console.log("File hash:", fileHash);

    if (!fileHash) {
      return Response.json(
        {
          success: false,
          error: "No active PDF file hash was provided.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 2. CHECK GROQ API KEY
    // =====================================================

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error(
        "GROQ_API_KEY is missing."
      );

      return Response.json(
        {
          success: false,
          error:
            "GROQ_API_KEY is not configured in .env.local.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Groq API key detected."
    );

    console.log(
      "Using Groq model:",
      GROQ_MODEL
    );

    // =====================================================
    // 3. GET PDF CHUNKS
    // =====================================================

    console.log(
      "Retrieving PDF chunks..."
    );

    const {
      data: documents,
      error: documentError,
    } = await supabase
      .from("documents")
      .select(
        "content, metadata, file_hash"
      )
      .eq("file_hash", fileHash)
      .order(
        "metadata->>chunk_index",
        {
          ascending: true,
        }
      );

    if (documentError) {
      console.error(
        "Supabase document error:",
        documentError
      );

      return Response.json(
        {
          success: false,
          error:
            "Failed to retrieve PDF content from the database.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 4. CHECK DOCUMENT
    // =====================================================

    if (
      !documents ||
      documents.length === 0
    ) {
      console.error(
        "No PDF chunks found for hash:",
        fileHash
      );

      return Response.json(
        {
          success: false,
          error:
            "No document content was found for the active PDF.",
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      `Retrieved ${documents.length} chunks`
    );

    // =====================================================
    // 5. COMBINE PDF TEXT
    // =====================================================

    const pdfText = documents
      .map(
        (doc: any) =>
          doc.content || ""
      )
      .join("\n\n")
      .trim();

    console.log(
      "PDF text length:",
      pdfText.length
    );

    if (!pdfText) {
      return Response.json(
        {
          success: false,
          error:
            "The PDF does not contain readable text.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 6. LIMIT EXTREMELY LARGE DOCUMENTS
    // =====================================================

    const MAX_TEXT_LENGTH = 50000;

    const finalText =
      pdfText.length > MAX_TEXT_LENGTH
        ? pdfText.slice(
            0,
            MAX_TEXT_LENGTH
          )
        : pdfText;

    // =====================================================
    // 7. CREATE SUMMARY PROMPT
    // =====================================================

    const systemPrompt = `
You are LearnSphere AI, an educational document assistant.

Summarize the uploaded PDF accurately.

IMPORTANT RULES:

1. Use ONLY the information provided in the PDF.
2. Do not invent information.
3. Do not add outside knowledge.
4. Preserve important terminology from the document.
5. Organize the summary clearly.
6. Use headings and bullet points.
7. If the PDF contains tables, preserve their information in a readable Markdown table whenever possible.
8. Highlight important concepts, names, dates, skills, projects, and conclusions when they exist.
9. Keep the summary concise but useful for studying.
10. Do not say that you "cannot access" the PDF because the PDF text is provided below.
`;

    const userPrompt = `
Create a structured summary of this PDF.

PDF CONTENT:

${finalText}
`;

    // =====================================================
    // 8. CALL GROQ
    // =====================================================

    console.log(
      "Generating summary with Groq..."
    );

    const groqResponse =
      await fetch(
        GROQ_API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model: GROQ_MODEL,

            messages: [
              {
                role: "system",
                content:
                  systemPrompt,
              },

              {
                role: "user",
                content:
                  userPrompt,
              },
            ],

            temperature: 0.2,

            max_tokens: 4000,
          }),
        }
      );

    // =====================================================
    // 9. READ GROQ RESPONSE
    // =====================================================

    const groqData =
      await groqResponse.json();

    if (!groqResponse.ok) {
      console.error(
        "Groq API error:",
        JSON.stringify(
          groqData
        )
      );

      return Response.json(
        {
          success: false,
          error:
            groqData?.error?.message ||
            "Groq API request failed.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 10. EXTRACT SUMMARY
    // =====================================================

    const summary =
      groqData?.choices?.[0]?.message
        ?.content;

    if (
      !summary ||
      typeof summary !== "string"
    ) {
      console.error(
        "Invalid Groq response:",
        groqData
      );

      return Response.json(
        {
          success: false,
          error:
            "Groq returned an empty summary.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "Summary generated successfully."
    );

    // =====================================================
    // 11. RETURN SUCCESS
    // =====================================================

    return Response.json({
      success: true,

      summary,

      fileHash,

      model: GROQ_MODEL,

      chunks: documents.length,

      message:
        "PDF summary generated successfully.",
    });
  } catch (error) {
    console.error(
      "Summary processing error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to generate PDF summary.",
      },
      {
        status: 500,
      }
    );
  }
}