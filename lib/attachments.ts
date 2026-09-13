import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { MAX_FILE_BYTES, MAX_FILES } from "@/lib/attachment-limits";

export {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  MAX_FILE_BYTES,
  MAX_FILES,
  canPreviewAttachment,
} from "@/lib/attachment-limits";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXT_TO_MIME));
const STORED_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export class AttachmentError extends Error {
  params?: Record<string, string | number>;

  constructor(message: string, params?: Record<string, string | number>) {
    super(message);
    this.name = "AttachmentError";
    this.params = params;
  }
}

export type SavedAttachment = {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
};

export function filesFromFormData(formData: FormData, field = "attachments") {
  return formData
    .getAll(field)
    .filter((value): value is File => value instanceof File && value.size > 0 && Boolean(value.name));
}

export function removeIdsFromFormData(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("removeAttachmentIds")
        .map((value) => String(value))
        .filter(Boolean),
    ),
  ];
}

export function assertAttachmentLimits(files: File[], existingCount: number) {
  if (existingCount + files.length > MAX_FILES) {
    throw new AttachmentError("errors.tooManyFiles", { max: MAX_FILES });
  }
}

function extensionOf(name: string) {
  const base = name.replace(/^.*[/\\]/, "");
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

function sanitizeOriginalName(name: string, ext: string) {
  const base = name.replace(/^.*[/\\]/, "").replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${cleaned || "attachment"}${ext}`;
}

function startsWith(bytes: Uint8Array, expected: number[]) {
  return expected.every((value, index) => bytes[index] === value);
}

async function matchesKind(file: File, ext: string) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (ext === ".pdf") return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
  if (ext === ".png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (ext === ".jpg" || ext === ".jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (ext === ".gif") return startsWith(bytes, [0x47, 0x49, 0x46]);
  if (ext === ".webp") {
    const header = new TextDecoder().decode(bytes);
    return header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
  }
  if (ext === ".docx" || ext === ".xlsx" || ext === ".pptx") {
    return startsWith(bytes, [0x50, 0x4b]);
  }
  if (ext === ".txt" || ext === ".csv") {
    return !bytes.includes(0);
  }
  return false;
}

async function inspectFile(file: File) {
  if (file.size > MAX_FILE_BYTES) {
    throw new AttachmentError("errors.fileTooLarge", { name: file.name });
  }

  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AttachmentError("errors.fileTypeNotAllowed", { name: file.name });
  }

  const expectedMime = EXT_TO_MIME[ext];
  const declared = file.type.toLowerCase();
  if (declared && declared !== "application/octet-stream" && declared !== expectedMime) {
    throw new AttachmentError("errors.fileTypeMismatch", { name: file.name });
  }

  if (!(await matchesKind(file, ext))) {
    throw new AttachmentError("errors.fileUnverified", {
      name: file.name,
      kind: ext.slice(1).toUpperCase(),
    });
  }

  return {
    ext,
    mimeType: expectedMime,
    originalName: sanitizeOriginalName(file.name, ext),
  };
}

export async function saveAttachmentFiles(files: File[]): Promise<SavedAttachment[]> {
  if (files.length === 0) return [];

  await mkdir(UPLOAD_DIR, { recursive: true });
  const saved: SavedAttachment[] = [];

  try {
    for (const file of files) {
      const checked = await inspectFile(file);
      const storedName = `${crypto.randomUUID()}${checked.ext}`;
      const dest = path.join(UPLOAD_DIR, storedName);
      const bytes = Buffer.from(await file.arrayBuffer());
      await writeFile(dest, bytes, { flag: "wx" });
      saved.push({
        id: crypto.randomUUID(),
        originalName: checked.originalName,
        storedName,
        mimeType: checked.mimeType,
        sizeBytes: bytes.length,
      });
    }
    return saved;
  } catch (error) {
    await deleteStoredFiles(saved.map((item) => item.storedName));
    throw error;
  }
}

export function resolveStoredPath(storedName: string) {
  if (!STORED_NAME_PATTERN.test(storedName) || !ALLOWED_EXTENSIONS.has(path.extname(storedName))) {
    throw new AttachmentError("errors.attachmentUnreadable");
  }

  const root = path.resolve(UPLOAD_DIR);
  const full = path.resolve(root, storedName);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new AttachmentError("errors.attachmentUnreadable");
  }
  return full;
}

export async function deleteStoredFiles(storedNames: string[]) {
  await Promise.all(
    storedNames.map(async (storedName) => {
      try {
        await unlink(resolveStoredPath(storedName));
      } catch (error) {
        if (error instanceof AttachmentError) return;
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          return;
        }
        throw error;
      }
    }),
  );
}

export function contentDisposition(filename: string, inline: boolean) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
