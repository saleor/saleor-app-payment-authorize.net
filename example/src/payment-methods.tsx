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
import { getCheckoutId } from "./pages/cart";
import { AcceptPaymentForm } from "./accept-payment-form";

const acceptHostedPaymentGatewaySchema = z.object({});

export type AcceptHostedData = z.infer<typeof acceptHostedPaymentGatewaySchema>;

// currently, Payment Gateway Initialize doesnt return any config data
const dataSchema = z.object({
	acceptHosted: z.unknown().optional(),
	applePay: z.unknown().optional(),
	paypal: z.unknown().optional(),
	acceptJs: z.object({ enabled: z.boolean().optional() }),
});

type PaymentMethods = z.infer<typeof dataSchema>;

const paymentGatewayInitializeSessionSchema = dataSchema;

const payloadDataSchemaAcceptHosted = z.object({
	shouldCreateCustomerProfile: z.boolean(),
	iframeUrl: z.string(),
});

const payloadDataSchemaAcceptJs = z.object({
	shouldCreateCustomerProfile: z.boolean(),
});

export const PaymentMethods = () => {
	const [isLoading, setIsLoading] = React.useState(false);
	const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethods>();

	const checkoutId = getCheckoutId();

	const [initializePaymentGateways] = useMutation<
		PaymentGatewayInitializeMutation,
		PaymentGatewayInitializeMutationVariables
	>(gql(PaymentGatewayInitializeDocument.toString()));

	const getPaymentGateways = React.useCallback(async () => {
		setIsLoading(true);
		const payloadDataAcceptHosted = payloadDataSchemaAcceptHosted.parse({
			shouldCreateCustomerProfile: true,
			iframeUrl: "",
		});
		const payloadDataAcceptJs = payloadDataSchemaAcceptJs.parse({
			shouldCreateCustomerProfile: true,
		});
		const response = await initializePaymentGateways({
			variables: {
				checkoutId,
				paymentGateways: [
					{
						id: authorizeNetAppId,
						data: {
							/**
							 * This needs to be selectable - if we want type apple pay, paypal, or acceptHosted
							 */
							type: "acceptHosted",
							data: payloadDataAcceptHosted,
						},
					},
					{
						id: authorizeNetAppId,
						data: {
							type: "acceptJs",
							data: payloadDataAcceptJs,
						},
					},
				],
			},
		});

		setIsLoading(false);

		const gateway = response.data?.paymentGatewayInitialize?.gatewayConfigs?.[0];

		if (!gateway) {
			throw new Error("No payment gateway found");
		}

		const data = paymentGatewayInitializeSessionSchema?.parse(gateway.data);

		if (!data) {
			throw new Error("No data found");
		}

		setPaymentMethods(data);
	}, [initializePaymentGateways, checkoutId]);

	React.useEffect(() => {
		getPaymentGateways();
	}, [getPaymentGateways]);

	return (
		<div>
			<h2>Payment Methods</h2>
			{isLoading && <p>Loading...</p>}
			<ul className="flex gap-4 items-center">
				{paymentMethods?.acceptHosted !== undefined && (
					<li>
						<AcceptHostedForm />
					</li>
				)}
				{paymentMethods?.acceptJs !== undefined && (
					<li>
						<AcceptPaymentForm />
					</li>
				)}
				{paymentMethods?.applePay !== undefined && (
					<li>
						<button>Apple Pay</button>
					</li>
				)}
				{paymentMethods?.paypal !== undefined && (
					<li>
						<button>PayPal</button>
					</li>
				)}
			</ul>
		</div>
	);
};
