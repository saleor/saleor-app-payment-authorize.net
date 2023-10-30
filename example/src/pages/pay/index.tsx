import { AuthNetEnvironment, useAcceptJs } from "react-acceptjs";

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
} from "../../../generated/graphql";
import { authorizeNetAppId } from "../../lib/common";

type AcceptData = {
	apiLoginId: string;
	environment: AuthNetEnvironment;
	publicClientKey: string;
};

export default function PayPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [isError, setIsError] = useState(false);
	const [acceptData, setAcceptData] = useState<AcceptData>({
		apiLoginId: "",
		environment: "SANDBOX",
		publicClientKey: "",
	});
	const [cardData, setCardData] = useState({
		cardNumber: "",
		month: "",
		year: "",
		cardCode: "",
	});

	const { environment, apiLoginId, publicClientKey } = acceptData;
	const authData = { apiLoginID: apiLoginId, clientKey: publicClientKey };
	const { dispatchData } = useAcceptJs({ authData, environment });

	const router = useRouter();
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	const { data: checkoutResponse, loading: isCheckoutLoading } = useQuery<
		GetCheckoutByIdQuery,
		GetCheckoutByIdQueryVariables
	>(gql(GetCheckoutByIdDocument.toString()), { variables: { id: checkoutId } });

	const [initializePaymentGateway, { loading: isPaymentGatewayLoading }] = useMutation<
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

			console.log(response);

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

	const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (checkoutResponse?.checkout) {
			setIsLoading(true);
			try {
				const authorizeResponse = await dispatchData({ cardData });

				const saleorTransactionResponse = await createTransaction({
					variables: {
						checkoutId: checkoutResponse.checkout.id,
						paymentGateway: authorizeNetAppId,
						data: {
							...authorizeResponse.opaqueData,
						},
					},
				});

				if (
					saleorTransactionResponse.data?.transactionInitialize?.errors?.length &&
					saleorTransactionResponse.data?.transactionInitialize?.errors?.length > 0
				) {
					throw new Error("Failed to initialize transaction");
				}

				setIsLoading(false);

				router.push("/success");
			} catch (error) {
				console.error(error);
				setIsError(true);
				setIsLoading(false);
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
			<form onSubmit={handleFormSubmit}>
				<div className="flex flex-col gap-2 w-2/5">
					<input
						disabled={isPaymentGatewayLoading}
						type="text"
						placeholder="Card number"
						name="cardNumber"
						value={cardData.cardNumber}
						onChange={(event) => setCardData({ ...cardData, cardNumber: event.target.value })}
					/>
					<input
						disabled={isPaymentGatewayLoading}
						type="text"
						placeholder="Card expiration month"
						name="month"
						value={cardData.month}
						onChange={(event) => setCardData({ ...cardData, month: event.target.value })}
					/>
					<input
						disabled={isPaymentGatewayLoading}
						type="text"
						placeholder="Card expiration year"
						name="year"
						value={cardData.year}
						onChange={(event) => setCardData({ ...cardData, year: event.target.value })}
					/>
					<input
						disabled={isPaymentGatewayLoading}
						type="text"
						placeholder="Card code"
						name="cardCode"
						value={cardData.cardCode}
						onChange={(event) => setCardData({ ...cardData, cardCode: event.target.value })}
					/>
				</div>
				<button
					className="mt-2 rounded-md border border-slate-600 bg-white px-8 py-2 text-lg text-slate-800 hover:bg-slate-100"
					type="submit"
					disabled={isPaymentGatewayLoading || isLoading}
				>
					{isLoading ? "Paying..." : "Pay"}
				</button>
			</form>
		</div>
	);
}