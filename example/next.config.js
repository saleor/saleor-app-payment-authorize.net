try {
	var url = new URL(process.env.SALEOR_API_URL);
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: false,
	images: {
		domains: url ? [url.hostname] : [],
		remotePatterns: [
			{
				protocol: "https",
				hostname: url.hostname ?? "",
				port: "",
				pathname: "/w20/**",
			},
		],
	},
};

module.exports = nextConfig;
