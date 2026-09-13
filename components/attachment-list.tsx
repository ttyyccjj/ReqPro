import { canPreviewAttachment } from "@/lib/attachment-limits";
import { formatBytes } from "@/lib/format";

export type AttachmentItem = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export function AttachmentList({ items }: { items: AttachmentItem[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const href = `/api/attachments/${item.id}`;
        const isImage = item.mimeType.startsWith("image/");
        const preview = canPreviewAttachment(item.mimeType)
          ? { target: "_blank" as const, rel: "noopener noreferrer" }
          : {};
        return (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            {isImage ? (
              <a href={href} {...preview} className="shrink-0">
                {/* Private authenticated files are served from the API, not /public. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={href}
                  alt=""
                  className="h-12 w-12 rounded-sm border border-line object-cover"
                />
              </a>
            ) : null}
            <div className="min-w-0">
              <a
                href={href}
                className="font-medium text-ink underline-offset-2 hover:underline"
                {...preview}
              >
                {item.originalName}
              </a>
              <p className="text-xs text-muted">{formatBytes(item.sizeBytes)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
