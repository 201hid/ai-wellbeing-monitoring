# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .

ARG VITE_MSAL_CLIENT_ID=""
ARG VITE_MSAL_AUTHORITY=""
ARG VITE_MSAL_AUTHORITY_SIGNUP=""
ENV VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID
ENV VITE_MSAL_AUTHORITY=$VITE_MSAL_AUTHORITY
ENV VITE_MSAL_AUTHORITY_SIGNUP=$VITE_MSAL_AUTHORITY_SIGNUP

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
