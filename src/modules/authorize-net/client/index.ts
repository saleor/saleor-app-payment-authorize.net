import AuthorizeNet from "authorizenet";
import { type AuthorizeNetConfig } from "../authorize-net-config";
import { createTypeSafeTransaction } from "./create-transaction";
import { createLogger } from "@/lib/logger";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const ApiConstants = AuthorizeNet.Constants;

type AuthorizeTransactionInput = {
  amount: number;
  creditCardNumber: string;
  expirationDate: string;
  cardCode: string;
  orderDescription: string;
  orderInvoiceNumber: string;
  lines: [
    {
      id: string;
      name: string;
      description: string;
      quantity: number;
      unitPrice: number;
    },
  ];
};

export class AuthorizeNetClient {
  private merchantAuthenticationType: AuthorizeNet.APIContracts.MerchantAuthenticationType;
  private logger = createLogger({
    name: "AuthorizeNetClient",
  });

  constructor(private config: AuthorizeNetConfig) {
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.apiLoginId);
    merchantAuthenticationType.setTransactionKey(config.transactionKey);

    this.merchantAuthenticationType = merchantAuthenticationType;
  }

  private getEnvironment() {
    return this.config.isSandBox ? ApiConstants.endpoint.sandbox : ApiConstants.endpoint.production;
  }

  /*
    https://developer.authorize.net/api/reference/features/credit_card_tutorial.html
    https://developer.authorize.net/hello_world.html
  */
  async chargeCreditCard({
    amount,
    creditCardNumber,
    expirationDate,
    cardCode,
    orderDescription,
    orderInvoiceNumber,
    lines,
  }: AuthorizeTransactionInput) {
    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(creditCardNumber);
    creditCard.setExpirationDate(expirationDate);
    creditCard.setCardCode(cardCode);

    const order = new ApiContracts.OrderType();
    order.setDescription(orderDescription);
    order.setInvoiceNumber(orderInvoiceNumber);

    const lineItems = new ApiContracts.ArrayOfLineItem();

    const mappedLineItems = lines.map((line) => {
      const lineItem = new ApiContracts.LineItemType();
      lineItem.setItemId(line.id);
      lineItem.setName(line.name);
      lineItem.setDescription(line.description);
      lineItem.setQuantity(line.quantity);
      lineItem.setUnitPrice(line.unitPrice);
      return lineItem;
    });

    lineItems.setLineItem(mappedLineItems);

    const payment = new ApiContracts.PaymentType();
    payment.setCreditCard(creditCard);

    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);
    transactionRequest.setPayment(payment);
    transactionRequest.setOrder(order);
    transactionRequest.setLineItems(lineItems);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequest);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    const response = await createTypeSafeTransaction(transactionController);
    this.logger.info({ response });

    return response;
  }
}
