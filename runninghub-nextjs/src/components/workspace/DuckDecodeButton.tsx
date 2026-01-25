"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Helper to get filename from path (client-side safe)
const getBasename = (filePath: string) => {
	return filePath.split(/[\\/]/).pop() || filePath;
};

interface DuckDecodeButtonProps {
	imagePath: string;
	jobId: string;
	onDecoded?: (
		decodedFilePath: string,
		fileType: string,
		decodedFileType: "image" | "video",
	) => void;
}

interface DecodeResult {
	decodedFilePath: string;
	fileType: string;
	decodedFileType: "image" | "video";
	fileSize: number;
}

export function DuckDecodeButton({
	imagePath,
	jobId,
	onDecoded,
}: DuckDecodeButtonProps) {
	const [showDecodeDialog, setShowDecodeDialog] = useState(false);
	const [password, setPassword] = useState("");
	const [isDecoding, setIsDecoding] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [decodedResult, setDecodedResult] = useState<DecodeResult | null>(null);

	const [isValidating, setIsValidating] = useState(false);

	const handleValidationAndDecode = async () => {
		setIsValidating(true);
		try {
			// Validate first
			const validateResponse = await fetch("/api/workspace/duck-validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ imagePath }),
			});

			const validateData = await validateResponse.json();

			if (validateData.requiresPassword) {
				// Requires password, show dialog
				setShowDecodeDialog(true);
			} else {
				// No password needed, decode directly
				await handleDecode();
			}
		} catch (error) {
			// If validation fails, fallback to showing dialog to let user try manually
			console.error("Validation failed, falling back to dialog:", error);
			setShowDecodeDialog(true);
		} finally {
			setIsValidating(false);
		}
	};

	const handleDecode = async () => {
		setIsDecoding(true);
		// If dialog is open, close it only after success to show result,
		// but if it wasn't open (direct decode), we don't need to do anything about dialog state
		const wasDialogOpen = showDecodeDialog;

		setError(null);
		setDecodedResult(null);

		try {
			const response = await fetch("/api/workspace/duck-decode", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					duckImagePath: imagePath,
					password: password,
					jobId: jobId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Decode failed");
			}

			if (!data.success) {
				throw new Error(data.error || "Decode failed");
			}

			// Success
			setDecodedResult({
				decodedFilePath: data.decodedFilePath,
				fileType: data.fileType,
				decodedFileType: data.decodedFileType || "image",
				fileSize: data.fileSize,
			});

			toast.success(
				`Successfully decoded: ${getBasename(data.decodedFilePath)}`,
			);

			// Notify parent component
			if (onDecoded) {
				onDecoded(
					data.decodedFilePath,
					data.fileType,
					data.decodedFileType || "image",
				);
			}

			// If dialog was open, close it after a delay. If not, we are done.
			if (wasDialogOpen) {
				setTimeout(() => {
					setShowDecodeDialog(false);
					setPassword("");
					setDecodedResult(null);
				}, 2000);
			}
		} catch (err: any) {
			console.error("Decode error:", err);
			// If direct decode failed (e.g. wrong password or other error), we should probably show the dialog to show the error
			if (!wasDialogOpen) {
				setShowDecodeDialog(true);
			}
			setError(err.message || "Failed to decode image");
			toast.error("Decode failed: " + (err.message || "Unknown error"));
		} finally {
			setIsDecoding(false);
		}
	};

	const handleCancel = () => {
		setShowDecodeDialog(false);
		setPassword("");
		setError(null);
		setDecodedResult(null);
	};

	return (
		<>
			<Button
				variant="secondary"
				size="sm"
				onClick={handleValidationAndDecode}
				disabled={isValidating || isDecoding}
				className="gap-2"
			>
				{isValidating ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					<Eye className="h-4 w-4" />
				)}
				Decode Hidden Data
			</Button>

			<Dialog open={showDecodeDialog} onOpenChange={setShowDecodeDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Decode Hidden Data</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						{/* Info message */}
						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription className="text-sm">
								This will attempt to decode hidden data from the duck image
								using LSB steganography.
							</AlertDescription>
						</Alert>

						{/* File path */}
						<div className="text-sm">
							<span className="font-medium">Image:</span>{" "}
							<span className="text-gray-600">{getBasename(imagePath)}</span>
						</div>

						{/* Password input */}
						<div>
							<Label htmlFor="password">Password (Optional)</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter password if image is protected"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isDecoding}
								autoComplete="off"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Leave empty if the image is not password-protected
							</p>
						</div>

						{/* Progress */}
						{isDecoding && (
							<div className="flex items-center gap-2 text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Decoding...</span>
							</div>
						)}

						{/* Error message */}
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Success result */}
						{decodedResult && (
							<Alert>
								<CheckCircle className="h-4 w-4" />
								<AlertDescription className="text-sm">
									<div className="font-medium">Decode Successful!</div>
									<div className="mt-1">
										File: {getBasename(decodedResult.decodedFilePath)}
									</div>
									<div className="text-xs text-gray-600">
										Type: {decodedResult.fileType} • Size:{" "}
										{(decodedResult.fileSize / 1024).toFixed(1)} KB
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
						<Button onClick={handleDecode} disabled={isDecoding}>
							{isDecoding ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Decoding...
								</>
							) : (
								"Decode"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
