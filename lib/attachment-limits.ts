export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;

export const ATTACHMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.docx,.xlsx,.pptx";

export const ATTACHMENT_HINT =
  "PDF, images, Word/Excel/PowerPoint, text, or CSV. Up to 5 files, 5 MB each.";

export function canPreviewAttachment(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "text/plain" ||
    mimeType === "text/csv"
  );
}
