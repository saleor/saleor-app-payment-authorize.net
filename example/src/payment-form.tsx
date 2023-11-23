import { gql, useMutation } from "@apollo/client";
import React from "react";
import { AcceptHosted } from "react-acceptjs";
import { z } from "zod";
import {
	TransactionProcessDocument,
	TransactionProcessMutation,
	TransactionProcessMutationVariables,
} from "../generated/graphql";
import { AcceptData } from "./pay-button";

const processTransactionRequestDataSchema = z.object({
	transactionId: z.string(),
	// todo: bring back once I find out why there is no customerProfileId in the response
	// customerProfileId: z.string().optional(),
});

const acceptHostedTransactionResponseSchema = z.object({
	transId: z.string(),
});

// not using the type from "react-acceptjs" because it's not accurate
type AcceptHostedTransactionResponse = z.infer<typeof acceptHostedTransactionResponseSchema>;

function resolveProcessTransactionRequestData(authorizeResponse: AcceptHostedTransactionResponse) {
	return processTransactionRequestDataSchema.parse({
		transactionId: authorizeResponse.transId,
		// todo: bring back once I find out why there is no customerProfileId in the response
		// ...(authorizeResponse.profileResponse.customerProfileId && {
		// 	customerProfileId: authorizeResponse.profileResponse.customerProfileId,
		// }),
	});
}

export function PaymentForm({
	acceptData,
	transactionId,
	setStatus,
}: {
	acceptData: AcceptData;
	transactionId: string;
	setStatus: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
	const [processTransaction] = useMutation<TransactionProcessMutation, TransactionProcessMutationVariables>(
		gql(TransactionProcessDocument.toString()),
	);

	const transactionResponseHandler = React.useCallback(
		async (rawResponse: unknown) => {
			console.log("✅ transactionResponseHandler called");
			console.log("initializedTransactionId: ", transactionId);

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

			setStatus(status);
		},
		[processTransaction, setStatus, transactionId],
	);

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
