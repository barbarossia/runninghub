"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUiPreferencesStore } from "@/store/ui-preferences-store";
import { validateEnvironment } from "@/utils/validation";
import { ENVIRONMENT_VARIABLES } from "@/constants";

export default function Home() {
	const [envValidation, setEnvValidation] = useState<{
		isValid: boolean;
		missing: string[];
		warnings: string[];
	} | null>(null);
	const [mounted, setMounted] = useState(false);
	const { aspectToolCollapsed, setAspectToolCollapsed } =
		useUiPreferencesStore();

	// Run validation only after client-side hydration
	/* eslint-disable react-hooks/set-state-in-effect */
	useEffect(() => {
		setMounted(true);
		setEnvValidation(validateEnvironment());
	}, []);
	/* eslint-enable react-hooks/set-state-in-effect */

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:bg-[#0d1117] dark:from-[#0d1117] dark:to-[#161b22] p-8">
			<div className="max-w-4xl mx-auto">
				{/* Header with Theme Toggle */}
				<div className="flex items-center justify-end gap-2 mb-4">
					<ThemeToggle />
					{aspectToolCollapsed && (
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setAspectToolCollapsed(false)}
							aria-label="Open aspect ratio tool"
							title="Open aspect ratio tool"
						>
							<Calculator className="h-4 w-4" />
						</Button>
					)}
				</div>
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						RunningHub Image Processing Platform
					</h1>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						A modern web interface for processing and managing images with the
						RunningHub AI platform.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
					<Link href="/gallery">
						<Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-blue-400 border-2">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="text-2xl">🖼️</span>
									Image Gallery
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600 mb-4">
									Browse and manage your images with multiple view modes.
									Select, delete, and process images with keyboard shortcuts.
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">Grid View</Badge>
									<Badge variant="secondary">List View</Badge>
									<Badge variant="secondary">Large View</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>

					<Link href="/videos">
						<Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-purple-400 border-2">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="text-2xl">🎬</span>
									Video Gallery
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600 mb-4">
									Browse and manage your video files. Select, rename, delete,
									and preview videos.
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">Grid View</Badge>
									<Badge variant="secondary">List View</Badge>
									<Badge variant="secondary">Video Preview</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>

					<Link href="/workspace">
						<Card className="cursor-pointer transition-all hover:shadow-xl hover:scale-105 hover:border-indigo-400 border-2">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="text-2xl">📝</span>
									Workspace
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600 mb-4">
									Upload media, process with AI workflows, crop videos, convert
									FPS, and export files.
								</p>
								<div className="flex flex-wrap gap-2">
									<Badge variant="secondary">Video Crop</Badge>
									<Badge variant="secondary">FPS Convert</Badge>
									<Badge variant="secondary">Export</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>
				</div>

				<Separator className="my-8" />

				{/* Environment Status */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<span className="text-2xl">⚙️</span>
							System Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!mounted ? (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
							</div>
						) : envValidation ? (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<div
										className={`w-3 h-3 rounded-full ${envValidation.isValid ? "bg-green-500" : "bg-red-500"}`}
									/>
									<span className="font-medium">
										Environment Configuration:{" "}
										{envValidation.isValid ? "Valid" : "Invalid"}
									</span>
								</div>

								{envValidation.missing.length > 0 && (
									<div>
										<p className="font-medium text-red-600 mb-2">
											Missing Variables:
										</p>
										<ul className="list-disc list-inside space-y-1">
											{envValidation.missing.map((variable, index) => (
												<li key={index} className="text-sm text-red-600">
													{variable}
												</li>
											))}
										</ul>
									</div>
								)}

								{envValidation.warnings.length > 0 && (
									<div>
										<p className="font-medium text-yellow-600 mb-2">
											Warnings:
										</p>
										<ul className="list-disc list-inside space-y-1">
											{envValidation.warnings.map((warning, index) => (
												<li key={index} className="text-sm text-yellow-600">
													{warning}
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="pt-4">
									<h4 className="font-medium mb-2">Configuration Summary:</h4>
									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="font-medium">API Host:</span>{" "}
											{ENVIRONMENT_VARIABLES.API_HOST}
										</div>
										<div>
											<span className="font-medium">Default Node:</span>{" "}
											{ENVIRONMENT_VARIABLES.DEFAULT_NODE_ID}
										</div>
										<div>
											<span className="font-medium">Max File Size:</span>{" "}
											{Math.round(
												ENVIRONMENT_VARIABLES.MAX_FILE_SIZE / 1024 / 1024,
											)}
											MB
										</div>
										<div>
											<span className="font-medium">Default Timeout:</span>{" "}
											{ENVIRONMENT_VARIABLES.DEFAULT_TIMEOUT}s
										</div>
									</div>
								</div>
							</div>
						) : (
							<div className="flex items-center justify-center py-8">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
							</div>
						)}
					</CardContent>
				</Card>

				{/* Getting Started */}
				<div className="mt-12 text-center">
					<h2 className="text-2xl font-bold text-gray-900 mb-4">
						Getting Started
					</h2>
					<p className="text-gray-600 mb-6">
						Click on any feature card above to get started. The application
						provides various tools for image and video processing.
					</p>
				</div>
			</div>
		</div>
	);
}
