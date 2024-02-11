import { describe, it, expect } from "vitest";
import { httpsPromisified } from "./httpsPromisify";
import { setupRecording } from "@/__tests__/polly";

describe("httpsPromisified", () => {
  setupRecording({});

  const TEST_URL = "https://test-http.local/";

  it("should make a GET request", async (ctx) => {
    ctx.polly?.server.get(TEST_URL).intercept((_req, res) => {
      res.json({
        data: {},
      });
    });

    await expect(httpsPromisified(TEST_URL, {}, "")).resolves.toMatchInlineSnapshot(`
      {
        "body": "{\\"data\\":{}}",
        "headers": {
          "content-type": "application/json; charset=utf-8",
        },
        "statusCode": 200,
      }
    `);
  });

  it("should make a POST request", async (ctx) => {
    ctx.polly?.server.post(TEST_URL).intercept((req, res) => {
      expect(req.jsonBody()).toEqual({ aaa: 123 });
      res.json({
        data: {},
      });
    });

    await expect(httpsPromisified(TEST_URL, { method: "POST" }, JSON.stringify({ aaa: 123 })))
      .resolves.toMatchInlineSnapshot(`
      {
        "body": "{\\"data\\":{}}",
        "headers": {
          "content-type": "application/json; charset=utf-8",
        },
        "statusCode": 200,
      }
    `);
  });
});
