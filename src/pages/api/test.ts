import { type NextApiRequest, type NextApiResponse } from "next";
import { AuthorizeNetClient } from "@/modules/authorize-net/authorize-net-client";

const AuthorizeNet = new AuthorizeNetClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  AuthorizeNet.ping();
  res.status(200).json({ message: "Hello from Next.js!" });
}
