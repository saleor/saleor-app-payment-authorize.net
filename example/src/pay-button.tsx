import { AuthNetEnvironment, HostedForm, HostedFormDispatchDataResponse } from "react-acceptjs";

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
	apiLoginId: string;
	environment: AuthNetEnvironment;
	publicClientKey: string;
};

export function PayButton() {
	const [isError, setIsError] = useState(false);
	const [acceptData, setAcceptData] = useState<AcceptData>({
		apiLoginId: "",
		environment: "SANDBOX",
		publicClientKey: "",
	});

	const { environment, apiLoginId, publicClientKey } = acceptData;
	const authData = { apiLoginID: apiLoginId, clientKey: publicClientKey };

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

			const rawAcceptData = data as AcceptData;

			const nextAcceptData = {
				...data,
				environment: rawAcceptData.environment.toUpperCase() as AuthNetEnvironment, // Accept.js expects environment to be uppercase
			} as AcceptData;

			setAcceptData(nextAcceptData);
		}
	}, [checkoutId, initializePaymentGateway]);

	React.useEffect(() => {
		getAcceptData();
	}, [getAcceptData]);

	const handleSubmit = async (response: HostedFormDispatchDataResponse) => {
		if (checkoutResponse?.checkout) {
			try {
				const opaqueData = response.opaqueData;

				const saleorTransactionResponse = await createTransaction({
					variables: {
						checkoutId: checkoutResponse.checkout.id,
						paymentGateway: authorizeNetAppId,
						data: {
							...opaqueData,
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
			{authData.apiLoginID.length > 0 && (
				<HostedForm
					buttonClassName="mt-2 rounded-md border bg-slate-900 px-8 py-2 text-lg text-white hover:bg-slate-800"
					environment={environment}
					authData={authData}
					onSubmit={handleSubmit}
				/>
			)}
		</div>
	);
}
