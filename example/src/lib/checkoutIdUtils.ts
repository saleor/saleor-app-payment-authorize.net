import React from "react";

export const checkoutIdUtils = {
	set: (id: string) => localStorage.setItem("checkoutId", id),
	get: () => {
		const checkoutId = localStorage.getItem("checkoutId");

		if (!checkoutId) {
			throw new Error("Checkout ID not found");
		}

		return checkoutId;
	},
};

export const useGetCheckoutId = () => {
	const [checkoutId, setCheckoutId] = React.useState<string | null>(null);

	React.useEffect(() => {
		const checkoutId = checkoutIdUtils.get();
		setCheckoutId(checkoutId);
	}, []);

	return checkoutId;
};
