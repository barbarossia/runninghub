import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';

// JSON file to track workspace configuration
const WORKSPACE_JSON_FILE = 'workspace.json';

// Helper function to read workspace config from JSON file
async function readWorkspaceJson(parentPath: string): Promise<{ dataset?: any[] }> {
  const jsonPath = join(parentPath, WORKSPACE_JSON_FILE);
  if (!existsSync(jsonPath)) {
    return { dataset: [] };
  }
  try {
    const content = await readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content);
    if (!data.dataset) {
      data.dataset = [];
    }
    return data;
  } catch {
    return { dataset: [] };
  }
}

// Helper function to write workspace config to JSON file
async function writeWorkspaceJson(parentPath: string, data: any): Promise<void> {
  const jsonPath = join(parentPath, WORKSPACE_JSON_FILE);
  await writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper function to migrate existing subdirectories as datasets
async function migrateExistingDatasets(parentPath: string): Promise<void> {
  const jsonPath = join(parentPath, WORKSPACE_JSON_FILE);

  // Only migrate if JSON file doesn't exist
  if (existsSync(jsonPath)) {
    return;
  }

  try {
    // Read all entries in the folder
    const entries = await readdir(parentPath, { withFileTypes: true });

    // Find all subdirectories
    const datasets: Array<{ name: string; path: string }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip hidden directories
        if (entry.name.startsWith('.')) {
          continue;
        }

        const datasetPath = join(parentPath, entry.name);

        // Check if this looks like a dataset folder (has media files)
        try {
          const datasetEntries = await readdir(datasetPath, { withFileTypes: true });
          const hasFiles = datasetEntries.some(e => e.isFile());
          if (hasFiles) {
            datasets.push({
              name: entry.name,
              path: datasetPath,
            });
          }
        } catch {
          // Folder not accessible, skip
          continue;
        }
      }
    }

    // Only create JSON if we found datasets
    if (datasets.length > 0) {
      // Sort by name
      datasets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      await writeWorkspaceJson(parentPath, { dataset: datasets });
      console.log(`Migrated ${datasets.length} existing datasets to workspace.json`);
    }
  } catch (error) {
    console.error('Error migrating existing datasets:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { folderPath } = await request.json();

    if (!folderPath) {
      return NextResponse.json({ success: false, error: 'Folder path is required' }, { status: 400 });
    }

    // Migrate existing datasets if JSON file doesn't exist
    await migrateExistingDatasets(folderPath);

    // Read datasets from workspace.json
    const workspaceData = await readWorkspaceJson(folderPath);
    const datasetsFromJson = workspaceData.dataset || [];

    // Verify each dataset still exists and update file count
    const verifiedDatasets: Array<{ name: string; path: string; fileCount: number }> = [];

    for (const dataset of datasetsFromJson) {
      const datasetPath = dataset.path;

      // Check if dataset folder still exists
      if (!existsSync(datasetPath)) {
        // Skip datasets that no longer exist
        continue;
      }

      // Count media files in this dataset folder
      let fileCount = 0;
      try {
        const datasetEntries = await readdir(datasetPath, { withFileTypes: true });
        fileCount = datasetEntries.filter(e => e.isFile()).length;
      } catch {
        // Folder might not be accessible, skip
        continue;
      }

      verifiedDatasets.push({
        name: dataset.name,
        path: datasetPath,
        fileCount,
      });
    }

    // Sort datasets by name
    verifiedDatasets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return NextResponse.json({ success: true, datasets: verifiedDatasets });
  } catch (error) {
    console.error('Error listing datasets:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list datasets' },
      { status: 500 }
    );
  }
}
