# Multi-stage: build with full devDependencies; run with prod deps + Vite + TanStack config (preview).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_USE_API=true
ARG VITE_API_BASE_URL=http://localhost:3002/api/v1
ENV VITE_USE_API=${VITE_USE_API}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV CI=true
RUN npm run build
RUN ln -sf index.js dist/server/server.js

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && npm install vite@7.3.2 @lovable.dev/vite-tanstack-config@1.5.0
COPY --from=build /app/dist ./dist
RUN ln -sf index.js dist/server/server.js
COPY --from=build /app/src ./src
COPY --from=build /app/vite.config.ts ./vite.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/components.json ./components.json
EXPOSE 8080
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
