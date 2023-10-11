import { gql, useMutation, useQuery } from "@apollo/client";
import { useEffect } from "react";
import { authorizeNetAppId } from "../../lib/common";
import {
	GetCheckoutByIdQuery,
	GetCheckoutByIdQueryVariables,
	GetCheckoutByIdDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
	TransactionInitializeDocument,
} from "../../../generated/graphql";

export default function CartPage() {
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");
	const { data: checkoutResponse, loading: checkoutLoading } = useQuery<
		GetCheckoutByIdQuery,
		GetCheckoutByIdQueryVariables
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- skip: !checkoutId
	>(gql(GetCheckoutByIdDocument.toString()), { variables: { id: checkoutId! }, skip: !checkoutId });

	const [createTransaction, { data: transactionInitializeResponse, loading: transactionInitializeLoading }] =
		useMutation<TransactionInitializeMutation, TransactionInitializeMutationVariables>(
			gql(TransactionInitializeDocument.toString()),
		);

	const isAuthorizeAppInstalled = checkoutResponse?.checkout?.availablePaymentGateways.some(
		(gateway) => gateway.id === authorizeNetAppId,
	);

	useEffect(() => {
		if (
			!checkoutResponse ||
			!isAuthorizeAppInstalled ||
			transactionInitializeLoading ||
			transactionInitializeResponse ||
			!checkoutResponse.checkout
		) {
			return;
		}
		void createTransaction({
			variables: {
				checkoutId: checkoutResponse.checkout.id,
				data: {},
			},
		});
	}, [
		checkoutResponse,
		createTransaction,
		isAuthorizeAppInstalled,
		transactionInitializeLoading,
		transactionInitializeResponse,
	]);

	if (!checkoutResponse || checkoutLoading) {
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

	if (!transactionInitializeResponse || transactionInitializeLoading) {
		return <div>Loading…</div>;
	}

	const authorizeData = transactionInitializeResponse.transactionInitialize?.data as
		| undefined
		| {
				paymentIntent: {
					client_secret: string;
				};
				publishableKey: string;
		  };

	if (transactionInitializeResponse.transactionInitialize?.errors.length || !authorizeData) {
		return (
			<div className="text-red-500">
				<p>Failed to initialize Stripe transaction</p>
				<pre>{JSON.stringify(transactionInitializeResponse, null, 2)}</pre>
			</div>
		);
	}

	return (
		<div>
			<p>Use the following card details to test payments:</p>
			<dl className="mb-4 grid w-fit grid-cols-[1fr,2fr] gap-x-2">
				<dt className="font-bold">Card number</dt>
				<dd>4242 4242 4242 4242</dd>
				<dt className="font-bold">Expiry date</dt>
				<dd>Any future date (eg. 03/30)</dd>
				<dt className="font-bold">CVC</dt>
				<dd>Any 3 digits (eg. 737)</dd>
			</dl>
			<div>Placeholder for Authorize component</div>
		</div>
	);
}
