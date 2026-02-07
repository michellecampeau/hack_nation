export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetcher<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API error: ${response.statusText}`);
  }

  return response.json();
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  return fetcher<T>(url, { method: "GET" });
}

export async function apiPost<T = unknown>(url: string, data: unknown): Promise<T> {
  return fetcher<T>(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiPut<T = unknown>(url: string, data: unknown): Promise<T> {
  return fetcher<T>(url, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiPatch<T = unknown>(url: string, data: unknown): Promise<T> {
  return fetcher<T>(url, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  return fetcher<T>(url, { method: "DELETE" });
}
