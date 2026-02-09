import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const galleryPath = path.join(process.cwd(), 'public', 'images', 'gallery');
    const sections: Record<string, string[]> = {};

    // Read all subdirectories in the gallery folder
    const items = fs.readdirSync(galleryPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const sectionName = item.name;
        const sectionPath = path.join(galleryPath, sectionName);
        const images: string[] = [];

        // Read all files in the subdirectory
        const files = fs.readdirSync(sectionPath);
        
        for (const file of files) {
          // Only include image files
          if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file)) {
            images.push(`/images/gallery/${sectionName}/${file}`);
          }
        }

        if (images.length > 0) {
          sections[sectionName] = images.sort();
        }
      }
    }

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error reading gallery:', error);
    return NextResponse.json(
      { error: 'Failed to load gallery' },
      { status: 500 }
    );
  }
}
