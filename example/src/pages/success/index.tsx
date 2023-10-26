import { useMutation } from "@apollo/client";
import gql from "graphql-tag";
import {
	CheckoutCompleteDocument,
	CheckoutCompleteMutation,
	CheckoutCompleteMutationVariables,
} from "../../../generated/graphql";

const SuccessPage = () => {
	const checkoutId = typeof sessionStorage === "undefined" ? undefined : sessionStorage.getItem("checkoutId");

	if (!checkoutId) {
		throw new Error("Checkout ID not found in sessionStorage");
	}

	const [completeCheckout, { data: completeCheckoutResponse, loading: completeCheckoutLoading }] =
		useMutation<CheckoutCompleteMutation, CheckoutCompleteMutationVariables>(
			gql(CheckoutCompleteDocument.toString()),
		);

	const createOrder = async () => {
		completeCheckout({
			variables: {
				checkoutId: checkoutId!,
			},
		});
	};

	const isCheckoutCompleted = !!completeCheckoutResponse?.checkoutComplete?.order?.id;

	return (
		<div>
			<h1>Transaction paid</h1>

			<button disabled={completeCheckoutLoading} onClick={createOrder}>
				{isCheckoutCompleted ? (
					"Order created ✅"
				) : (
					<>{completeCheckoutLoading ? "Creating order..." : "Create order from checkout"}</>
				)}
			</button>
		</div>
	);
};

export default SuccessPage;
