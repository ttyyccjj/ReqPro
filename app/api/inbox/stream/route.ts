import { countInboxFor } from "@/lib/inbox-count";
import { subscribeInbox } from "@/lib/inbox-hub";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const close = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
    unsubscribe();
  };

  request.signal.addEventListener("abort", close);

  const stream = new ReadableStream({
    async start(controller) {
      const write = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      const send = (value: number) => {
        try {
          write(`data: ${JSON.stringify({ count: value })}\n\n`);
        } catch {
          close();
        }
      };

      send(await countInboxFor(user.id));
      unsubscribe = subscribeInbox(user.id, send);
      heartbeat = setInterval(() => {
        try {
          write(": ping\n\n");
        } catch {
          close();
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
