import AuthorizeNet from "authorizenet";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

const mockedInput = {
  creditCardNumber: "4111111111111111",
  expirationDate: "2023-12",
  cardCode: "123",
  orderDescription: "Saleor order",
  orderInvoiceNumber: "INV-12345",
  lines: [
    {
      description: "Cool T-Shirt from Saleor",
      id: "test",
      name: "T-Shirt",
      quantity: 1,
      unitPrice: 1,
    },
  ],
};

// This function doesn't know anything about the payment method
function buildTransactionFromPayload(
  payload: TransactionInitializeSessionEventFragment,
  payment: AuthorizeNet.APIContracts.PaymentType,
): AuthorizeNet.APIContracts.TransactionRequestType {
  // todo: map order data
  // const order = new ApiContracts.OrderType();
  // order.setDescription(payload.orderDescription);
  // order.setInvoiceNumber(input.orderInvoiceNumber);

  const lineItems = new ApiContracts.ArrayOfLineItem();

  const mappedLineItems = payload.sourceObject.lines.map((line) => {
    const lineItem = new ApiContracts.LineItemType();
    const name =
      line.__typename === "OrderLine" ? line.orderVariant?.name : line.checkoutVariant.name;

    lineItem.setItemId(line.id);
    lineItem.setName(name);
    // lineItem.setDescription(line.description);
    lineItem.setQuantity(line.quantity);
    // todo: replace with unit price
    lineItem.setUnitPrice(1);
    return lineItem;
  });

  lineItems.setLineItem(mappedLineItems);

  const transactionRequest = new ApiContracts.TransactionRequestType();
  transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequest.setAmount(payload.action.amount);
  transactionRequest.setPayment(payment);
  // transactionRequest.setOrder(order);
  transactionRequest.setLineItems(lineItems);

  return transactionRequest;
}

function buildCreditCardTransaction(
  payload: TransactionInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  ApiContracts.PaymentMethodEnum;
  // todo: replace with real credit card
  const creditCard = new ApiContracts.CreditCardType();
  creditCard.setCardNumber(mockedInput.creditCardNumber);
  creditCard.setExpirationDate(mockedInput.expirationDate);
  creditCard.setCardCode(mockedInput.cardCode);

  const payment = new ApiContracts.PaymentType();
  payment.setCreditCard(creditCard);

  return buildTransactionFromPayload(payload, payment);
}

export const transactionBuilder = {
  buildCreditCardTransaction,
};
