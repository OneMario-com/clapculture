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
2. **Variables and Secrets** → add the secrets, as type *Secret*: `APPWRITE_API_KEY`,
   `ADMIN_PASSWORD`, `JWT_SECRET`, `SMTP_PASS` (and `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN` if used). Non-secret settings (Appwrite endpoint and
   project, SMTP host and sender, site URL) are in `apps/web/wrangler.jsonc` under
   `vars`; change them there, since every deploy applies that file.

Manual deploy from a computer: `npx wrangler login`, then `npm run build && npm run deploy`.
