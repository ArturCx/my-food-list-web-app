import { ExternalLink, AtSign, MapPin, UtensilsCrossed, X } from "lucide-react";
import { CATEGORY_GRADIENT } from "@/lib/categories";
import { CATEGORIES, type Restaurant } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Hours } from "./hours";
import { InstagramEmbed } from "./instagram-embed";

type Props = { r: Restaurant; onClose?: () => void };

export function RestaurantDetails({ r, onClose }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        {r.badge ? (
          <span className="rounded-full bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white">{r.badge}</span>
        ) : (
          <span className="rounded-full bg-white/70 px-2.5 py-1.5 text-[11px] font-bold">{CATEGORIES[r.category]}</span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="glass-soft flex size-11 items-center justify-center rounded-full hover:bg-white/80"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div>
        <h2 className="text-[34px] font-extrabold leading-none tracking-tight">{r.name}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {CATEGORIES[r.category]} · {neighborhood(r.address)}
        </p>
      </div>

      <div
        className="mfl-scroll flex snap-x gap-2 overflow-x-auto rounded-[20px]"
        style={{ backgroundImage: r.photos.length ? undefined : CATEGORY_GRADIENT[r.category] }}
      >
        {r.photos.length > 0 ? (
          r.photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={r.name}
              loading="lazy"
              className="h-48 w-full shrink-0 snap-start rounded-[20px] object-cover"
            />
          ))
        ) : (
          <div className="flex h-48 w-full items-end p-3">
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">Sem foto ainda</span>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed">{r.description}</p>

      <div className="grid grid-cols-2 gap-2.5">
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="glass-soft rounded-2xl p-3 hover:bg-white/80">
          <Label>Endereço</Label>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {r.address}
          </p>
        </a>
        <div className="glass-soft rounded-2xl p-3">
          <Label>Horário</Label>
          <Hours hours={r.hours} compact />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {r.website && (
          <Action href={r.website} primary>
            <ExternalLink /> Site
          </Action>
        )}
        {r.menuUrl && (
          <Action href={r.menuUrl}>
            <UtensilsCrossed /> Menu
          </Action>
        )}
        {r.instagram && (
          <Action href={`https://www.instagram.com/${r.instagram}/`}>
            <AtSign /> {r.instagram}
          </Action>
        )}
      </div>

      {r.instagramEmbed && (
        <div className="overflow-hidden rounded-[20px] bg-white/50">
          <InstagramEmbed url={r.instagramEmbed} />
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function Action({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-[13px] font-bold transition-colors [&_svg]:size-4",
        primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "glass-soft hover:bg-white/80",
      )}
    >
      {children}
    </a>
  );
}

function neighborhood(address: string) {
  const m = address.match(/-\s*([^,]+),/);
  return m ? m[1].trim() : address.split(",")[0];
}
