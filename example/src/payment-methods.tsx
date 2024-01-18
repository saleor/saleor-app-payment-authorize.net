import { gql, useMutation } from "@apollo/client";
import React from "react";
import { z } from "zod";
import {
	PaymentGatewayInitializeDocument,
	PaymentGatewayInitializeMutation,
	PaymentGatewayInitializeMutationVariables,
} from "../generated/graphql";
import { authorizeNetAppId } from "./lib/common";
import { authorizeEnvironmentSchema } from "./pay-button";

const applePayPaymentGatewaySchema = z.object({});

const acceptHostedPaymentGatewaySchema = z.object({
	formToken: z.string().min(1),
	environment: authorizeEnvironmentSchema,
});

const dataSchema = z.object({
	acceptHosted: acceptHostedPaymentGatewaySchema.optional(),
	applePay: applePayPaymentGatewaySchema.optional(),
});

type PaymentMethods = z.infer<typeof dataSchema>;

const errorSchema = z.unknown({});

const paymentGatewayInitializeSessionSchema = z.object({
	data: dataSchema.optional(),
	error: errorSchema.optional(),
});

export const PaymentMethods = ({ checkoutId }: { checkoutId: string }) => {
	const [isLoading, setIsLoading] = React.useState(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethods>();
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

		const { data, error } = paymentGatewayInitializeSessionSchema.parse(gateway.data);

		if (!data || error) {
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
		</div>
	);
};
