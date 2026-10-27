import { describe, expect, it, vi } from "vitest";

import { api, ApiError, setSessionExpiredHandler } from "./client";

function json(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const r of responses) fetchMock.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("api client", () => {
  it("sends cookies and the CSRF header on writes, but not on reads", async () => {
    document.cookie = "ev_csrf=token123; path=/";
    const fetchMock = mockFetch(json(200, { ok: 1 }), json(201, { id: "x" }));

    await api.get("/knowledge", { query: { q: "rust", tag: "", limit: 5 } });
    await api.post("/knowledge", { title: "t" });

    const [getUrl, getInit] = fetchMock.mock.calls[0];
    expect(getUrl).toBe("/api/v1/knowledge?q=rust&limit=5");
    expect(getInit?.credentials).toBe("include");
    expect((getInit?.headers as Record<string, string>)["X-CSRF-Token"]).toBeUndefined();

    const [, postInit] = fetchMock.mock.calls[1];
    expect((postInit?.headers as Record<string, string>)["X-CSRF-Token"]).toBe("token123");
    expect(postInit?.body).toBe(JSON.stringify({ title: "t" }));
  });

  it("refreshes the session once on 401 and retries the request", async () => {
    const fetchMock = mockFetch(json(401, { detail: "Session expired" }), json(200, {}), json(200, { id: "me" }));
    await expect(api.get("/auth/me")).resolves.toEqual({ id: "me" });
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["/api/v1/auth/me", "/api/v1/auth/refresh", "/api/v1/auth/me"]);
  });

  it("reports session expiry when refresh fails", async () => {
    const expired = vi.fn();
    setSessionExpiredHandler(expired);
    mockFetch(json(401, { detail: "Session expired" }), json(401, { detail: "Session expired" }));
    await expect(api.get("/knowledge")).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
    setSessionExpiredHandler(null);
  });

  it("does not try to refresh for auth calls that opt out", async () => {
    const fetchMock = mockFetch(json(401, { detail: "Invalid email or password" }));
    await expect(api.post("/auth/login", {}, { noRefresh: true })).rejects.toThrow("Invalid email or password");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps validation errors to fields", async () => {
    mockFetch(json(422, { detail: [{ loc: ["body", "title"], msg: "String should have at least 1 character" }] }));
    const error = await api.post("/knowledge", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({ title: "String should have at least 1 character" });
  });

  it("turns network failures into a friendly error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const error = (await api.get("/knowledge").catch((e: unknown) => e)) as ApiError;
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toMatch(/can't reach the server/i);
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch(json(204, null));
    await expect(api.delete("/knowledge/1")).resolves.toBeUndefined();
  });

  it("uses a generic message for server errors", async () => {
    mockFetch(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(api.get("/x")).rejects.toThrow(/server is having trouble/i);
  });
});
