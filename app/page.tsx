import { Explorer } from "@/components/explorer";
import { getRestaurants } from "@/lib/restaurants";
import { isEditStage } from "@/lib/stage";
import { authEnabled } from "@/lib/auth";
import { UserPlacesProvider } from "@/components/user/user-places-provider";

export default function HomePage() {
  const restaurants = getRestaurants();
  const auth = authEnabled();
  return (
    <UserPlacesProvider enabled={auth}>
      <Explorer restaurants={restaurants} editable={isEditStage()} authEnabled={auth} />
    </UserPlacesProvider>
  );
}
