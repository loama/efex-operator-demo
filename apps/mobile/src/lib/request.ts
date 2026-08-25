const unavailableMessage = "El servicio demo no está disponible. Intenta de nuevo.";

export async function requestJson<T>(origin: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(unavailableMessage);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(unavailableMessage);
  }

  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : unavailableMessage;
    throw new Error(message);
  }
  return body as T;
}
