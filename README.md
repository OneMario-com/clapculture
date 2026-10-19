# CLAPCULTURE

Next.js storefront and admin (`apps/web`), deployed to Cloudflare Workers with the
[OpenNext adapter](https://opennext.js.org/cloudflare).

## Local development

```bash
npm install
cp .env.example apps/web/.env.local   # then fill in the values
npm run dev                           # http://localhost:3000
```

To run the production build locally in Cloudflare's runtime (workerd), put the same
variables in `apps/web/.dev.vars` and run `npm run preview`.

## Deployment (Cloudflare Workers)

Every push to `main` is built and deployed by Cloudflare Workers Builds.

One-time setup in the Cloudflare dashboard (Workers & Pages → `clapculture` → Settings):

1. **Build** → connect this GitHub repository and use:
   - Production branch: `main`
   - Root directory: `/`
   - Build command: `npm run build`
   - Deploy command: `npm run deploy`
   - Non-production branch deploy command: `npm run upload`
2. **Variables and Secrets** → add every variable from `.env.example`, using the
   *Secret* type for keys and passwords. They are read at runtime, so no build
   variables are needed.

Manual deploy from a computer: `npx wrangler login`, then `npm run build && npm run deploy`.
