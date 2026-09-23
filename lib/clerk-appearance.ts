import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/nextjs";

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;

/** Tema do Clerk alinhado ao site: vidro fosco, cantos de 20px, grafite como primária, logo no topo. */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "#0f172a",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#0f172a",
    colorMutedForeground: "#475569",
    colorBackground: "rgba(255, 255, 255, 0.86)",
    colorInput: "rgba(255, 255, 255, 0.75)",
    colorInputForeground: "#0f172a",
    colorBorder: "rgba(255, 255, 255, 0.9)",
    colorNeutral: "#0f172a",
    colorRing: "rgba(37, 99, 235, 0.35)",
    colorShadow: "rgba(15, 23, 42, 0.18)",
    colorModalBackdrop: "rgba(15, 23, 42, 0.35)",
    colorDanger: "#f43f5e",
    colorSuccess: "#10b981",
    borderRadius: "1rem",
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.875rem",
    fontWeight: { normal: 500, medium: 600, semibold: 700, bold: 800 },
  },
  options: {
    logoImageUrl: "/icon.png",
    logoPlacement: "inside",
    socialButtonsVariant: "blockButton",
    socialButtonsPlacement: "top",
    shimmer: true,
  },
};
