import type { Metadata } from "next";
import { RoutePlanner } from "@/components/route/route-planner";
import { getRestaurants } from "@/lib/restaurants";

export const metadata: Metadata = { title: "Rolê de bares · My Food List", description: "Menor rota a pé entre os lugares escolhidos" };

export default function RoutePage() {
  return <RoutePlanner restaurants={getRestaurants()} />;
}
