import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OBENTO Monitor Take Away",
    short_name: "Obento KDS",
    description: "Monitor en vivo de pedidos take away de OBENTO Japanese Food.",
    start_url: "/",
    display: "standalone",
    background_color: "#080808",
    theme_color: "#080808",
    orientation: "any",
    icons: [
      {
        src: "/images/logo-obento.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/logo-obento.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
