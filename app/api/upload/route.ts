export const runtime = "nodejs";
import { generateEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";
import { cookies } from "next/headers";

function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): string[] {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(
      start + chunkSize,
      text.length
    );

    const chunk = text
      .slice(start, end)
      .trim();

    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start += chunkSize - overlap;
  }

  return chunks;
}

/*
===========================================================
PDF PARSER
Compatible with pdf-parse 2.4.5
===========================================================
*/

async function extractPdfText(buffer: Buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");

    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    return {
      text: result.text ?? "",
      pages: result.total ?? 0,
    };
  } catch (error) {
    console.error(
      "PDF parsing error:",
      error
    );

    throw new Error(
      "Unable to read this PDF. Please make sure it is a valid PDF with readable text."
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log("=================================");
    console.log("UPLOAD REQUEST");
    console.log("=================================");

    /*
    =======================================================
    1. GET FILE
    =======================================================
    */

    const formData = await req.formData();

    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return Response.json(
        {
          success: false,
          error: "No PDF file uploaded.",
        },
        {
          status: 400,
        }
      );
    }

    const file = uploadedFile;

    /*
    =======================================================
    2. VALIDATE PDF
    =======================================================
    */

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return Response.json(
        {
          success: false,
          error: "Only PDF files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "PDF received:",
      file.name
    );

    console.log(
      "File size:",
      file.size,
      "bytes"
    );

    /*
    =======================================================
    3. CONVERT TO BUFFER
    =======================================================
    */

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    /*
    =======================================================
    4. SHA-256 HASH
    =======================================================
    */

    const fileHash =
      crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

    console.log(
      "File SHA-256:",
      fileHash
    );

    /*
    =======================================================
    5. COOKIE STORE
    =======================================================
    */

    const cookieStore =
      await cookies();

    /*
    IMPORTANT:
    Clear the old persistent cookie first.

    This removes the cookie created by the
    previous version of the application.
    */

    cookieStore.delete(
      "active_file_hash"
    );

    cookieStore.delete(
      "active_file_name"
    );

    /*
    =======================================================
    6. CHECK DUPLICATE
    =======================================================
    */

    console.log(
      "Checking whether PDF already exists..."
    );

    const {
      data: existingDocuments,
      error: duplicateError,
    } = await supabase
      .from("documents")
      .select("id")
      .eq(
        "file_hash",
        fileHash
      )
      .limit(1);

    if (duplicateError) {
      console.error(
        "Duplicate check error:",
        duplicateError
      );

      throw duplicateError;
    }

    /*
    =======================================================
    7. DUPLICATE PDF
    =======================================================
    */

    if (
      existingDocuments &&
      existingDocuments.length > 0
    ) {
      console.log(
        "Duplicate PDF detected."
      );

      /*
      Make this PDF active ONLY
      for the current browser session.

      NO maxAge.
      NO expires.
      */

      cookieStore.set(
        "active_file_hash",
        fileHash,
        {
          httpOnly: true,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV ===
            "production",
          path: "/",
        }
      );

      cookieStore.set(
        "active_file_name",
        file.name,
        {
          httpOnly: false,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV ===
            "production",
          path: "/",
        }
      );

      console.log(
        "Active PDF set:",
        fileHash
      );

      return Response.json({
        success: true,
        duplicate: true,
        fileHash,
        filename: file.name,
        message:
          "PDF already exists. It is now active for this session.",
      });
    }

    /*
    =======================================================
    8. NEW PDF
    =======================================================
    */

    console.log(
      "New PDF detected. Continuing..."
    );

    /*
    =======================================================
    9. EXTRACT PDF TEXT
    =======================================================
    */

    console.log(
      "Extracting PDF text..."
    );

    const pdfData =
      await extractPdfText(
        buffer
      );

    const text =
      pdfData.text;

    console.log(
      "Extracted characters:",
      text.length
    );

    console.log(
      "PDF pages:",
      pdfData.pages
    );

    /*
    =======================================================
    10. CHECK EXTRACTED TEXT
    =======================================================
    */

    if (!text.trim()) {
      return Response.json(
        {
          success: false,
          error:
            "No readable text was found in this PDF. It may be a scanned or image-only PDF.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    =======================================================
    11. CREATE CHUNKS
    =======================================================
    */

    const chunks =
      chunkText(text);

    console.log(
      `Created ${chunks.length} document chunks`
    );

    if (chunks.length === 0) {
      return Response.json(
        {
          success: false,
          error:
            "Could not create readable chunks from this PDF.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    =======================================================
    12. GENERATE EMBEDDINGS + STORE
    =======================================================
    */

    for (
      let i = 0;
      i < chunks.length;
      i++
    ) {
      console.log(
        `Generating embedding ${i + 1}/${chunks.length}...`
      );

      const embedding =
        await generateEmbedding(
          chunks[i]
        );

      const {
        error: insertError,
      } = await supabase
        .from("documents")
        .insert({
          content: chunks[i],

          metadata: {
            filename: file.name,
            chunk_index: i,
            page_count:
              pdfData.pages,
          },

          embedding,

          file_hash:
            fileHash,
        });

      if (insertError) {
        console.error(
          "Supabase insert error:",
          insertError
        );

        throw insertError;
      }
    }

    /*
    =======================================================
    13. SET NEW PDF AS ACTIVE
    =======================================================
    */

    cookieStore.set(
      "active_file_hash",
      fileHash,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
      }
    );

    cookieStore.set(
      "active_file_name",
      file.name,
      {
        httpOnly: false,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
      }
    );

    console.log(
      "Active PDF set:",
      fileHash
    );

    /*
    =======================================================
    14. SUCCESS
    =======================================================
    */

    console.log(
      "Successfully stored document."
    );

    console.log(
      `Stored ${chunks.length} chunks`
    );

    return Response.json({
      success: true,
      duplicate: false,
      fileHash,
      filename: file.name,
      pages: pdfData.pages,
      chunks: chunks.length,
      message:
        "PDF processed and activated for this session.",
    });

  } catch (error) {
    console.error(
      "PDF processing error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process PDF.",
      },
      {
        status: 500,
      }
    );
  }
}