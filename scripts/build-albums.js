const fs = require('fs');
const path = require('path');

const ARTWORK_DIR = './artwork';
const OUTPUT_FILE = './albums.json';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getFileCreatedTime(filePath) {
  const stats = fs.statSync(filePath);
  // Use birthtime (creation time) - falls back to ctime if birthtime not available
  return stats.birthtime.toISOString();
}

function scanArtworkFolder() {
  const albums = [];

  // Read all folders in artwork directory
  const folders = fs.readdirSync(ARTWORK_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith('.')); // Ignore hidden folders

  for (const folderName of folders) {
    const folderPath = path.join(ARTWORK_DIR, folderName);
    const images = [];

    // Read all files in the folder
    const files = fs.readdirSync(folderPath)
      .filter(file => !file.startsWith('.')) // Ignore hidden files like .DS_Store
      .filter(isImageFile);

    // Build temp array with file info
    const fileInfos = files.map(filename => {
      const filePath = path.join(folderPath, filename);
      return {
        oldPath: filePath,
        filename: filename,
        ext: path.extname(filename),
        created: getFileCreatedTime(filePath)
      };
    });

    // Sort by created date to determine order
    fileInfos.sort((a, b) => new Date(a.created) - new Date(b.created));

    // Rename files with album name and index
    fileInfos.forEach((fileInfo, index) => {
      const indexStr = String(index + 1).padStart(4, '0');
      const newFilename = `${folderName}-${indexStr}${fileInfo.ext}`;
      const newPath = path.join(folderPath, newFilename);

      // Rename the file
      if (fileInfo.oldPath !== newPath) {
        fs.renameSync(fileInfo.oldPath, newPath);
        console.log(`  Renamed: ${fileInfo.filename} → ${newFilename}`);
      }

      // Add to images array
      const relativePath = path.join(folderName, newFilename);
      images.push({
        src: relativePath,
        created: fileInfo.created
      });
    });

    albums.push({
      name: folderName,
      images: images
    });
  }

  // Sort albums alphabetically by name
  albums.sort((a, b) => a.name.localeCompare(b.name));

  return { albums };
}

// Build and write albums.json
const data = scanArtworkFolder();
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n✓ Built albums.json with ${data.albums.length} albums`);
data.albums.forEach(album => {
  console.log(`  - ${album.name}: ${album.images.length} images`);
});
