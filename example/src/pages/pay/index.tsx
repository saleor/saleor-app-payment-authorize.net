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

export default function PayPage() {
	const router = useRouter();
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	const { data: checkoutResponse, loading: checkoutLoading } = useQuery<
		GetCheckoutByIdQuery,
		GetCheckoutByIdQueryVariables
	>(gql(GetCheckoutByIdDocument.toString()), { variables: { id: checkoutId } });

	const [createTransaction, { data: transactionInitializeResponse, loading: transactionInitializeLoading }] =
		useMutation<TransactionInitializeMutation, TransactionInitializeMutationVariables>(
			gql(TransactionInitializeDocument.toString()),
		);

	const isAuthorizeAppInstalled = checkoutResponse?.checkout?.availablePaymentGateways.some(
		(gateway) => gateway.id === authorizeNetAppId,
	);

	const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (checkoutResponse?.checkout) {
			const response = await createTransaction({
				variables: {
					checkoutId: checkoutResponse.checkout.id,
					paymentGateway: authorizeNetAppId,
					data: {},
				},
			});

			if (response.data?.transactionInitialize?.errors) {
				throw new Error("Failed to initialize transaction");
			}

			router.push("/success");
		}
	};

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

	if (transactionInitializeResponse?.transactionInitialize?.errors.length) {
		return (
			<div className="text-red-500">
				<p>Failed to initialize Authorize.net transaction</p>
				<pre>{JSON.stringify(transactionInitializeResponse, null, 2)}</pre>
			</div>
		);
	}

	return (
		<div>
			<form onSubmit={handleFormSubmit}>
				<div className="flex flex-col gap-2 w-2/5">
					<input type="text" placeholder="Card number" />
					<input type="text" placeholder="Expiration date" />
					<input type="text" placeholder="CVV" />
				</div>
				<button
					className="mt-2 rounded-md border border-slate-600 bg-white px-8 py-2 text-lg text-slate-800 hover:bg-slate-100"
					type="submit"
					disabled={transactionInitializeLoading}
				>
					{transactionInitializeLoading ? "Paying..." : "Pay"}
				</button>
			</form>
		</div>
	);
}
