import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoutePlanner } from "@/components/route/route-planner";
import { getRestaurants } from "@/lib/restaurants";
import { getSharedRoute } from "@/lib/shared-routes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const def = process.env.DATABASE_URL ? await getSharedRoute(code) : null;
  if (!def) return { title: "Rota não encontrada · My Food List" };
  const names = new Map(getRestaurants().map((r) => [r.slug, r.name]));
  const list = def.slugs.map((s) => names.get(s) ?? s);
  return { title: `Rolê: ${list.join(" → ")} · My Food List`, description: `${list.length} paradas a pé em Belo Horizonte` };
}

/** Rota compartilhada: abre já com os lugares escolhidos e traça sozinha. */
export default async function SharedRoutePage({ params }: Props) {
  const { code } = await params;
  if (!/^[A-Za-z0-9]{6,12}$/.test(code) || !process.env.DATABASE_URL) notFound();
  const def = await getSharedRoute(code);
  if (!def) notFound();
  return <RoutePlanner restaurants={getRestaurants()} initial={{ slugs: def.slugs, start: def.start, mode: def.mode }} />;
}
