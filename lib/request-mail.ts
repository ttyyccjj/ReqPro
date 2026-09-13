import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { createTranslator, formatRequestRef, type MessageKey } from "@/lib/i18n";
import { requestUrl, scheduleMail, sendMail } from "@/lib/mail";
import { requests, users } from "@/lib/db/schema";

const en = createTranslator("en");
const ja = createTranslator("ja");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bilingual(english: string, japanese: string) {
  if (english === japanese) return english;
  return `${english} / ${japanese}`;
}

function linkBlock(url: string) {
  const label = bilingual(en("mail.open"), ja("mail.open"));
  return {
    text: `${label}\n${url}`,
    html: `<p>${escapeHtml(label)}<br /><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
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
    const refEn = formatRequestRef("en", request.title, request.number);
    const refJa = formatRequestRef("ja", request.title, request.number);
    const subjectRef = request.number ?? request.title;
    const dutyEn = input.kind === "review" ? en("mail.review") : en("mail.approve");
    const dutyJa = input.kind === "review" ? ja("mail.review") : ja("mail.approve");
    const subject = bilingual(
      en("mail.waitingSubject", { ref: subjectRef }),
      ja("mail.waitingSubject", { ref: subjectRef }),
    );
    const lead = bilingual(
      en("mail.waitingLead", { position: input.positionName, duty: dutyEn }),
      ja("mail.waitingLead", { position: input.positionName, duty: dutyJa }),
    );
    const ref = bilingual(refEn, refJa);
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
    const refEn = formatRequestRef("en", request.title, request.number);
    const refJa = formatRequestRef("ja", request.title, request.number);
    const subjectRef = request.number ?? request.title;
    const reason = input.comment?.trim() || null;
    const links = linkBlock(url);

    const keys: { subject: MessageKey; lead: MessageKey } =
      input.outcome === "sent_back"
        ? { subject: "mail.changesSubject", lead: "mail.changesLead" }
        : input.outcome === "rejected"
          ? { subject: "mail.rejectedSubject", lead: "mail.rejectedLead" }
          : { subject: "mail.approvedSubject", lead: "mail.approvedLead" };

    const copy = {
      subject: bilingual(
        en(keys.subject, { ref: subjectRef }),
        ja(keys.subject, { ref: subjectRef }),
      ),
      lead: bilingual(
        en(keys.lead, { actor: input.actorName, request: refEn }),
        ja(keys.lead, { actor: input.actorName, request: refJa }),
      ),
    };

    const textLines = [copy.lead];
    const htmlParts = [`<p>${escapeHtml(copy.lead)}</p>`];
    if (reason) {
      const reasonLine = bilingual(
        en("mail.reason", { reason }),
        ja("mail.reason", { reason }),
      );
      textLines.push("", reasonLine);
      htmlParts.push(`<p>${escapeHtml(reasonLine)}</p>`);
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
