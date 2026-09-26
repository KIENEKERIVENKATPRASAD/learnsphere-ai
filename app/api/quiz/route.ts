import { supabase } from "@/lib/supabase";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

function extractJson(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }

    throw new Error("Groq returned invalid quiz JSON.");
  }
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const question = String((item as any).question ?? "").trim();
      const options = Array.isArray((item as any).options)
        ? (item as any).options.map((x: unknown) => String(x).trim()).filter(Boolean)
        : [];
      const answer = String((item as any).answer ?? "").trim();
      const explanation = String((item as any).explanation ?? "").trim();

      if (!question || options.length !== 4 || !answer) return null;
      if (!options.includes(answer)) return null;

      return { question, options, answer, explanation };
    })
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    console.log("=================================");
    console.log("QUIZ REQUEST");

    const body = await req.json();
    const fileHash = typeof body.fileHash === "string" ? body.fileHash : "";
    const questionCount = Math.min(
      Math.max(Number(body.questionCount) || 5, 1),
      20
    );
    const difficulty =
      body.difficulty === "easy" || body.difficulty === "hard"
        ? body.difficulty
        : "medium";

    if (!fileHash) {
      return Response.json(
        { success: false, error: "No active PDF was provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { success: false, error: "GROQ_API_KEY is missing in .env.local." },
        { status: 500 }
      );
    }

    const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
    console.log("File hash:", fileHash);
    console.log("Question count:", questionCount);
    console.log("Difficulty:", difficulty);
    console.log("Using Groq model:", model);

    const { data: rows, error: dbError } = await supabase
      .from("documents")
      .select("content, metadata")
      .eq("file_hash", fileHash)
      .order("id", { ascending: true });

    if (dbError) throw dbError;

    if (!rows || rows.length === 0) {
      return Response.json(
        { success: false, error: "No chunks were found for the active PDF." },
        { status: 404 }
      );
    }

    const pdfText = rows
      .map((row) => row.content)
      .filter((content): content is string => typeof content === "string")
      .join("\n\n");

    if (!pdfText.trim()) {
      return Response.json(
        { success: false, error: "The active PDF contains no readable text." },
        { status: 400 }
      );
    }

    console.log("Retrieved", rows.length, "chunks");
    console.log("Generating quiz with Groq...");

    const prompt = `You are generating a study quiz from the supplied PDF text.

Create exactly ${questionCount} multiple-choice questions.
Difficulty: ${difficulty}.

Rules:
- Questions must be based ONLY on the supplied PDF text.
- Do not invent facts that are not supported by the PDF.
- Each question must have exactly 4 options.
- There must be exactly one correct answer.
- The answer field must exactly match one of the four option strings.
- Keep questions clear and useful for studying.
- Return ONLY valid JSON.

Required JSON format:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "answer": "...",
      "explanation": "..."
    }
  ]
}

PDF TEXT:
${pdfText.slice(0, 50000)}`;

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You create accurate JSON quizzes from provided documents.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    const groqData = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", JSON.stringify(groqData));
      return Response.json(
        {
          success: false,
          error:
            groqData?.error?.message ||
            "Groq failed to generate the quiz.",
        },
        { status: 502 }
      );
    }

    const content = groqData?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return Response.json(
        { success: false, error: "Groq returned an empty quiz." },
        { status: 502 }
      );
    }

    const parsed = extractJson(content);
    const questions = normalizeQuestions(parsed?.questions);

    if (questions.length === 0) {
      return Response.json(
        { success: false, error: "Groq returned an invalid quiz format." },
        { status: 502 }
      );
    }

    console.log(
      `Generated ${questions.length} quiz questions successfully.`
    );

    return Response.json({
      success: true,
      questions,
      filename: rows[0]?.metadata?.filename ?? null,
    });
  } catch (error) {
    console.error("Quiz API error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate quiz.",
      },
      { status: 500 }
    );
  }
}
