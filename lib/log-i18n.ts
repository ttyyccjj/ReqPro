import { formatRequestRef, type Translator } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import type { SystemLogCategory, SystemLogItem } from "@/lib/system-log";

function quotedTitle(summary: string) {
  return summary.match(/"([^"]+)"/)?.[1] ?? summary.match(/「([^」]+)」/)?.[1];
}

function afterPrefix(summary: string, prefixes: string[]) {
  for (const prefix of prefixes) {
    if (summary.startsWith(prefix)) return summary.slice(prefix.length).trim();
  }
  return null;
}

function renamedParts(summary: string, prefixes: string[]) {
  for (const prefix of prefixes) {
    if (!summary.startsWith(prefix)) continue;
    const rest = summary.slice(prefix.length);
    const match = rest.match(/^(.+) to (.+)$/);
    if (match) return { from: match[1], to: match[2] };
  }
  return null;
}

function requestRefFromItem(locale: Locale, item: SystemLogItem) {
  const title = quotedTitle(item.summary);
  if (title) return formatRequestRef(locale, title, item.requestNumber);
  return item.requestNumber ?? "";
}

function withReason(t: Translator, summary: string, source: string) {
  const reason = source.match(/ — (.+)$/)?.[1];
  if (!reason) return summary;
  return t("log.withReason", { summary, reason });
}

function personChanges(t: Translator, summary: string) {
  const rest = summary.replace(/^Updated [^:]+:\s*/, "");
  return rest
    .split(", ")
    .map((part) => {
      const role = part.match(/^role to (.+)$/);
      if (role) return t("log.roleTo", { value: role[1] });
      const position = part.match(/^position to (.+)$/);
      if (position) {
        return t("log.positionTo", {
          value: position[1] === "none" ? t("log.none") : position[1],
        });
      }
      const department = part.match(/^department to (.+)$/);
      if (department) {
        return t("log.departmentTo", {
          value: department[1] === "none" ? t("log.none") : department[1],
        });
      }
      return part;
    })
    .join("、");
}

export function translateLogSummary(
  t: Translator,
  locale: Locale,
  item: SystemLogItem,
) {
  const ref = requestRefFromItem(locale, item);

  switch (item.action) {
    case "account.created":
      return t("log.accountCreated");
    case "account.signed_in":
      return t("log.signedIn");
    case "account.signed_out":
      return t("log.signedOut");
    case "account.password_changed":
      return t("log.passwordChanged");
    case "request.submitted":
      return t("log.submitted", { ref });
    case "request.resubmitted":
      return t("log.resubmitted", { ref });
    case "request.withdrawn":
      return t("log.withdrew", { ref });
    case "request.passed":
      return withReason(t, t("log.passed", { ref }), item.summary);
    case "request.approved":
      return withReason(t, t("log.approved", { ref }), item.summary);
    case "request.sent_back":
      return withReason(t, t("log.sentBack", { ref }), item.summary);
    case "request.rejected":
      return withReason(t, t("log.rejected", { ref }), item.summary);
    case "request.retracted":
      return withReason(t, t("log.retracted", { ref }), item.summary);
    case "type.created":
      return t("log.typeCreated", {
        name: afterPrefix(item.summary, ["Created request type "]) ?? item.summary,
      });
    case "type.renamed": {
      const parts = renamedParts(item.summary, ["Renamed request type "]);
      return parts
        ? t("log.typeRenamed", parts)
        : item.summary;
    }
    case "type.activated":
      return t("log.typeActivated", {
        name: afterPrefix(item.summary, ["Activated request type "]) ?? item.summary,
      });
    case "type.deactivated":
      return t("log.typeDeactivated", {
        name: afterPrefix(item.summary, ["Deactivated request type "]) ?? item.summary,
      });
    case "position.created":
      return t("log.positionCreated", {
        name: afterPrefix(item.summary, ["Created position "]) ?? item.summary,
      });
    case "position.renamed": {
      const parts = renamedParts(item.summary, ["Renamed position "]);
      return parts ? t("log.positionRenamed", parts) : item.summary;
    }
    case "position.activated":
      return t("log.positionActivated", {
        name: afterPrefix(item.summary, ["Activated position "]) ?? item.summary,
      });
    case "position.deactivated":
      return t("log.positionDeactivated", {
        name: afterPrefix(item.summary, ["Deactivated position "]) ?? item.summary,
      });
    case "department.created":
      return t("log.departmentCreated", {
        name: afterPrefix(item.summary, ["Created department "]) ?? item.summary,
      });
    case "department.renamed": {
      const parts = renamedParts(item.summary, ["Renamed department "]);
      return parts ? t("log.departmentRenamed", parts) : item.summary;
    }
    case "department.activated":
      return t("log.departmentActivated", {
        name: afterPrefix(item.summary, ["Activated department "]) ?? item.summary,
      });
    case "department.deactivated":
      return t("log.departmentDeactivated", {
        name: afterPrefix(item.summary, ["Deactivated department "]) ?? item.summary,
      });
    case "person.updated": {
      const name = item.summary.match(/^Updated ([^:]+):/)?.[1] ?? item.actorName;
      return t("log.personUpdated", { name, changes: personChanges(t, item.summary) });
    }
    case "person.activated":
      return t("log.personActivated", {
        name: afterPrefix(item.summary, ["Activated "]) ?? item.summary,
      });
    case "person.deactivated":
      return t("log.personDeactivated", {
        name: afterPrefix(item.summary, ["Deactivated "]) ?? item.summary,
      });
    case "route.updated": {
      const count = item.summary.match(/(\d+)/)?.[1] ?? "0";
      return t("log.routeUpdated", {
        count,
        steps: Number(count) === 1 ? t("log.step") : t("log.steps"),
      });
    }
    default:
      return item.summary;
  }
}

export function translateLogCategory(t: Translator, category: SystemLogCategory) {
  if (category === "Request") return t("logs.categoryRequest");
  if (category === "People") return t("logs.categoryPeople");
  if (category === "Settings") return t("logs.categorySettings");
  return t("logs.categoryAccount");
}
