"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { API_ENDPOINTS } from "@/constants";
import type { ImageFile } from "@/types";

interface DuckDecodeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	images: ImageFile[];
	onDecoded?: (decodedPaths: string[]) => void;
}

interface DecodeResult {
	success: boolean;
	decodedFilePath: string;
	fileType: string;
	decodedFileType: "image" | "video";
	fileSize: number;
	error?: string;
}

export function DuckDecodeDialog({
	open,
	onOpenChange,
	images,
	onDecoded,
}: DuckDecodeDialogProps) {
	const [password, setPassword] = useState("");
	const [isDecoding, setIsDecoding] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<DecodeResult[]>([]);

	const handleDecode = async () => {
		if (images.length === 0) return;

		setIsDecoding(true);
		setError(null);
		setResults([]);

		try {
			const decodePromises = images.map(async (image) => {
				const response = await fetch(API_ENDPOINTS.IMAGES_DUCK_DECODE, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						duckImagePath: image.path,
						password: password || undefined,
					}),
				});

				const data = await response.json();

				return {
					image,
					success: data.success,
					decodedFilePath: data.decodedFilePath,
					fileType: data.fileType,
					decodedFileType: data.decodedFileType,
					fileSize: data.fileSize,
					error: data.error,
				};
			});

			const decodeResults = await Promise.allSettled(decodePromises);

			const successfulDecodes: DecodeResult[] = [];
			const failedDecodes: string[] = [];

			decodeResults.forEach((result, index) => {
				if (result.status === "fulfilled" && result.value.success) {
					successfulDecodes.push(result.value);
					toast.success(`Decoded: ${images[index].name}`);
				} else {
					const errorMsg =
						result.status === "rejected"
							? result.reason?.message || "Unknown error"
							: (result.value as any)?.error || "Decode failed";
					failedDecodes.push(`${images[index].name}: ${errorMsg}`);
					toast.error(`Failed: ${images[index].name}`);
				}
			});

			setResults(successfulDecodes);

			if (failedDecodes.length > 0) {
				setError(
					`${failedDecodes.length} image(s) failed to decode:\n${failedDecodes.slice(0, 3).join("\n")}${failedDecodes.length > 3 ? "\n..." : ""}`,
				);
			}

			if (successfulDecodes.length > 0) {
				const decodedPaths = successfulDecodes.map((r) => r.decodedFilePath);
				onDecoded?.(decodedPaths);

				// Close dialog after all complete
				setTimeout(() => {
					onOpenChange(false);
					setPassword("");
					setResults([]);
					setError(null);
				}, 2000);
			}
		} catch (err: any) {
			console.error("Decode error:", err);
			setError(err.message || "Failed to decode images");
			toast.error("Decode failed");
		} finally {
			setIsDecoding(false);
		}
	};

	const handleCancel = () => {
		onOpenChange(false);
		setPassword("");
		setError(null);
		setResults([]);
	};

	const imageCount = images.length;
	const imageLabel =
		imageCount === 1 ? images[0]?.name : `${imageCount} images`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Eye className="h-5 w-5 text-green-600" />
						Decode Hidden Data
					</DialogTitle>
					<DialogDescription>
						Decode duck-encoded hidden data from {imageLabel}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Info message */}
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription className="text-sm">
							This will attempt to decode hidden data from the image(s) using
							LSB steganography.
						</AlertDescription>
					</Alert>

					{/* Password input */}
					<div>
						<Label htmlFor="password">Password (Optional)</Label>
						<Input
							id="password"
							type="password"
							placeholder="Enter password if images are protected"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={isDecoding}
							autoComplete="off"
							onKeyDown={(e) =>
								e.key === "Enter" && !isDecoding && handleDecode()
							}
						/>
						<p className="text-xs text-gray-500 mt-1">
							Leave empty if images are not password-protected
						</p>
					</div>

					{/* Progress */}
					{isDecoding && (
						<div className="flex items-center gap-2 text-sm">
							<Loader2 className="h-4 w-4 animate-spin text-blue-600" />
							<span>
								Decoding {imageCount} image{imageCount !== 1 ? "s" : ""}...
							</span>
						</div>
					)}

					{/* Error message */}
					{error && (
						<Alert variant="destructive">
							<AlertDescription className="whitespace-pre-line text-sm">
								{error}
							</AlertDescription>
						</Alert>
					)}

					{/* Success result */}
					{results.length > 0 && (
						<Alert>
							<CheckCircle className="h-4 w-4 text-green-600" />
							<AlertDescription className="text-sm">
								<div className="font-medium text-green-700">
									Successfully decoded {results.length} image
									{results.length !== 1 ? "s" : ""}!
								</div>
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={handleCancel}
						disabled={isDecoding}
					>
						Cancel
					</Button>
					<Button
						onClick={handleDecode}
						disabled={isDecoding}
						className="bg-green-600 hover:bg-green-700"
					>
						{isDecoding ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Decoding...
							</>
						) : (
							<>
								<Eye className="h-4 w-4 mr-2" />
								Decode {imageCount} Image{imageCount !== 1 ? "s" : ""}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
