import { NextRequest, NextResponse } from 'next/server';

interface ProcessDirectRequestFileItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  type?: string;
  handle?: unknown;
}

interface ProcessDirectRequest {
  folder_name: string;
  files: ProcessDirectRequestFileItem[];
  source: string;
  full_path?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: ProcessDirectRequest = await request.json();
    const { folder_name, files, source, full_path } = data;

    if (!folder_name) {
      return NextResponse.json(
        { error: 'No folder name provided' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    console.log(`Processing ${files.length} items from ${folder_name} via ${source}`);

    // If we have the full path and it exists, try to use it directly
    if (full_path) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');

        const folderPath = path.resolve(full_path);
        const stats = await fs.stat(folderPath);

        if (stats.isDirectory()) {
          return NextResponse.json({
            success: true,
            actual_path: folderPath,
            folder_name,
            total_items: files.length,
            image_count: files.filter(f => !f.isDirectory).length,
            message: `Loaded folder from actual path: ${folderPath}`
          });
        }
      } catch (error) {
        console.log('Full path not accessible, using virtual session method');
      }
    } else if (process.env.RUNNINGHUB_PREFIX_PATH) {
      // Try to construct path using prefix with recursive search
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const prefixPath = process.env.RUNNINGHUB_PREFIX_PATH;

        // Helper function to find folder recursively
        const findFolderInDirectory = async (currentPath: string, targetName: string, currentDepth: number, maxDepth: number): Promise<string | null> => {
          if (currentDepth > maxDepth) return null;

          try {
            // Check if the current path combined with target name exists
            const directPath = path.join(currentPath, targetName);
            try {
              const stats = await fs.stat(directPath);
              if (stats.isDirectory()) {
                return directPath;
              }
            } catch (e) {
              // Target not found at this level, continue searching
            }

            // Read directory to search in subfolders
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            
            for (const entry of entries) {
              if (entry.isDirectory() && !entry.name.startsWith('.')) { // Skip hidden folders
                const subPath = path.join(currentPath, entry.name);
                // Don't search inside the target folder itself if we matched it (already handled above)
                if (entry.name === targetName) {
                   return subPath;
                }
                
                // Recursively search deeper
                const found = await findFolderInDirectory(subPath, targetName, currentDepth + 1, maxDepth);
                if (found) return found;
              }
            }
          } catch (error) {
            console.error(`Error searching in ${currentPath}:`, error);
          }
          return null;
        };

        console.log(`Searching for folder '${folder_name}' in '${prefixPath}' (max depth: 3)`);
        const foundPath = await findFolderInDirectory(prefixPath, folder_name, 0, 3);
        
        if (foundPath) {
          const imageFiles = files.filter(f => !f.isDirectory);
          const directories = files.filter(f => f.isDirectory);
          
          return NextResponse.json({
            success: true,
            actual_path: foundPath,
            folder_name,
            total_items: files.length,
            image_count: imageFiles.length,
            directory_count: directories.length,
            message: `Loaded folder from resolved path: ${foundPath}`
          });
        } else {
           console.log(`Folder '${folder_name}' not found within depth limit in '${prefixPath}'`);
        }
      } catch (error) {
        console.log(`Could not resolve path using prefix search: ${error}`);
      }
    }

    // Fallback to virtual session method for File System Access API
    const sessionId = `direct_access_${folder_name}_${Date.now()}`;
    const virtualPath = `[Direct Access] ${folder_name}`;

    // Count images and directories
    const imageFiles = files.filter(f => !f.isDirectory);
    const directories = files.filter(f => f.isDirectory);

    return NextResponse.json({
      success: true,
      virtual_path: virtualPath,
      session_id: sessionId,
      folder_name,
      total_items: files.length,
      image_count: imageFiles.length,
      directory_count: directories.length,
      message: `Loaded ${imageFiles.length} images and ${directories.length} directories from ${folder_name}`
    });

  } catch (error) {
    console.error('Error processing folder directly:', error);
    return NextResponse.json(
      { error: 'Failed to process folder' },
      { status: 500 }
    );
  }
}