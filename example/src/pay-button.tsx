import { gql, useMutation } from "@apollo/client";
import React, { useState } from "react";
import { z } from "zod";
import {
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";
import { PaymentForm } from "./payment-form";

const acceptDataSchema = z.object({
	environment: z.enum(["sandbox", "production"]),
	formToken: z.string(),
});

export type AcceptData = z.infer<typeof acceptDataSchema>;

function getCheckoutId() {
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	return checkoutId;
}

export function PayButton({
	setTransactionStatus,
}: {
	setTransactionStatus: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [acceptData, setAcceptData] = useState<AcceptData>();
	const [transactionId, setTransactionId] = useState<string>();

	const checkoutId = getCheckoutId();

	const [initializeTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const getAcceptData = React.useCallback(async () => {
		console.log("🔄 getAcceptData called");
		setIsLoading(true);

		const response = await initializeTransaction({
			variables: {
				checkoutId,
				paymentGateway: authorizeNetAppId,
				data: {},
			},
		});

		const data = response?.data?.transactionInitialize;
		const isError = (response?.errors?.length ?? 0) > 0;

		if (!data || isError) {
			throw new Error("Failed to initialize transaction");
		}

		const nextTransactionId = data.transaction?.id;

		setIsLoading(false);
		const nextAcceptData = acceptDataSchema.parse(data.data);
		setAcceptData(nextAcceptData);
		setTransactionId(nextTransactionId);
	}, [checkoutId, initializeTransaction]);

	React.useEffect(() => {
		if (!acceptData) {
			getAcceptData();
		}
	}, [acceptData, getAcceptData]);

	return (
		<div>
			{isLoading && <p>Loading...</p>}
			{acceptData && transactionId && (
				<PaymentForm setStatus={setTransactionStatus} acceptData={acceptData} transactionId={transactionId} />
			)}
		</div>
	);
}
