import { gql, useMutation } from "@apollo/client";
import React from "react";
import { z } from "zod";
import {
	PaymentGatewayInitializeDocument,
	PaymentGatewayInitializeMutation,
	PaymentGatewayInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";

import { AcceptHostedForm } from "./accept-hosted-form";
import { PayPalWrapper } from "./paypal-wrapper";
import { getCheckoutId } from "./pages/cart";

const authorizeEnvironmentSchema = z.enum(["sandbox", "production"]);

const applePayPaymentGatewayInitializeData = z.object({});

export const acceptHostedPaymentGatewaySchema = z.object({
	formToken: z.string().min(1),
	environment: authorizeEnvironmentSchema,
});

export type AcceptHostedData = z.infer<typeof acceptHostedPaymentGatewaySchema>;

const paypalPaymentGatewayDataSchema = z.object({});

const dataSchema = z.object({
	acceptHosted: acceptHostedPaymentGatewaySchema.optional(),
	applePay: applePayPaymentGatewayInitializeData.optional(),
	paypal: paypalPaymentGatewayDataSchema.optional(),
});

type PaymentMethods = z.infer<typeof dataSchema>;

const paymentGatewayInitializeSessionSchema = dataSchema;

export const PaymentMethods = () => {
	const [isLoading, setIsLoading] = React.useState(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethods>();

	const checkoutId = getCheckoutId();

	const [initializePaymentGateways] = useMutation<
		PaymentGatewayInitializeMutation,
		PaymentGatewayInitializeMutationVariables
	>(gql(PaymentGatewayInitializeDocument.toString()));

	async function getPaymentGateways() {
		setIsLoading(true);
		const response = await initializePaymentGateways({
			variables: {
				appId: authorizeNetAppId,
				checkoutId,
				data: {},
			},
		});

		setIsLoading(false);

		const gateway = response.data?.paymentGatewayInitialize?.gatewayConfigs?.[0];

		if (!gateway) {
			throw new Error("No payment gateway found");
		}

		console.log(gateway.data);

		const data = paymentGatewayInitializeSessionSchema.parse(gateway.data);

		if (!data) {
			throw new Error("No data found");
		}

		setPaymentMethods(data);
	}

	React.useEffect(() => {
		getPaymentGateways();
	}, []);

	return (
		<div>
			<h2>Payment Methods</h2>
			{isLoading && <p>Loading...</p>}
			<ul className="flex gap-4 items-center">
				{paymentMethods?.acceptHosted && (
					<li>
						<AcceptHostedForm acceptData={paymentMethods.acceptHosted} />
					</li>
				)}
				{paymentMethods?.applePay && (
					<li>
						<button>Apple Pay</button>
					</li>
				)}
				{paymentMethods?.paypal && (
					<li>
						<PayPalWrapper />
					</li>
				)}
			</ul>
		</div>
	);
};
