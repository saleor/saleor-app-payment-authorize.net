import { gql, useMutation } from "@apollo/client";
import { useRouter } from "next/router";
import React from "react";
import { AcceptHosted } from "react-acceptjs";
import {
	TransactionProcessDocument,
	TransactionProcessMutation,
	TransactionProcessMutationVariables,
} from "../generated/graphql";
import { AcceptData } from "./pay-button";

export function PaymentForm({
	acceptData,
	transactionId,
}: {
	acceptData: AcceptData;
	transactionId: string;
}) {
	const router = useRouter();

	const [processTransaction] = useMutation<TransactionProcessMutation, TransactionProcessMutationVariables>(
		gql(TransactionProcessDocument.toString()),
	);

	const changeTransactionToAuthorizationFailure = React.useCallback(async () => {
		console.log("❌ changeTransactionToAuthorizationFailure called");
		console.log("transactionId: ", transactionId);
		if (!transactionId) {
			throw new Error("Transaction ID not found");
		}

		const response = await processTransaction({
			variables: {
				transactionId,
				data: {
					result: "AUTHORIZATION_FAILURE",
				},
			},
		});

		if (
			response.data?.transactionProcess?.errors?.length &&
			response.data?.transactionProcess?.errors?.length > 0
		) {
			throw new Error("Failed to change transaction to authorization failure");
		}

		console.log("Transaction status changed to authorization failure");
	}, [processTransaction, transactionId]);

	const changeTransactionToAuthorizationSuccess = React.useCallback(async () => {
		console.log("✅ changeTransactionToAuthorizationSuccess called");
		console.log("initializedTransactionId: ", transactionId);
		if (!transactionId) {
			throw new Error("Transaction ID not found");
		}
		const response = await processTransaction({
			variables: {
				transactionId,
				data: {
					result: "AUTHORIZATION_SUCCESS",
				},
			},
		});

		if (
			response.data?.transactionProcess?.errors?.length &&
			response.data?.transactionProcess?.errors?.length > 0
		) {
			throw new Error("Failed to change transaction to authorization success");
		}

		console.log("Transaction status changed to authorization success");
	}, [processTransaction, transactionId]);

	const transactionResponseHandler = React.useCallback(async () => {
		console.log("🔥 transactionResponseHandler called");

		await changeTransactionToAuthorizationSuccess();
		router.push("/success");
	}, [changeTransactionToAuthorizationSuccess, router]);

	const cancelHandler = React.useCallback(async () => {
		console.log("🔥 cancelHandler called");

		await changeTransactionToAuthorizationFailure();
	}, [changeTransactionToAuthorizationFailure]);

	return (
		<AcceptHosted
			integration="iframe"
			formToken={acceptData.formToken}
			environment={acceptData.environment}
			onTransactionResponse={transactionResponseHandler}
			onCancel={cancelHandler}
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
