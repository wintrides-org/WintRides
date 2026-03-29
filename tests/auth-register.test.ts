import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/auth/register/route.ts";

test("rejects non-campus email with 400", async () => {
  // Ensures registration blocks non-.edu emails.
  const request = {
    json: async () => ({
      email: "user@gmail.com",
      userName: "testuser",
      password: "password123"
    }),
    nextUrl: new URL("http://localhost/api/auth/register")
  } as any;

  const response = await POST(request);
  assert.equal(response.status, 400);

  const data = await response.json();
  assert.match(String(data.error), /campus domain/i);
});
