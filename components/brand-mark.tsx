import Image from "next/image";

/** Logo do prato: versão clara no tema claro, escura no tema escuro (troca por CSS). */
export function BrandMark({ size = 44, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <Image src="/brand/logo-light.svg" alt="My Food List" width={size} height={size} priority className="block dark:hidden" />
      <Image src="/brand/logo-dark.svg" alt="My Food List" width={size} height={size} priority className="hidden dark:block" />
    </span>
  );
}
