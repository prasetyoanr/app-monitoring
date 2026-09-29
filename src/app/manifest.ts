import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "General Affairs Management System",
    short_name: "GA Management",
    description: "GA services and activities for a wide range of company needs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f6ff",
    theme_color: "#004d32",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
