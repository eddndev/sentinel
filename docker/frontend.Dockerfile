FROM oven/bun:1 as build
WORKDIR /usr/src/app

COPY frontend/package.json frontend/bun.lock? ./
RUN bun install

COPY frontend/ .
RUN bun run build

FROM nginx:stable-alpine
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
