import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  AttachmentError,
  canPreviewAttachment,
  contentDisposition,
  resolveStoredPath,
} from "@/lib/attachments";
import { getCurrentUser } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { requestAttachments } from "@/lib/db/schema";
import { canAccessRequest } from "@/lib/request-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await ensureSchema();

  const [attachment] = await db
    .select()
    .from(requestAttachments)
    .where(eq(requestAttachments.id, id))
    .limit(1);

  if (!attachment || !(await canAccessRequest(user, attachment.requestId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readFile(resolveStoredPath(attachment.storedName));
    const inline = canPreviewAttachment(attachment.mimeType);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": contentDisposition(attachment.originalName, inline),
        "Content-Length": String(attachment.sizeBytes),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AttachmentError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
