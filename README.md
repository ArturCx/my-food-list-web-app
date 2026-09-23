# My Food List

Mapa pessoal de bares e restaurantes. 100% estático, sem backend: os dados vivem em `content/restaurants/`, um JSON por lugar.

## Rodando

```bash
pnpm install
pnpm dev
```

## Adicionando um restaurante

1. Crie `content/restaurants/<slug>.json` (o `slug` dentro do arquivo precisa ser igual ao nome do arquivo):

```json
{
  "slug": "exemplo",
  "name": "Exemplo",
  "description": "Cozinha mineira contemporânea",
  "category": "restaurante",
  "badge": "TOP 10 do BRASIL",
  "address": "Rua X, 123 - Bairro, Belo Horizonte - MG",
  "coordinates": null,
  "website": "https://exemplo.com",
  "instagram": "exemplo",
  "instagramEmbed": "https://www.instagram.com/p/XXXX/",
  "menuUrl": "https://exemplo.com/menu.pdf",
  "hours": { "tue": ["12:00-15:00", "19:00-23:00"], "sat": ["12:00-23:00"] },
  "photos": ["/restaurants/exemplo/1.jpg"]
}
```

   Categorias: `alta-gastronomia`, `restaurante`, `bar`, `cervejaria`, `hamburgueria`, `wine-bar`, `cafe`.
   Campos opcionais: `badge`, `website`, `instagram`, `instagramEmbed`, `menuUrl`, `hours`. Dias ausentes em `hours` contam como fechado.

2. Deixe `coordinates: null` e rode `pnpm geocode`. O script busca lat/lng no Nominatim (OpenStreetMap) só para quem ainda não tem. Se o endereço não for encontrado, preencha na mão.

3. `pnpm build` valida todos os arquivos com Zod e quebra se algo estiver errado.

## Stack

Next.js (App Router, SSG), TypeScript, Tailwind 4, shadcn/ui, MapLibre GL com tiles vetoriais do OpenFreeMap (estilo Positron).
