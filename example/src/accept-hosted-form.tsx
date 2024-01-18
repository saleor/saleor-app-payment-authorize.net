import { gql, useMutation } from "@apollo/client";
import React from "react";
import { AcceptHosted } from "react-acceptjs";
import { z } from "zod";
import {
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";
import { getCheckoutId } from "./pages/cart";
import { AcceptHostedData } from "./payment-methods";
import { useRouter } from "next/router";

const acceptHostedTransactionInitializeDataSchema = z.object({
	type: z.literal("acceptHosted"),
	data: z.object({
		authorizeTransactionId: z.string(),
	}),
});

type AcceptHostedTransactionInitializeData = z.infer<typeof acceptHostedTransactionInitializeDataSchema>;

const acceptHostedTransactionResponseSchema = z.object({
	transId: z.string(),
});

export function AcceptHostedForm({ acceptData }: { acceptData: AcceptHostedData }) {
	const checkoutId = getCheckoutId();
	const router = useRouter();

	const [initializeTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const transactionResponseHandler = React.useCallback(
		async (rawResponse: unknown) => {
			console.log("✅ transactionResponseHandler called");

			const authorizeResponse = acceptHostedTransactionResponseSchema.parse(rawResponse);

			const data: AcceptHostedTransactionInitializeData = {
				data: {
					authorizeTransactionId: authorizeResponse.transId,
				},
				type: "acceptHosted",
			};

			const initializeTransactionResponse = await initializeTransaction({
				variables: {
					checkoutId,
					paymentGateway: authorizeNetAppId,
					data,
				},
			});

			if (
				initializeTransactionResponse.data?.transactionInitialize?.errors?.length &&
				initializeTransactionResponse.data?.transactionInitialize?.errors?.length > 0
			) {
				throw new Error("Failed to initialize transaction");
			}

			router.push("/success");
		},
		[checkoutId, initializeTransaction, router],
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
