"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/** Embed oficial do Instagram. Precisa do script embed.js; se falhar, mostra só o link. */
export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://www.instagram.com/embed.js";
    s.async = true;
    s.onload = () => window.instgrm?.Embeds.process();
    document.body.appendChild(s);
  }, [url]);

  return (
    <blockquote
      className="instagram-media w-full"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
    >
      <a href={url} target="_blank" rel="noreferrer">
        Ver no Instagram
      </a>
    </blockquote>
  );
}
