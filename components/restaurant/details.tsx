import { ExternalLink, AtSign, MapPin, Clock, UtensilsCrossed, X, Award } from "lucide-react";
import { CATEGORY_COLOR, CATEGORY_GRADIENT } from "@/lib/categories";
import { CATEGORY_ICON } from "@/lib/category-icons";
import { CATEGORIES, type Restaurant } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Hours } from "./hours";
import { PhotoGallery } from "./photo-gallery";
import { InstagramEmbed } from "./instagram-embed";
import { PlaceRating } from "@/components/user/place-rating";
import { RouteAddButton } from "@/components/route/route-add-button";

type Props = { r: Restaurant; onClose?: () => void; editable?: boolean };

export function RestaurantDetails({ r, onClose, editable }: Props) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`;
  const accent = CATEGORY_COLOR[r.categories[0]];

  return (
    // key={r.slug} no pai faz o conteúdo reanimar a cada restaurante.
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Foto com badge e botão de fechar sobrepostos */}
      <div className="animate-in fade-in zoom-in-95 relative duration-300">
        <PhotoGallery key={r.slug} slug={r.slug} editable={editable} name={r.name} photos={r.photos} focus={r.photoFocus} fallback={CATEGORY_GRADIENT[r.categories[0]]} />
        {r.badge && !editable && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-[0_6px_16px_rgba(244,63,94,0.45)]">
            <Award className="size-3.5" /> {r.badge}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-white/85 dark:bg-white/15 shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 px-1 duration-300 [animation-delay:60ms]">
        <h2 className="text-[30px] leading-none font-extrabold tracking-tight">{r.name}</h2>
        <p className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" /> {neighborhood(r.address)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.categories.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <span key={c} className="flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 py-1 pr-2.5 pl-1.5 text-[11px] font-bold">
                <span className="flex size-4 items-center justify-center rounded-full text-white" style={{ background: CATEGORY_COLOR[c] }}>
                  <Icon className="size-2.5" strokeWidth={2.5} />
                </span>
                {CATEGORIES[c]}
              </span>
            );
          })}
        </div>
      </div>

      <p className="animate-in fade-in slide-in-from-bottom-2 px-1 text-sm leading-relaxed duration-300 [animation-delay:120ms]">{r.description}</p>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-delay:150ms]">
        <RouteAddButton slug={r.slug} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-delay:170ms]">
        <PlaceRating slug={r.slug} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 grid grid-cols-2 gap-2.5 duration-300 [animation-delay:180ms]">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="glass-soft group rounded-2xl p-3 transition-[background-color,transform] hover:bg-white/85 dark:bg-white/15 active:scale-[0.98]"
        >
          <Label icon={<MapPin className="size-3" />}>Endereço</Label>
          <p className="text-xs leading-relaxed">{r.address}</p>
          <span className="mt-1 inline-block text-[11px] font-bold transition-colors group-hover:underline" style={{ color: accent }}>
            Abrir no Maps
          </span>
        </a>
        <div className="glass-soft rounded-2xl p-3">
          <Label icon={<Clock className="size-3" />}>Horário</Label>
          <Hours hours={r.hours} compact />
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-wrap gap-2 duration-300 [animation-delay:240ms]">
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
        <div className="animate-in fade-in overflow-hidden rounded-[20px] bg-white/50 dark:bg-white/10 duration-300 [animation-delay:300ms]">
          <InstagramEmbed url={r.instagramEmbed} />
        </div>
      )}
    </div>
  );
}

function Label({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="mb-1 flex items-center gap-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
      {icon} {children}
    </p>
  );
}

function Action({ href, primary, children }: { href: string; primary?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-[13px] font-bold [&_svg]:size-4",
        "transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        primary
          ? "bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(15,23,42,0.25)] hover:bg-primary/90"
          : "glass-soft hover:bg-white/85 dark:bg-white/15 hover:shadow-[0_6px_16px_rgba(15,23,42,0.1)]",
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
