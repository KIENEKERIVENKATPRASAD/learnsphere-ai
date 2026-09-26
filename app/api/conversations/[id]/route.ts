import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// =====================================================
// GET CONVERSATION ID
// =====================================================

async function getConversationId(
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await context.params;
  return params.id;
}

// =====================================================
// GET
// Load one conversation and all its messages
// =====================================================

export async function GET(
  _req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id = await getConversationId(context);

    console.log(
      "================================="
    );

    console.log(
      "GET CONVERSATION"
    );

    console.log(
      "Conversation ID:",
      id
    );

    // -------------------------------------------------
    // Get conversation
    // -------------------------------------------------

    const {
      data: conversation,
      error: conversationError,
    } = await supabase
      .from("conversations")
      .select(
        "id, title, file_hash, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (conversationError) {
      console.error(
        "Conversation fetch error:",
        conversationError
      );

      throw conversationError;
    }

    // -------------------------------------------------
    // Get PDF filename if available
    // -------------------------------------------------

    let filename: string | null = null;

    if (conversation.file_hash) {
      const {
        data: document,
        error: documentError,
      } = await supabase
        .from("documents")
        .select("metadata")
        .eq(
          "file_hash",
          conversation.file_hash
        )
        .limit(1)
        .maybeSingle();

      if (documentError) {
        console.warn(
          "Could not retrieve document metadata:",
          documentError
        );
      }

      if (
        document?.metadata &&
        typeof document.metadata ===
          "object" &&
        "filename" in document.metadata
      ) {
        const metadata =
          document.metadata as {
            filename?: unknown;
          };

        if (
          typeof metadata.filename ===
          "string"
        ) {
          filename =
            metadata.filename;
        }
      }
    }

    // -------------------------------------------------
    // Get messages
    // -------------------------------------------------

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from("messages")
      .select(
        "id, role, content, created_at"
      )
      .eq(
        "conversation_id",
        id
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (messagesError) {
      console.error(
        "Messages fetch error:",
        messagesError
      );

      throw messagesError;
    }

    console.log(
      "Messages retrieved:",
      messages?.length ?? 0
    );

    console.log(
      "================================="
    );

    return Response.json({
      success: true,

      conversation: {
        ...conversation,
        filename,
      },

      messages:
        messages ?? [],
    });
  } catch (error) {
    console.error(
      "GET /api/conversations/[id] error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to load conversation.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// POST
// Save a user or assistant message
// =====================================================

export async function POST(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id =
      await getConversationId(
        context
      );

    const body =
      await req.json();

    const role =
      body?.role;

    const content =
      typeof body?.content ===
      "string"
        ? body.content.trim()
        : "";

    console.log(
      "================================="
    );

    console.log(
      "SAVE CONVERSATION MESSAGE"
    );

    console.log(
      "Conversation ID:",
      id
    );

    console.log(
      "Role:",
      role
    );

    // -------------------------------------------------
    // Validate role
    // -------------------------------------------------

    if (
      role !== "user" &&
      role !== "assistant"
    ) {
      return Response.json(
        {
          success: false,

          error:
            "Invalid message role. Role must be user or assistant.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // Validate content
    // -------------------------------------------------

    if (!content) {
      return Response.json(
        {
          success: false,

          error:
            "Message content is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------
    // Check conversation exists
    // -------------------------------------------------

    const {
      data: conversation,
      error:
        conversationError,
    } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (conversationError) {
      throw conversationError;
    }

    if (!conversation) {
      return Response.json(
        {
          success: false,

          error:
            "Conversation not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------
    // Insert message
    // -------------------------------------------------

    const {
      data: savedMessage,
      error: messageError,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,

        role,

        content,
      })
      .select(
        "id, conversation_id, role, content, created_at"
      )
      .single();

    if (messageError) {
      console.error(
        "Message insert error:",
        messageError
      );

      throw messageError;
    }

    // -------------------------------------------------
    // Update conversation timestamp
    // -------------------------------------------------

    const {
      error: updateError,
    } = await supabase
      .from("conversations")
      .update({
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error(
        "Conversation update error:",
        updateError
      );

      throw updateError;
    }

    console.log(
      "Message saved successfully."
    );

    console.log(
      "================================="
    );

    return Response.json({
      success: true,

      message:
        savedMessage,
    });
  } catch (error) {
    console.error(
      "POST /api/conversations/[id] error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to save message.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// PATCH
// Update conversation title or PDF
// =====================================================

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id =
      await getConversationId(
        context
      );

    const body =
      await req.json();

    const update:
      Record<string, unknown> =
      {
        updated_at:
          new Date().toISOString(),
      };

    // -------------------------------------------------
    // Update title
    // -------------------------------------------------

    if (
      typeof body?.title ===
        "string" &&
      body.title.trim()
    ) {
      update.title =
        body.title
          .trim()
          .slice(0, 100);
    }

    // -------------------------------------------------
    // Update PDF hash
    // -------------------------------------------------

    if (
      typeof body?.fileHash ===
        "string" &&
      body.fileHash.trim()
    ) {
      update.file_hash =
        body.fileHash.trim();
    } else if (
      body?.fileHash === null
    ) {
      update.file_hash = null;
    }

    // -------------------------------------------------
    // Update conversation
    // -------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("conversations")
      .update(update)
      .eq("id", id)
      .select(
        "id, title, file_hash, created_at, updated_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,

      conversation: data,
    });
  } catch (error) {
    console.error(
      "PATCH /api/conversations/[id] error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to update conversation.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// DELETE
// Delete conversation
// =====================================================

export async function DELETE(
  _req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id =
      await getConversationId(
        context
      );

    console.log(
      "Deleting conversation:",
      id
    );

    const {
      error,
    } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return Response.json({
      success: true,

      message:
        "Conversation deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/conversations/[id] error:",
      error
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to delete conversation.",
      },
      {
        status: 500,
      }
    );
  }
}