import { useMutation } from "@apollo/client";
import gql from "graphql-tag";
import Script from "next/script";
import React from "react";
import { z } from "zod";
import {
	TransactionInitializeDocument,
	TransactionInitializeMutation,
	TransactionInitializeMutationVariables,
} from "../generated/graphql";
import { checkoutIdUtils } from "./lib/checkoutIdUtils";
import { authorizeNetAppId } from "./lib/common";

declare global {
	interface Window {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		paypal: any;
	}
}

const paypalTransactionResponseDataSchema = z.object({
	secureAcceptanceUrl: z.string().min(1).optional(),
	error: z
		.object({
			message: z.string().min(1),
		})
		.optional(),
});

/**
 * This form uses PayPal's legacy Express Checkout integration
 * https://developer.paypal.com/docs/archive/express-checkout/in-context/javascript-advanced-settings/ */

export const PayPalForm = () => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [initializeTransaction] = useMutation<
		TransactionInitializeMutation,
		TransactionInitializeMutationVariables
	>(gql(TransactionInitializeDocument.toString()));

	function onLoad() {
		if (typeof window !== "undefined" && window.paypal) {
			window.paypal.checkout.setup(" ", {
				environment: "sandbox",
				container: "paypalButton",
				click: () => {
					getPayPalAcceptanceUrl();
				},
			});
		}
	}

	const getPayPalAcceptanceUrl = async () => {
		setIsLoading(true);
		const checkoutId = checkoutIdUtils.get();

		const initializeTransactionResponse = await initializeTransaction({
			variables: {
				checkoutId,
				paymentGateway: authorizeNetAppId,
				data: {
					type: "paypal",
					data: {},
				},
			},
		});

		if (initializeTransactionResponse.data?.transactionInitialize?.errors?.length) {
			throw new Error("Failed to initialize transaction");
		}

		const data = initializeTransactionResponse.data?.transactionInitialize?.data;

		if (!data) {
			throw new Error("Data not found on transaction initialize response");
		}

		const { secureAcceptanceUrl, error } = paypalTransactionResponseDataSchema.parse(data);

		if (error) {
			throw new Error(error.message);
		}

		if (!secureAcceptanceUrl) {
			throw new Error("Secure acceptance url not found");
		}

		setIsLoading(false);
		window.open(secureAcceptanceUrl, "_self");
	};

	return (
		<>
			{/* We need to load this before we execute any code */}
			<Script src="https://www.paypalobjects.com/api/checkout.js" onLoad={onLoad} />

			{isLoading ? <p>Loading...</p> : <button id="paypalButton"></button>}
		</>
	);
};
