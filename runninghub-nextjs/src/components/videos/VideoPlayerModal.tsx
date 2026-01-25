"use client";

import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoFile } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface VideoPlayerModalProps {
	video: VideoFile | null;
	isOpen: boolean;
	onClose: () => void;
}

// Common aspect ratios
const COMMON_ASPECT_RATIOS: [number, number, string][] = [
	[1, 1, "1:1"],
	[4, 3, "4:3"],
	[3, 4, "3:4"],
	[16, 9, "16:9"],
	[9, 16, "9:16"],
	[21, 9, "21:9"],
	[5, 4, "5:4"],
	[4, 5, "4:5"],
	[3, 2, "3:2"],
	[2, 3, "2:3"],
];

function getAspectRatio(width: number, height: number): string {
	if (!width || !height) return "N/A";

	const ratio = width / height;

	// Find the closest common aspect ratio
	let closestRatio = COMMON_ASPECT_RATIOS[0];
	let minDiff = Math.abs(
		ratio - COMMON_ASPECT_RATIOS[0][0] / COMMON_ASPECT_RATIOS[0][1],
	);

	for (const [w, h, label] of COMMON_ASPECT_RATIOS) {
		const diff = Math.abs(ratio - w / h);
		if (diff < minDiff) {
			minDiff = diff;
			closestRatio = [w, h, label];
		}
	}

	// Always return the closest common ratio
	return closestRatio[2];
}

export function VideoPlayerModal({
	video,
	isOpen,
	onClose,
}: VideoPlayerModalProps) {
	const [showMoreDetails, setShowMoreDetails] = useState(false);
	const [copiedPath, setCopiedPath] = useState(false);

	if (!video) return null;

	const getVideoSrc = (video: VideoFile) => {
		// Handle both camelCase (MediaFile adapter) and snake_case (VideoFile)
		if ((video as any).blobUrl) return (video as any).blobUrl;
		if (video.blob_url) return video.blob_url;

		// Fallback to server endpoint
		return `/api/videos/serve?path=${encodeURIComponent(video.path)}`;
	};

	const videoSrc = getVideoSrc(video);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
					setShowMoreDetails(false);
					setCopiedPath(false);
				}
			}}
		>
			<DialogContent className="max-w-6xl w-full p-0 overflow-hidden bg-white dark:bg-gray-900">
				<div className="p-6">
					<DialogHeader className="mb-4">
						<DialogTitle className="line-clamp-1">{video.name}</DialogTitle>
						<DialogDescription className="line-clamp-1">
							VIDEO • {video.extension?.toUpperCase() || "N/A"}
						</DialogDescription>
					</DialogHeader>

					{/* Two-column layout: Preview on left, Details on right */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						{/* Left: Preview (2/3 width on large screens) */}
						<div className="lg:col-span-2">
							<div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
								<video
									src={videoSrc}
									controls
									autoPlay
									className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
									playsInline
								/>
							</div>
						</div>

						{/* Right: Details (1/3 width on large screens) */}
						<div className="lg:col-span-1 space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
							{/* Basic Info */}
							<div className="space-y-3">
								<h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">
									File Information
								</h3>

								<div className="space-y-2 text-sm">
									<div>
										<span className="text-gray-500 text-xs">Type</span>
										<p className="font-medium capitalize text-gray-900 dark:text-gray-100">
											Video
										</p>
									</div>

									<div>
										<span className="text-gray-500 text-xs">Extension</span>
										<p className="font-medium text-gray-900 dark:text-gray-100">
											{video.extension?.toUpperCase() || "N/A"}
										</p>
									</div>

									<div>
										<span className="text-gray-500 text-xs">File Size</span>
										<p className="font-medium text-gray-900 dark:text-gray-100">
											{video.size >= 1024 * 1024
												? `${(video.size / (1024 * 1024)).toFixed(2)} MB`
												: `${(video.size / 1024).toFixed(2)} KB`}
											<span className="text-gray-500 text-xs ml-1">
												({video.size.toLocaleString()} bytes)
											</span>
										</p>
									</div>

									{/* Width - always show if available */}
									{video.width ? (
										<div>
											<span className="text-gray-500 text-xs">Resolution</span>
											<p className="font-medium text-gray-900 dark:text-gray-100">
												{video.width} x {video.height}
											</p>
										</div>
									) : (
										<div>
											<span className="text-gray-500 text-xs">Resolution</span>
											<p className="font-medium text-gray-400">N/A</p>
										</div>
									)}

									{/* Aspect Ratio */}
									{video.width && video.height ? (
										<div>
											<span className="text-gray-500 text-xs">
												Aspect Ratio
											</span>
											<p className="font-medium text-gray-900 dark:text-gray-100">
												{getAspectRatio(video.width, video.height)}
											</p>
										</div>
									) : (
										<div>
											<span className="text-gray-500 text-xs">
												Aspect Ratio
											</span>
											<p className="font-medium text-gray-400">N/A</p>
										</div>
									)}

									{video.fps ? (
										<div>
											<span className="text-gray-500 text-xs">Frame Rate</span>
											<p className="font-medium text-gray-900 dark:text-gray-100">
												{video.fps} FPS
											</p>
										</div>
									) : (
										<div>
											<span className="text-gray-500 text-xs">Frame Rate</span>
											<p className="font-medium text-gray-400">N/A</p>
										</div>
									)}

									{video.duration ? (
										<div>
											<span className="text-gray-500 text-xs">Duration</span>
											<p className="font-medium text-gray-900 dark:text-gray-100">
												{video.duration.toFixed(2)} s
											</p>
										</div>
									) : null}
								</div>
							</div>

							{/* More Details (collapsible) */}
							<div className="space-y-3">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setShowMoreDetails(!showMoreDetails)}
									className="w-full justify-start"
								>
									{showMoreDetails ? (
										<>
											<ChevronUp className="h-4 w-4 mr-2" />
											Hide Details
										</>
									) : (
										<>
											<ChevronDown className="h-4 w-4 mr-2" />
											More Details
										</>
									)}
								</Button>

								<AnimatePresence>
									{showMoreDetails && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											transition={{ duration: 0.2 }}
											className="space-y-2 text-sm"
										>
											<div>
												<div className="flex items-center justify-between">
													<span className="text-gray-500 text-xs">
														File Path
													</span>
													<Button
														variant="ghost"
														size="sm"
														className="h-6 px-2 text-xs"
														onClick={() => {
															navigator.clipboard.writeText(video.path);
															setCopiedPath(true);
															toast.success("File path copied to clipboard");
															setTimeout(() => setCopiedPath(false), 2000);
														}}
													>
														{copiedPath ? (
															<>
																<Check className="h-3 w-3 mr-1 text-green-600" />
																Copied
															</>
														) : (
															<>
																<Copy className="h-3 w-3 mr-1" />
																Copy
															</>
														)}
													</Button>
												</div>
												<p className="font-mono text-xs break-all bg-white dark:bg-gray-950 p-2 rounded mt-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
													{video.path}
												</p>
											</div>

											<div>
												<span className="text-gray-500 text-xs">MIME Type</span>
												<p className="font-medium bg-white dark:bg-gray-950 p-2 rounded mt-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
													video/{video.extension?.replace(".", "")}
												</p>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
