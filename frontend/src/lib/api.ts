import type {
  Entry,
  EntryInput,
  EntryQuery,
  Meta,
  PageResponse,
  Stats,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("Cannot reach the API. Is the service running?", 0);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  const payload = raw ? safeJson(raw) : null;

  if (!response.ok) {
    const message =
      (payload && (payload.detail || payload.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload?.errors ?? {});
  }

  return payload as T;
}

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toQueryString(query: EntryQuery): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  listEntries: (query: EntryQuery) =>
    request<PageResponse<Entry>>(`/entries${toQueryString(query)}`),

  getEntry: (id: string) => request<Entry>(`/entries/${id}`),

  createEntry: (input: EntryInput) =>
    request<Entry>("/entries", { method: "POST", body: JSON.stringify(input) }),

  updateEntry: (id: string, input: EntryInput) =>
    request<Entry>(`/entries/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  deleteEntry: (id: string) =>
    request<void>(`/entries/${id}`, { method: "DELETE" }),

  getStats: () => request<Stats>("/entries/stats"),

  getMeta: () => request<Meta>("/entries/meta"),
};
