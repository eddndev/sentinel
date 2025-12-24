FROM oven/bun:1 as build
WORKDIR /usr/src/app

COPY frontend/package.json frontend/bun.lock? ./
RUN bun install

COPY frontend/ .
ARG VITE_API_URL
# All in one RUN to ensure env is available for the build
RUN echo "=== VITE_API_URL: ${VITE_API_URL} ===" && \
    echo "VITE_API_URL=${VITE_API_URL}" > .env && \
    cat .env && \
    export VITE_API_URL="${VITE_API_URL}" && \
    bun run build && \
    echo "=== Build complete. Checking output ===" && \
    grep -r "api-sentinel" dist/_astro/*.js || echo "WARNING: api-sentinel NOT FOUND in build output"

FROM nginx:stable-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
