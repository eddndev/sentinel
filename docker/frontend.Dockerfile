FROM oven/bun:1 as build
WORKDIR /usr/src/app

COPY frontend/package.json frontend/bun.lock? ./
RUN bun install

COPY frontend/ .
ARG VITE_API_URL
# Debug: show what we received
RUN echo "=== VITE_API_URL received: ${VITE_API_URL} ===" 
# Write to .env file (Vite reads this automatically)
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env && cat .env
# Build with the env file present
RUN bun run build

FROM nginx:stable-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
