import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Saves a base64 image data URI to the device's local filesystem
 * and returns the saved file URI.
 */
export async function saveMediaLocally(base64DataUri: string, filenamePrefix: string = 'media'): Promise<string> {
  try {
    const base64Data = base64DataUri.split(',')[1] || base64DataUri;
    const fileName = `${filenamePrefix}_${Date.now()}.jpg`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    return fileName;
  } catch (e) {
    console.error("Failed to save media locally", e);
    // Fall back to returning the base64 string if filesystem fails (e.g. web testing)
    return base64DataUri; 
  }
}

/**
 * Loads a media file from the local filesystem and returns a base64 data URI
 * for rendering in <img src="..." />
 */
export async function loadMediaLocally(fileNameOrUri: string): Promise<string> {
  // If it's already a base64 string (historical data or fallback), return as is
  if (fileNameOrUri.startsWith('data:image')) {
    return fileNameOrUri;
  }

  try {
    const contents = await Filesystem.readFile({
      path: fileNameOrUri,
      directory: Directory.Data,
    });
    
    return `data:image/jpeg;base64,${contents.data}`;
  } catch (e) {
    console.error("Failed to load media locally", e);
    return "";
  }
}

/**
 * Deletes a media file from the local filesystem
 */
export async function deleteMediaLocally(fileNameOrUri: string): Promise<void> {
  if (fileNameOrUri.startsWith('data:image')) return; // nothing to delete from filesystem

  try {
    await Filesystem.deleteFile({
      path: fileNameOrUri,
      directory: Directory.Data,
    });
  } catch (e) {
    console.error("Failed to delete media locally", e);
  }
}
