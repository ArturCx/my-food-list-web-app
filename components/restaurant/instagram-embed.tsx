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

  // O embed vira um iframe do Instagram; não dá para estilizar por dentro.
  // O wrapper esconde a faixa de baixo (curtidas, comentários, "ver mais"),
  // cortando os últimos --ig-crop px. Ajuste em globals.css se o Instagram mudar o layout.
  return (
    <div className="mfl-ig-crop">
      <blockquote
        className="instagram-media w-full"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
      >
        <a href={url} target="_blank" rel="noreferrer">
          Ver no Instagram
        </a>
      </blockquote>
    </div>
  );
}
