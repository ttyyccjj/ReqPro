import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestUrl, scheduleMail, sendMail } from "@/lib/mail";
import { requestRef } from "@/lib/system-log";
import { requests, users } from "@/lib/db/schema";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function linkBlock(url: string) {
  return {
    text: `Open it in ReqPro:\n${url}`,
    html: `<p>Open it in ReqPro:<br /><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
  };
}

async function loadRequest(requestId: string) {
  const [request] = await db
    .select({
      id: requests.id,
      number: requests.number,
      title: requests.title,
      submittedBy: requests.submittedBy,
    })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);
  return request ?? null;
}

async function loadPeople(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      active: users.active,
    })
    .from(users)
    .where(inArray(users.id, ids));
}

export function notifyAssigneesOfTurn(input: {
  requestId: string;
  userIds: string[];
  positionName: string;
  kind: "review" | "approve";
}) {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;

  scheduleMail(async () => {
    const request = await loadRequest(input.requestId);
    if (!request) return;

    const people = (await loadPeople(userIds)).filter((person) => person.active);
    const url = requestUrl(request.id);
    const ref = requestRef(request.title, request.number);
    const duty = input.kind === "review" ? "review" : "approve";
    const subject = `Waiting on you: ${request.number ?? request.title}`;
    const lead = `A request is waiting on you as ${input.positionName} (${duty}).`;
    const links = linkBlock(url);

    for (const person of people) {
      await sendMail({
        to: person.email,
        subject,
        text: [lead, "", ref, "", links.text].join("\n"),
        html: `<p>${escapeHtml(lead)}</p><p>${escapeHtml(ref)}</p>${links.html}`,
      });
    }
  });
}

export function notifyRequesterOutcome(input: {
  requestId: string;
  outcome: "sent_back" | "rejected" | "approved";
  actorName: string;
  comment?: string | null;
}) {
  scheduleMail(async () => {
    const request = await loadRequest(input.requestId);
    if (!request) return;

    const [requester] = await loadPeople([request.submittedBy]);
    if (!requester?.active) return;

    const url = requestUrl(request.id);
    const ref = requestRef(request.title, request.number);
    const reason = input.comment?.trim() || null;
    const links = linkBlock(url);

    const copy =
      input.outcome === "sent_back"
        ? {
            subject: `Changes requested: ${request.number ?? request.title}`,
            lead: `${input.actorName} sent ${ref} back for changes.`,
          }
        : input.outcome === "rejected"
          ? {
              subject: `Rejected: ${request.number ?? request.title}`,
              lead: `${input.actorName} rejected ${ref}.`,
            }
          : {
              subject: `Approved: ${request.number ?? request.title}`,
              lead: `${input.actorName} approved ${ref}.`,
            };

    const textLines = [copy.lead];
    const htmlParts = [`<p>${escapeHtml(copy.lead)}</p>`];
    if (reason) {
      textLines.push("", `Reason: ${reason}`);
      htmlParts.push(`<p>Reason: ${escapeHtml(reason)}</p>`);
    }
    textLines.push("", links.text);
    htmlParts.push(links.html);

    await sendMail({
      to: requester.email,
      subject: copy.subject,
      text: textLines.join("\n"),
      html: htmlParts.join(""),
    });
  });
}
