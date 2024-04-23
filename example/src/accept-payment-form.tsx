import { gql, useMutation } from "@apollo/client";
import React, { FormEvent } from "react";
import { z } from "zod";
import {
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
	TransactionProcessDocument,
	TransactionProcessMutation,
	TransactionProcessMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";
import { getCheckoutId } from "./pages/cart";
import { useRouter } from "next/router";

import { useAcceptJs } from "react-acceptjs";

const authData = {
	apiLoginID: process.env.NEXT_PUBLIC_AUTHORIZE_API_LOGIN_ID,
	clientKey: process.env.NEXT_PUBLIC_AUTHORIZE_PUBLIC_CLIENT_KEY,
};

type BasicCardInfo = {
	cardNumber: string;
	cardCode: string;
	month: string;
	year: string;
};

export interface IAuthorizeTransactionResponse {
	amount: number;
	result: string;
	data: {
		response: {
			messages: {
				resultCode: string;
			};
			transactionResponse: {
				transId: string;
			};
		};
	};
}

const acceptHostedTransactionResponseSchema = z.object({
	messages: z.object({
		resultCode: z.string().optional().default(""),
	}),
	transactionResponse: z.object({
		transId: z.string().optional().default(""),
	}),
});

export function AcceptPaymentForm() {
	const checkoutId = getCheckoutId();
	const router = useRouter();
	const { dispatchData, loading, error } = useAcceptJs({ authData });
	const [cardData, setCardData] = React.useState<BasicCardInfo>({
		cardNumber: "",
		month: "",
		year: "",
		cardCode: "",
	});

	const [initializeTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	const [processTransaction] = useMutation<TransactionProcessMutation, TransactionProcessMutationVariables>(
		gql(TransactionProcessDocument.toString()),
	);

	const handleSubmit = React.useCallback(async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		// TODO use unknown because not getting currentTarget in event
		const formData = new FormData((event as unknown as { target: HTMLFormElement }).target);
		const cardData = {
			cardNumber: (formData.get("cardNumber") as string) || "",
			month: (formData.get("month") as string) || "",
			year: (formData.get("year") as string) || "",
			cardCode: (formData.get("cardCode") as string) || "",
		};

		// Dispatch CC data to Authorize.net and receive payment nonce for use on your server
		const response = await dispatchData({ cardData });
		getAcceptData(response.opaqueData);
	}, []);

	const getAcceptData = React.useCallback(
		async (opaqueData: { dataDescriptor: string; dataValue: string }) => {
			const initializeTransactionResponse = await initializeTransaction({
				variables: {
					checkoutId,
					paymentGateway: authorizeNetAppId,
					data: {
						type: "acceptJs",
						data: {
							opaqueData,
						},
					},
				},
			});

			// Need to handle error from authorize.net : start

			if (
				(initializeTransactionResponse.data?.transactionInitialize?.data as { error: string })?.error
					?.length ||
				initializeTransactionResponse.data?.transactionInitialize?.errors?.length
			) {
				throw new Error("Failed to initialize transaction");
			}

			const nextTransactionId = initializeTransactionResponse.data?.transactionInitialize?.transaction?.id;

			if (!nextTransactionId) {
				throw new Error("Transaction id not found in response");
			}

			transactionResponseHandler(
				initializeTransactionResponse.data?.transactionInitialize?.data as {
					response: IAuthorizeTransactionResponse;
				},
				nextTransactionId,
			);

			// Need to handle error from authorize.net : end
		},
		[initializeTransaction, checkoutId],
	);

	const transactionResponseHandler = React.useCallback(
		async (rawResponse: { response: IAuthorizeTransactionResponse }, transactionId: string) => {
			const authorizeResponse = acceptHostedTransactionResponseSchema.parse(rawResponse?.response);

			const data = {
				authorizeTransactionId: authorizeResponse?.transactionResponse?.transId,
			};

			if (!transactionId) {
				throw new Error("Transaction id not found");
			}

			const processTransactionResponse = await processTransaction({
				variables: {
					transactionId,
					data,
				},
			});

			const isProcessTransactionSuccessful =
				processTransactionResponse?.data?.transactionProcess?.transactionEvent?.type ===
				"AUTHORIZATION_SUCCESS";

			if (!isProcessTransactionSuccessful) {
				throw new Error("Failed to process transaction");
			}

			router.push("/success");
		},
		[processTransaction, router],
	);

	return (
		<>
			<form onSubmit={handleSubmit} className="flex flex-col mt-4">
				<label className="font-medium text-sm">Card Number</label>
				<input
					className=" mb-2  border-2 p-2"
					type="text"
					name="cardNumber"
					placeholder="cardNumber"
					value={cardData.cardNumber}
					onChange={(event) => setCardData({ ...cardData, cardNumber: event.target.value })}
				/>
				<label className="font-medium text-sm">Month</label>
				<input
					className=" mb-2  border-2 p-2"
					type="text"
					name="month"
					placeholder="month"
					value={cardData.month}
					onChange={(event) => setCardData({ ...cardData, month: event.target.value })}
				/>
				<label className="font-medium text-sm">Year</label>
				<input
					className=" mb-2  border-2 p-2"
					type="text"
					name="year"
					placeholder="year"
					value={cardData.year}
					onChange={(event) => setCardData({ ...cardData, year: event.target.value })}
				/>
				<label className="font-medium text-sm">Card Code</label>
				<input
					className=" mb-2  border-2 p-2"
					type="text"
					name="cardCode"
					placeholder="cardCode"
					value={cardData.cardCode}
					onChange={(event) => setCardData({ ...cardData, cardCode: event.target.value })}
				/>
				<button
					type="submit"
					disabled={loading || error}
					className=" bg-slate-800 text-white p-2  rounded-lg"
				>
					Pay
				</button>
			</form>
		</>
	);
}
