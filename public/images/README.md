# Images Directory

Place your wedding photos in the appropriate folders:

## Folder Structure

- **`headers/`** - Header images for pages
  - Example: `header.jpg`, `welcome-bg.jpg`
  - Used in: Welcome page, page headers

- **`gallery/`** - Photo gallery/album images
  - Example: `photo1.jpg`, `photo2.jpg`, `spouse1.jpg`, `spouse2.jpg`
  - Used in: "Us" page gallery section and profile photos

## How to Use Images

Images placed in the `public` folder can be referenced directly in your components:

```tsx
import Image from 'next/image'

// Example usage:
<Image
  src="/images/headers/header.jpg"
  alt="Description"
  width={800}
  height={600}
  // or use fill for responsive images:
  fill
  className="object-cover"
/>
```

## Image Recommendations

- **Format**: JPG or WebP for photos, PNG for graphics with transparency
- **Size**: Optimize images before uploading (use tools like TinyPNG or ImageOptim)
- **Header images**: Recommended size ~1920x600px or similar wide aspect ratio
- **Gallery images**: Square or 4:3 aspect ratio works best
- **Profile photos**: Square images work best for circular displays

## Next.js Image Optimization

Next.js automatically optimizes images when using the `Image` component:
- Images are automatically resized and optimized
- Lazy loading is enabled by default
- Modern formats (WebP) are served when supported by the browser
