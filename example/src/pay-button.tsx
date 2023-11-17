import { AcceptHosted, AcceptHostedTransactionResponse, AuthNetEnvironment } from "react-acceptjs";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/router";
import React, { useState } from "react";
import {
	GetCheckoutByIdDocument,
	GetCheckoutByIdQuery,
	GetCheckoutByIdQueryVariables,
	PaymentGatewayInitializeDocument,
	PaymentGatewayInitializeMutation,
	PaymentGatewayInitializeMutationVariables,
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";

type AcceptData = {
	environment: AuthNetEnvironment;
	formToken: string;
};

export function PayButton() {
	const [isError, setIsError] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [acceptData, setAcceptData] = useState<AcceptData>();

	const router = useRouter();
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	const { data: checkoutResponse, loading: isCheckoutLoading } = useQuery<
		GetCheckoutByIdQuery,
		GetCheckoutByIdQueryVariables
	>(gql(GetCheckoutByIdDocument.toString()), { variables: { id: checkoutId } });

	const [initializePaymentGateway] = useMutation<
		PaymentGatewayInitializeMutation,
		PaymentGatewayInitializeMutationVariables
	>(gql(PaymentGatewayInitializeDocument.toString()));

	const [createTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const isAuthorizeAppInstalled = checkoutResponse?.checkout?.availablePaymentGateways.some(
		(gateway) => gateway.id === authorizeNetAppId,
	);

	const getAcceptData = React.useCallback(async () => {
		if (checkoutId) {
			setIsLoading(true);
			const response = await initializePaymentGateway({
				variables: {
					checkoutId,
					paymentGateway: authorizeNetAppId,
				},
			});

			if (response.data?.paymentGatewayInitialize?.errors.length) {
				throw new Error("Failed to initialize payment gateway");
			}

			const data = response.data?.paymentGatewayInitialize?.gatewayConfigs?.find(
				(config) => config.id === authorizeNetAppId,
			)?.data;

			if (!data) {
				throw new Error("Failed to get payment gateway data");
			}

			const nextAcceptData = data as AcceptData;

			setIsLoading(false);
			setAcceptData(nextAcceptData);
		}
	}, [checkoutId, initializePaymentGateway]);

	React.useEffect(() => {
		getAcceptData();
	}, [getAcceptData]);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const transactionResponseHandler = async (response: AcceptHostedTransactionResponse) => {
		console.log(response);
		if (checkoutResponse?.checkout) {
			try {
				const isSuccess = response.messages.resultCode === "Ok";

				const saleorTransactionResponse = await createTransaction({
					variables: {
						checkoutId: checkoutResponse.checkout.id,
						paymentGateway: authorizeNetAppId,
						data: {
							result: isSuccess ? "success" : "failure",
						},
					},
				});

				if (
					saleorTransactionResponse.data?.transactionInitialize?.errors?.length &&
					saleorTransactionResponse.data?.transactionInitialize?.errors?.length > 0
				) {
					throw new Error("Failed to initialize transaction");
				}

				router.push("/success");
			} catch (error) {
				console.error(error);
				setIsError(true);
			}
		}
	};

	if (!checkoutResponse || isCheckoutLoading) {
		return <div>Loading…</div>;
	}

	if (!isAuthorizeAppInstalled) {
		return (
			<div className="text-red-500">
				Authorize.net App was not installed in this Saleor Cloud instance. Go to{" "}
				<a href="https://authorize.saleor.app/">authorize.saleor.app</a> and follow the instructions.
			</div>
		);
	}

	if (isError) {
		return <div className="text-red-500">Error while creating a transaction</div>;
	}

	return (
		<div>
			{isLoading && <p>Loading...</p>}
			{acceptData && (
				<AcceptHosted
					integration="redirect"
					formToken={acceptData.formToken}
					environment={acceptData.environment}
				>
					<button className="mt-2 rounded-md border bg-slate-900 px-8 py-2 text-lg text-white hover:bg-slate-800">
						Pay
					</button>
				</AcceptHosted>
			)}
		</div>
	);
}
