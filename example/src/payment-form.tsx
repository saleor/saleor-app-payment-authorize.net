import { gql, useMutation } from "@apollo/client";
import React from "react";
import { AcceptHosted } from "react-acceptjs";
import { z } from "zod";
import {
	CheckoutCompleteDocument,
	CheckoutCompleteMutation,
	CheckoutCompleteMutationVariables,
	TransactionProcessDocument,
	TransactionProcessMutation,
	TransactionProcessMutationVariables,
} from "../generated/graphql";
import { AcceptData, getCheckoutId } from "./pay-button";
import { Status } from "./pages/cart";

const processTransactionRequestDataSchema = z.object({
	transactionId: z.string(),
});

const acceptHostedTransactionResponseSchema = z.object({
	transId: z.string(),
});

// not using the type from "react-acceptjs" because it's not accurate
type AcceptHostedTransactionResponse = z.infer<typeof acceptHostedTransactionResponseSchema>;

function resolveProcessTransactionRequestData(authorizeResponse: AcceptHostedTransactionResponse) {
	return processTransactionRequestDataSchema.parse({
		transactionId: authorizeResponse.transId,
	});
}

export function PaymentForm({
	acceptData,
	transactionId,
	status,
	setStatus,
}: {
	acceptData: AcceptData;
	transactionId: string;
	status: Status;
	setStatus: React.Dispatch<React.SetStateAction<Status>>;
}) {
	const checkoutId = getCheckoutId();

	const [processTransaction] = useMutation<TransactionProcessMutation, TransactionProcessMutationVariables>(
		gql(TransactionProcessDocument.toString()),
	);

	const [completeCheckout] = useMutation<CheckoutCompleteMutation, CheckoutCompleteMutationVariables>(
		gql(CheckoutCompleteDocument.toString()),
	);

	const checkoutCompleteHandler = async () => {
		const response = await completeCheckout({
			variables: {
				checkoutId,
			},
		});

		if (response.errors?.length) {
			throw new Error("Failed to complete checkout");
		}

		setStatus({ type: "complete_checkout" });
	};

	const transactionResponseHandler = React.useCallback(
		async (rawResponse: unknown) => {
			console.log("✅ transactionResponseHandler called");

			const authorizeResponse = acceptHostedTransactionResponseSchema.parse(rawResponse);

			if (!transactionId) {
				throw new Error("Transaction ID not found");
			}

			const data = resolveProcessTransactionRequestData(authorizeResponse);

			const processTransactionResponse = await processTransaction({
				variables: {
					transactionId,
					data,
				},
			});

			if (
				processTransactionResponse.data?.transactionProcess?.errors?.length &&
				processTransactionResponse.data?.transactionProcess?.errors?.length > 0
			) {
				throw new Error("Failed to change transaction to authorization success");
			}

			const status = processTransactionResponse.data?.transactionProcess?.transactionEvent?.type;

			if (!status) {
				throw new Error("Transaction status not found");
			}

			setStatus({ type: "transaction_status", status });
		},
		[processTransaction, setStatus, transactionId],
	);

	if (status.type === "payment") {
		return (
			<AcceptHosted
				integration="iframe"
				formToken={acceptData.formToken}
				environment={acceptData.environment.toUpperCase() as "SANDBOX" | "PRODUCTION"}
				onTransactionResponse={transactionResponseHandler}
			>
				<AcceptHosted.Button className="mt-2 rounded-md border bg-slate-900 px-8 py-2 text-lg text-white hover:bg-slate-800">
					Pay
				</AcceptHosted.Button>
				<AcceptHosted.IFrameBackdrop />
				<AcceptHosted.IFrameContainer>
					<AcceptHosted.IFrame />
				</AcceptHosted.IFrameContainer>
			</AcceptHosted>
		);
	}

	if (status.type === "transaction_status") {
		return (
			<div>
				<p>
					Transaction event status: <b>{status.status}</b>
				</p>
				<button
					className="mt-2 rounded-md border bg-slate-900 px-8 py-2 text-lg text-white hover:bg-slate-800"
					type="button"
					onClick={checkoutCompleteHandler}
				>
					Complete checkout
				</button>
			</div>
		);
	}

	if (status.type === "complete_checkout") {
		return (
			<div>
				<p>Checkout completed ✅</p>
			</div>
		);
	}

	return null;
}
