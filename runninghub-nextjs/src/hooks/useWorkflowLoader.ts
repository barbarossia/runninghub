import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { Workflow, LocalWorkflow } from '@/types/workspace';

export function useWorkflowLoader() {
    const { setWorkflows } = useWorkspaceStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadWorkflows = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch both standard and local workflows in parallel
            const [standardRes, localRes] = await Promise.all([
                fetch("/api/workflow/list"),
                fetch("/api/workspace/local-workflow/list"),
            ]);

            const standardData = await standardRes.json();
            const localData = await localRes.json();

            if (!standardRes.ok) {
                throw new Error(standardData.error || "Failed to load workflows");
            }

            const standardWorkflows: Workflow[] = standardData.workflows || [];
            let localWorkflows: Workflow[] = [];

            if (localRes.ok && localData.success) {
                // Adapt LocalWorkflow to Workflow interface
                localWorkflows = (localData.workflows || []).map(
                    (lw: LocalWorkflow) => {
                        // Determine input type based on operation
                        const opType = lw.inputs?.[0]?.operation || "video-convert";
                        const isVideoOp =
                            opType.startsWith("video-") || opType === "caption";
                        const isImageOp =
                            opType.startsWith("image-") ||
                            opType === "duck-decode";

                        // Create synthetic input for compatibility checks
                        const syntheticInput = {
                            id: "input_1",
                            name: "Input File",
                            type: "file" as const,
                            required: true,
                            validation: {
                                mediaType: isVideoOp
                                    ? ("video" as const)
                                    : isImageOp
                                        ? ("image" as const)
                                        : undefined,
                            },
                        };

                        return {
                            id: lw.id,
                            name: lw.name,
                            description: lw.description || `Local ${opType} workflow`,
                            inputs: [syntheticInput],
                            createdAt: lw.createdAt,
                            updatedAt: lw.updatedAt,
                            sourceType: "local" as const,
                        };
                    },
                );
            }

            // Merge and set workflows
            setWorkflows([...standardWorkflows, ...localWorkflows]);
        } catch (error) {
            console.error("Failed to load workflows:", error);
            setError(
                error instanceof Error ? error.message : "Failed to load workflows",
            );
            // We don't clear workflows here to preserve potential cached state if the network fails temporarily
        } finally {
            setIsLoading(false);
        }
    }, [setWorkflows]);

    // Initial load
    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    return { isLoading, error, refresh: loadWorkflows };
}
