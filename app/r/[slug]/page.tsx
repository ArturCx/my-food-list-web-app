import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RestaurantDetails } from "@/components/restaurant/details";
import { getRestaurant, getRestaurants } from "@/lib/restaurants";

export function generateStaticParams() {
  return getRestaurants().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const r = getRestaurant(slug);
  return r ? { title: `${r.name} · My Food List`, description: r.description } : {};
}

export default async function RestaurantPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const r = getRestaurant(slug);
  if (!r) notFound();

  return (
    <div className="min-h-dvh bg-[radial-gradient(60%_60%_at_30%_20%,#c7d2fe_0%,transparent_100%),radial-gradient(60%_60%_at_80%_90%,#fbcfe8_0%,transparent_100%),#e0f2fe] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="glass mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold"
        >
          <ArrowLeft className="size-4" /> Voltar ao mapa
        </Link>
        <div className="glass rounded-[28px]">
          <RestaurantDetails r={r} />
        </div>
      </div>
    </div>
  );
}
