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
  "categories": ["bar", "cozinha-mineira"],
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

   Categorias (campo `categories`, lista, a primeira define a cor do pin): `pizzaria`, `hamburgueria`, `bar`, `cervejaria`, `cozinha-brasileira`, `cozinha-mineira`, `alta-gastronomia`, `cozinha-espanhola`, `cozinha-asiatica`, `cozinha-alema`, `cafe`.
   Campos opcionais: `badge`, `website`, `instagram`, `instagramEmbed`, `menuUrl`, `hours`. Dias ausentes em `hours` contam como fechado.

2. Deixe `coordinates: null` e rode `pnpm geocode`. O script busca lat/lng no Nominatim (OpenStreetMap) só para quem ainda não tem. Se o endereço não for encontrado, preencha na mão.

3. `pnpm build` valida todos os arquivos com Zod e quebra se algo estiver errado.

## Fotos

As fotos ficam fora do git, num bucket Cloudflare R2. Localmente elas vivem em `public/restaurants/<slug>/` (ignorado pelo git).

```bash
pnpm add-photo <slug> "<url>"     # baixa, vira a principal, gera variantes (md, thumb)
pnpm apply-photos lista.txt       # o mesmo para várias linhas "Nome = url"
pnpm optimize-photos              # recomprime e regenera variantes
pnpm upload-photos                # envia para o R2 só o que mudou (precisa do .env.local)
```

Copie `.env.example` para `.env.local` e preencha as credenciais do R2. Em produção, defina `NEXT_PUBLIC_PHOTO_BASE_URL` com a URL pública do bucket.

## Conta, avaliações e anotações (Clerk + Neon)

Com login, cada usuário dá estrelas (1–5) e escreve uma anotação privada por lugar. Tudo fica na tabela `user_places` do Postgres; os lugares continuam nos JSONs.

1. Clerk: crie uma aplicação em clerk.com e copie `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` para o `.env`.
2. Neon: crie um projeto em neon.tech e copie a connection string para `DATABASE_URL`.
3. `pnpm db:push` cria a tabela. `pnpm db:studio` abre o painel de dados.

Sem as chaves do Clerk o site roda normalmente, só sem login e sem essas funções.

## Rolê de bares (`/rota`)

Escolha lugares no mapa ou na lista, opcionalmente parta da sua localização, e o app calcula a menor rota a pé passando por todos (ordem exata até 11 paradas, heurística até 15). Distâncias e trajeto vêm do Valhalla público do OpenStreetMap, sem chave.

## Stack

Next.js (App Router), TypeScript, Tailwind 4, MapLibre GL com tiles do OpenFreeMap, Clerk (auth), Neon Postgres + Drizzle, Cloudflare R2 (fotos), Valhalla (rotas a pé).
