import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { mapLocalWorkflowToWorkflow } from '@/lib/local-workflow-mapper';
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
            const localWorkflows: Workflow[] =
                localRes.ok && localData.success
                    ? (localData.workflows || []).map((lw: LocalWorkflow) =>
                            mapLocalWorkflowToWorkflow(lw),
                        )
                    : [];

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
