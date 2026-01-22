import { test } from "node:test";
import assert from "node:assert/strict";
import { POST as register } from "../app/api/auth/register/route";
import { GET as usernameAvailable } from "../app/api/auth/username-available/route";

test("register rejects invalid username", async () => {
  // Ensures register API enforces username rules at submit time.
  const request = {
    json: async () => ({
      email: "user@school.edu",
      userName: "12bad",
      password: "password123"
    }),
    nextUrl: new URL("http://localhost/api/auth/register")
  } as any;

  const response = await register(request);
  assert.equal(response.status, 400);

  const data = await response.json();
  assert.match(String(data.error), /username/i);
});

test("username availability rejects invalid username", async () => {
  // Ensures availability endpoint reports invalid usernames as unavailable.
  const request = {
    nextUrl: new URL("http://localhost/api/auth/username-available?userName=12bad")
  } as any;

  const response = await usernameAvailable(request);
  assert.equal(response.status, 200);

  const data = await response.json();
  assert.equal(data.available, false);
  assert.match(String(data.error), /username/i);
});
