import { useState } from "react";
import { PayPalForm } from "./paypal-form";

export function PayPalWrapper() {
	const [showPayPal, setShowPayPal] = useState(false);

	return (
		<>
			<button onClick={() => setShowPayPal(true)}>PayPal</button>
			{showPayPal && <PayPalForm />}
		</>
	);
}
