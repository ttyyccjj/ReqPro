import { countInboxFor } from "@/lib/inbox-count";

type Subscriber = {
  userId: string;
  send: (count: number) => void;
};

const globalForInbox = globalThis as typeof globalThis & {
  inboxSubscribers?: Set<Subscriber>;
};

const subscribers = globalForInbox.inboxSubscribers ?? new Set<Subscriber>();
globalForInbox.inboxSubscribers = subscribers;

export function subscribeInbox(userId: string, send: (count: number) => void) {
  const subscriber = { userId, send };
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function notifyInbox(userIds?: string[]) {
  const targets = new Set(
    userIds ?? [...subscribers].map((subscriber) => subscriber.userId),
  );

  void Promise.all(
    [...targets].map(async (userId) => {
      const value = await countInboxFor(userId);
      for (const subscriber of subscribers) {
        if (subscriber.userId === userId) {
          try {
            subscriber.send(value);
          } catch {
            subscribers.delete(subscriber);
          }
        }
      }
    }),
  );
}
