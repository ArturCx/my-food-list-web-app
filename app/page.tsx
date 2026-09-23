import { Explorer } from "@/components/explorer";
import { getRestaurants } from "@/lib/restaurants";
import { isEditStage } from "@/lib/stage";

export default function HomePage() {
  const restaurants = getRestaurants();
  return <Explorer restaurants={restaurants} editable={isEditStage()} />;
}
