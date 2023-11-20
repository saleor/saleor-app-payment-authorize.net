import { AuthNetEnvironment } from "react-acceptjs";

import { gql, useMutation } from "@apollo/client";
import React, { useState } from "react";
import {
	PaymentGatewayInitializeDocument,
	PaymentGatewayInitializeMutation,
	PaymentGatewayInitializeMutationVariables,
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";
import { PaymentForm } from "./payment-form";

export type AcceptData = {
	environment: AuthNetEnvironment;
	formToken: string;
};

function getCheckoutId() {
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	return checkoutId;
}

export function PayButton() {
	const [isLoading, setIsLoading] = useState(false);
	const [acceptData, setAcceptData] = useState<AcceptData>();
	const [transactionId, setTransactionId] = useState<string>();

	const checkoutId = getCheckoutId();

	const [initializePaymentGateway] = useMutation<
		PaymentGatewayInitializeMutation,
		PaymentGatewayInitializeMutationVariables
	>(gql(PaymentGatewayInitializeDocument.toString()));

	const [initializeTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const getAcceptData = React.useCallback(async () => {
		console.log("🔄 getAcceptData called");
		setIsLoading(true);

		const initializePaymentGatewayResponse = await initializePaymentGateway({
			variables: {
				checkoutId,
				paymentGateway: authorizeNetAppId,
			},
		});

		if (initializePaymentGatewayResponse.data?.paymentGatewayInitialize?.errors.length) {
			throw new Error("Failed to initialize payment gateway");
		}

		const data = initializePaymentGatewayResponse.data?.paymentGatewayInitialize?.gatewayConfigs?.find(
			(config) => config.id === authorizeNetAppId,
		)?.data;

		if (!data) {
			throw new Error("Failed to get payment gateway data");
		}

		const nextAcceptData = data as AcceptData;

		const saleorTransactionResponse = await initializeTransaction({
			variables: {
				checkoutId,
				paymentGateway: authorizeNetAppId,
				data: {},
			},
		});

		if (
			saleorTransactionResponse.data?.transactionInitialize?.errors?.length &&
			saleorTransactionResponse.data?.transactionInitialize?.errors?.length > 0
		) {
			throw new Error("Failed to initialize transaction");
		}

		const nextTransactionId = saleorTransactionResponse.data?.transactionInitialize?.transaction?.id;

		setIsLoading(false);
		setAcceptData(nextAcceptData);
		setTransactionId(nextTransactionId);
	}, [checkoutId, initializePaymentGateway, initializeTransaction]);

	React.useEffect(() => {
		if (!acceptData) {
			getAcceptData();
		}
	}, [acceptData, getAcceptData]);

	return (
		<div>
			{isLoading && <p>Loading...</p>}
			{acceptData && transactionId && <PaymentForm acceptData={acceptData} transactionId={transactionId} />}
		</div>
	);
}
