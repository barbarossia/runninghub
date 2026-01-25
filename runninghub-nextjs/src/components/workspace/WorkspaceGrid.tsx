/**
 * Workspace Grid Component
 * Grid layout for workspace text editors
 */

"use client";

import { WorkspaceTextEditor } from "./WorkspaceTextEditor";
import { useWorkspaceStore } from "@/store/workspace-store";

export function WorkspaceGrid() {
	const { uploadedFiles } = useWorkspaceStore();

	if (uploadedFiles.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{uploadedFiles.map((file) => (
				<WorkspaceTextEditor key={file.id} fileId={file.id} />
			))}
		</div>
	);
}
