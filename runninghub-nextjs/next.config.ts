import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Production optimizations
	reactStrictMode: true,

	// Image optimization
	images: {
		// Use unoptimized for local files and blob URLs
		unoptimized: true,
		remotePatterns: [],
		// Allow local file protocol for development
		dangerouslyAllowSVG: true,
		contentDispositionType: "attachment",
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},

	// Experimental features
	experimental: {
		// Optimize CSS
		optimizeCss: true,
		// Optimize package imports
		optimizePackageImports: ["lucide-react", "framer-motion"],
	},

	// Turbopack configuration (Next.js 16 uses Turbopack by default)
	turbopack: {
		root: __dirname,
	},

	// Logging
	logging: {
		fetches: {
			fullUrl: false,
		},
	},

	// Output configuration for standalone deployment
	output: "standalone",

	// Security headers
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "X-DNS-Prefetch-Control",
						value: "on",
					},
					{
						key: "X-Frame-Options",
						value: "SAMEORIGIN",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "origin-when-cross-origin",
					},
				],
			},
		];
	},
};

export default nextConfig;
