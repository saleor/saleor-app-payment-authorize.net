import { gql, useMutation, useQuery } from "@apollo/client";
import {
	CheckoutCompleteDocument,
	CheckoutCompleteMutation,
	CheckoutCompleteMutationVariables,
	GetCheckoutByIdDocument,
	GetCheckoutByIdQuery,
	GetCheckoutByIdQueryVariables,
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../../../generated/graphql";
import { authorizeNetAppId } from "../../lib/common";

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

	const [completeCheckout, { data: completeCheckoutResponse, loading: completeCheckoutLoading }] =
		useMutation<CheckoutCompleteMutation, CheckoutCompleteMutationVariables>(
			gql(CheckoutCompleteDocument.toString()),
		);

	const isAuthorizeAppInstalled = checkoutResponse?.checkout?.availablePaymentGateways.some(
		(gateway) => gateway.id === authorizeNetAppId,
	);

	const createOrder = async () => {
		completeCheckout({
			variables: {
				checkoutId: checkoutId!,
			},
		});
	};

	const payFully = () => {
		if (checkoutResponse?.checkout)
			void createTransaction({
				variables: {
					checkoutId: checkoutResponse.checkout.id,
					paymentGateway: authorizeNetAppId,
					data: {},
				},
			});
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

	const isTransactionCreated =
		(transactionInitializeResponse?.transactionInitialize?.transaction?.id.length ?? 0) > 0;

	if (isTransactionCreated) {
		return (
			<button
				onClick={createOrder}
				className="mt-2 rounded-md border bg-slate-900 px-8 py-2 text-lg text-white hover:bg-slate-800"
			>
				{completeCheckoutResponse?.checkoutComplete?.order ? (
					"Order created ✅"
				) : (
					<>{completeCheckoutLoading ? "Creating..." : "Create order"}</>
				)}
			</button>
		);
	}

	return (
		<div>
			<button
				className="mt-2 rounded-md border border-slate-600 bg-white px-8 py-2 text-lg text-slate-800 hover:bg-slate-100"
				onClick={payFully}
				disabled={transactionInitializeLoading}
			>
				{transactionInitializeLoading ? "Paying..." : "Pay fully"}
			</button>
		</div>
	);
}
