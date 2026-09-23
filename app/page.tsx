import { Explorer } from "@/components/explorer";
import { getRestaurants } from "@/lib/restaurants";

export default function HomePage() {
  const restaurants = getRestaurants();
  return <Explorer restaurants={restaurants} />;
}
