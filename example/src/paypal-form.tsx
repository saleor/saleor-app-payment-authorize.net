import Script from "next/script";

/**
 * This form uses PayPal's legacy Express Checkout integration
 * https://developer.paypal.com/docs/archive/express-checkout/in-context/javascript-advanced-settings/ */

export function PayPalForm() {
	function onLoad() {
		if (typeof window !== "undefined" && window.paypal) {
			paypal.checkout.setup({});
		}
	}

	return (
		<>
			{/* We need to load this before we execute any code */}
			<Script src="https://www.paypalobjects.com/api/checkout.js" onLoad={onLoad} />
			<button>PayPal</button>
		</>
	);
}
