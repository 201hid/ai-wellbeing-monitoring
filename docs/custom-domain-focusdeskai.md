# Custom domain: www.focusdeskai.com → Azure Container App

Container app: `aiwellbeing-app` (RG `aiwellbeing-rg`, env `aiwellbeing-env`)

Default FQDN: `aiwellbeing-app.wittyflower-b2fa98cb.australiaeast.azurecontainerapps.io`

## 1. Hostinger DNS records (add / update)

| Type  | Name        | Content / Points to |
|-------|-------------|---------------------|
| TXT   | `asuid.www` | `0052B01B48825E1EA44747EBCB2E61E7747D5655E1B3D0D9851C5F24201455C3` |
| CNAME | `www`       | `aiwellbeing-app.wittyflower-b2fa98cb.australiaeast.azurecontainerapps.io` |

- Remove or stop using **A** `@` → `2.57.91.91` when switching traffic to Azure.
- Redirect **@** → `https://www.focusdeskai.com` in Hostinger **Redirects** (recommended).

Wait 15–60 minutes for DNS propagation.

## 2. Azure (after DNS is live)

```bash
az containerapp hostname bind \
  -n aiwellbeing-app \
  -g aiwellbeing-rg \
  --hostname www.focusdeskai.com \
  -e aiwellbeing-env \
  --validation-method CNAME
```

Managed certificate is created automatically when validation succeeds.

## 3. Microsoft Entra (sign-in)

Add redirect URIs for the app registration:

- `https://www.focusdeskai.com/`
- `https://focusdeskai.com/` (if using apex redirect)

## 4. Verify

- `https://www.focusdeskai.com` loads the app with a valid certificate.
