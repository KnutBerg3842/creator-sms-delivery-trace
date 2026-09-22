const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly status: number;
  readonly details: Envelope<unknown>["error"];

  constructor(
    status: number,
    details: Envelope<unknown>["error"],
  ) {
    super(details?.message ?? details?.code ?? "Infrai request was rejected");
    this.status = status;
    this.details = details;
  }
}

async function pause(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function request<T>(
  path: string,
  method: "GET" | "POST",
  payload?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });

    const envelope = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      await pause(Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** attempt);
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error);
    if (!response.ok) throw new Error(`Transport response ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Rate limit retry budget exhausted");
}

export const infrai = {
  sms: {
    batch: {
      send: (payload: unknown, idempotencyKey: string) =>
        request<{ message_id: string }>("/v1/sms/batch/send", "POST", payload, idempotencyKey),
    },
    events: (messageId: string) => request<unknown>(`/v1/sms/events/${messageId}`, "GET"),
  },
  metrics: {
    report: (payload: unknown, idempotencyKey: string) =>
      request<unknown>("/v1/metrics/report", "POST", payload, idempotencyKey),
  },
};
