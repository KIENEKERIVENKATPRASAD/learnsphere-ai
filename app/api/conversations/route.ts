import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// =====================================================
// GET
// Get all conversations
// =====================================================

export async function GET() {
  try {
    console.log(
      "================================="
    );

    console.log(
      "GET CONVERSATIONS"
    );

    const {
      data,
      error,
    } = await supabase
      .from("conversations")
      .select(
        "id, title, file_hash, created_at, updated_at"
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Conversation list error:",
        error
      );

      throw error;
    }

    console.log(
      "Conversations found:",
      data?.length ?? 0
    );

    console.log(
      "================================="
    );

    return Response.json({
      success: true,

      conversations:
        data ?? [],
    });
  } catch (error) {
    console.error(
      "GET /api/conversations error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load conversations.",

        conversations: [],
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST
// Create a new conversation
// =====================================================

export async function POST(
  req: Request
) {
  try {
    console.log(
      "================================="
    );

    console.log(
      "CREATE CONVERSATION"
    );

    // -------------------------------------------------
    // Read optional request body
    // -------------------------------------------------

    let body: {
      title?: string;
      fileHash?: string | null;
    } = {};

    try {
      body =
        await req.json();
    } catch {
      // Empty body is allowed.
    }

    // -------------------------------------------------
    // Conversation title
    // -------------------------------------------------

    const title =
      typeof body?.title ===
        "string" &&
      body.title.trim()
        ? body.title
            .trim()
            .slice(0, 100)
        : "New Chat";

    // -------------------------------------------------
    // Optional active PDF
    // -------------------------------------------------

    const fileHash =
      typeof body?.fileHash ===
        "string" &&
      body.fileHash.trim()
        ? body.fileHash.trim()
        : null;

    // -------------------------------------------------
    // Create conversation
    // -------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("conversations")
      .insert({
        title,

        file_hash:
          fileHash,
      })
      .select(
        "id, title, file_hash, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error(
        "Create conversation error:",
        error
      );

      throw error;
    }

    console.log(
      "Conversation created:",
      data.id
    );

    console.log(
      "================================="
    );

    return Response.json({
      success: true,

      conversation:
        data,
    });
  } catch (error) {
    console.error(
      "POST /api/conversations error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to create conversation.",
      },
      {
        status: 500,
      }
    );
  }
}