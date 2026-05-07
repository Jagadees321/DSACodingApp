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

# TanStack Start preview resolves dist/server/server.js; build emits index.js
RUN ln -sf index.js dist/server/server.js

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Vite preview for TanStack Start still reads router entry metadata from source.
COPY --from=build /app/src ./src
COPY --from=build /app/vite.config.ts ./vite.config.ts
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
