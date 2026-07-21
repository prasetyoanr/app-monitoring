const MAX_WORK_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_PHOTO_BYTES = 30 * 1024 * 1024;
const MAX_PHOTO_DIMENSION = 1920;
const JPEG_QUALITIES = [0.86, 0.76, 0.66, 0.56, 0.46];

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "This photo format cannot be read. Take a new photo or select a JPEG/PNG image.",
        ),
      );
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The photo could not be compressed."));
      },
      "image/jpeg",
      quality,
    );
  });
}

function scaledSize(width: number, height: number, maximum: number) {
  const scale = Math.min(1, maximum / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressWorkPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Select a valid photo from the camera or gallery.");
  }
  if (file.size <= 0 || file.size > MAX_SOURCE_PHOTO_BYTES) {
    throw new Error("The original photo must not exceed 30 MB.");
  }

  const image = await loadImage(file);
  let maximumDimension = MAX_PHOTO_DIMENSION;

  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const size = scaledSize(image.naturalWidth, image.naturalHeight, maximumDimension);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Photo compression is not supported by this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);

    for (const quality of JPEG_QUALITIES) {
      const blob = await canvasBlob(canvas, quality);
      if (blob.size <= MAX_WORK_PHOTO_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "work-photo";
        return new File([blob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
    maximumDimension = Math.round(maximumDimension * 0.78);
  }

  throw new Error("The photo could not be reduced below 2 MB. Select another photo.");
}

export function formatPhotoSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
