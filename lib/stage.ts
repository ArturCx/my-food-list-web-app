import "server-only";

/**
 * STAGE=DEV no .env liga ferramentas de edição (reposicionar fotos).
 * Qualquer outro valor, ou ausência, desliga. Lido só no servidor.
 */
export function isEditStage() {
  const v = (process.env.STAGE ?? process.env.stage ?? "").trim().toUpperCase();
  return v === "DEV";
}
