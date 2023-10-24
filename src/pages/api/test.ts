import { type NextApiRequest, type NextApiResponse } from "next";
import { AuthorizeNetClient } from "@/modules/authorize-net/client";
import { authorizeMockedConfig } from "@/modules/authorize-net/authorize-net-config";

const AuthorizeNet = new AuthorizeNetClient(authorizeMockedConfig);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  await AuthorizeNet.chargeCreditCard({
    amount: 100,
    creditCardNumber: "4111111111111111",
    expirationDate: "2023-12",
    cardCode: "123",
    orderDescription: "Saleor order",
    orderInvoiceNumber: "INV-12346",
    lines: [
      {
        description: "Cool T-Shirt from Saleor",
        id: "test",
        name: "T-Shirt",
        quantity: 1,
        unitPrice: 1,
      },
    ],
  });
  res.status(200).json({ message: "Hello from Next.js!" });
}
