import { AuthNetEnvironment, useAcceptJs } from "react-acceptjs";

import { gql, useMutation, useQuery } from "@apollo/client";
import { useRouter } from "next/router";
import {
	GetCheckoutByIdDocument,
	GetCheckoutByIdQuery,
	GetCheckoutByIdQueryVariables,
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../../../generated/graphql";
import { authorizeNetAppId } from "../../lib/common";
import { useState } from "react";

function getAuthData() {
	const apiLoginID = process.env.NEXT_PUBLIC_AUTHORIZE_API_LOGIN_ID;
	const clientKey = process.env.NEXT_PUBLIC_AUTHORIZE_PUBLIC_KEY;

	if (!apiLoginID || !clientKey) {
		throw new Error("Missing Authorize.net credentials");
	}

	return {
		apiLoginID,
		clientKey,
	};
}

const authData = getAuthData();

function getAcceptEnvironment() {
	const acceptEnvironment = process.env.NEXT_PUBLIC_AUTHORIZE_ENVIRONMENT;

	if (!acceptEnvironment) {
		throw new Error("Missing Authorize.net environment");
	}

	if (acceptEnvironment !== "SANDBOX" && acceptEnvironment !== "PRODUCTION") {
		throw new Error("Invalid Authorize.net environment");
	}

	return acceptEnvironment as AuthNetEnvironment;
}

export default function PayPage() {
	const [isLoading, setIsLoading] = useState(false);
	const [isError, setIsError] = useState(false);
	const [cardData, setCardData] = useState({
		cardNumber: "",
		month: "",
		year: "",
		cardCode: "",
	});
	const { dispatchData } = useAcceptJs({ authData, environment: getAcceptEnvironment() });

	const router = useRouter();
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	const { data: checkoutResponse, loading: isCheckoutLoading } = useQuery<
		GetCheckoutByIdQuery,
		GetCheckoutByIdQueryVariables
	>(gql(GetCheckoutByIdDocument.toString()), { variables: { id: checkoutId } });

	const [createTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const isAuthorizeAppInstalled = checkoutResponse?.checkout?.availablePaymentGateways.some(
		(gateway) => gateway.id === authorizeNetAppId,
	);

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

				if (saleorTransactionResponse.data?.transactionInitialize?.data !== undefined) {
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
						type="text"
						placeholder="Card number"
						name="cardNumber"
						value={cardData.cardNumber}
						onChange={(event) => setCardData({ ...cardData, cardNumber: event.target.value })}
					/>
					<input
						type="text"
						placeholder="Card expiration month"
						name="month"
						value={cardData.month}
						onChange={(event) => setCardData({ ...cardData, month: event.target.value })}
					/>
					<input
						type="text"
						placeholder="Card expiration year"
						name="year"
						value={cardData.year}
						onChange={(event) => setCardData({ ...cardData, year: event.target.value })}
					/>
					<input
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
					disabled={isLoading}
				>
					{isLoading ? "Paying..." : "Pay"}
				</button>
			</form>
		</div>
	);
}
