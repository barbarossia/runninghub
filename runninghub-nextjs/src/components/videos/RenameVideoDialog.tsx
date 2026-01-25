import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoFile } from "@/types";
import { Loader2 } from "lucide-react";

interface RenameVideoDialogProps {
	video: VideoFile | null;
	isOpen: boolean;
	onClose: () => void;
	onRename: (video: VideoFile, newName: string) => Promise<void>;
}

export function RenameVideoDialog({
	video,
	isOpen,
	onClose,
	onRename,
}: RenameVideoDialogProps) {
	const [newName, setNewName] = useState("");
	const [isRenaming, setIsRenaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (video) {
			// Pre-fill with name without extension if possible, or just name
			const nameWithoutExt =
				video.name.substring(0, video.name.lastIndexOf(".")) || video.name;
			setNewName(nameWithoutExt);
			setError(null);
		}
	}, [video]);

	const handleRename = async () => {
		if (!video || !newName.trim()) return;

		setIsRenaming(true);
		setError(null);

		try {
			await onRename(video, newName);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to rename video");
		} finally {
			setIsRenaming(false);
		}
	};

	const extension = video ? video.name.split(".").pop() : "";

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Rename Video</DialogTitle>
					<DialogDescription>
						Enter a new name for the video file.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<label
							htmlFor="name"
							className="text-right text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Name
						</label>
						<div className="col-span-3 flex items-center gap-2">
							<Input
								id="name"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								className="col-span-3"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter") handleRename();
								}}
							/>
							<span className="text-sm text-muted-foreground">
								.{extension}
							</span>
						</div>
					</div>
					{error && (
						<div className="text-sm text-red-500 text-center">{error}</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isRenaming}>
						Cancel
					</Button>
					<Button
						onClick={handleRename}
						disabled={isRenaming || !newName.trim()}
					>
						{isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Rename
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
