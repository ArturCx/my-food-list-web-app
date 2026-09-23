import { Explorer } from "@/components/explorer";
import { getRestaurants } from "@/lib/restaurants";
import { isEditStage } from "@/lib/stage";
import { authEnabled } from "@/lib/auth";

export default function HomePage() {
  const restaurants = getRestaurants();
  return <Explorer restaurants={restaurants} editable={isEditStage()} authEnabled={authEnabled()} />;
}
