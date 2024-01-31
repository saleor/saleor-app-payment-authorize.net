import { useMutation } from "@apollo/client";
import gql from "graphql-tag";
import React from "react";
import {
	TransactionProcessMutation,
	TransactionProcessMutationVariables,
	TransactionProcessDocument,
} from "../../../../../generated/graphql";
import { useRouter } from "next/router";

type Status = "idle" | "loading" | "success";

const PaypalContinuePage = () => {
	const [processTransaction] = useMutation<TransactionProcessMutation, TransactionProcessMutationVariables>(
		gql(TransactionProcessDocument.toString()),
	);
	const router = useRouter();
	const isCalled = React.useRef(false);
	const [status, setStatus] = React.useState<Status>("idle");

	const continueTransaction = React.useCallback(
		async ({ payerId, transactionId }: { payerId: string; transactionId: string }) => {
			setStatus("loading");
			const response = await processTransaction({
				variables: {
					transactionId,
					data: {
						type: "paypal",
						data: {
							payerId,
						},
					},
				},
			});

			isCalled.current = true;

			if (response.data?.transactionProcess?.transactionEvent?.type !== "AUTHORIZATION_SUCCESS") {
				throw new Error("Transaction failed");
			}

			setStatus("success");
		},
		[processTransaction],
	);

	React.useEffect(() => {
		const payerId = router.query.PayerID?.toString();
		const rawTransactionId = router.query.transactionId?.toString();
		setStatus("idle");

		if (payerId && rawTransactionId && !isCalled.current) {
			const transactionId = atob(rawTransactionId);
			continueTransaction({ payerId, transactionId });
		}
	}, [continueTransaction, router.query.PayerID, router.query.transactionId]);

	return (
		<div>
			{status === "loading" && <div>Processing transaction...</div>}
			{status === "success" && <div>You successfully paid with PayPal 🎺</div>}
		</div>
	);
};

export default PaypalContinuePage;
