import https from "node:https";
import { type IncomingHttpHeaders } from "node:http2";
import { isNotNullish } from "@/lib/utils";
import { HttpRequestError } from "@/errors";

type HttpsPromisifiedResult = { statusCode: number; headers: IncomingHttpHeaders; body: string };

// based on https://gist.github.com/ktheory/df3440b01d4b9d3197180d5254d7fb65
export const httpsPromisified = (url: string | URL, options: https.RequestOptions, data: string) =>
  new Promise<HttpsPromisifiedResult>((resolve, reject) => {
    try {
      const req = https.request(url, options, (res) => {
        let body = "";

        res.on("data", (chunk) => (body += chunk));
        res.on("error", reject);
        res.on("end", () => {
          const { statusCode, headers } = res;

          // @TODO: how to test failing requests
          /* c8 ignore start */
          if (isNotNullish(statusCode) && statusCode !== 0) {
            return resolve({ statusCode, headers, body });
          } else {
            return reject(
              new HttpRequestError("Http Request Error", { props: { statusCode, body, headers } }),
            );
            /* c8 ignore stop */
          }
        });
      });

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject("Timeout");
      });
      req.setTimeout(20_000); // Saleor sync webhook timeout is 20s
      req.write(data, "utf-8");
      req.end();
    } catch (e) {
      reject(e);
    }
  });
