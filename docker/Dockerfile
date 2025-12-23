# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install dependencies into temp directory
FROM base AS install
RUN mkdir -p /temp/dev
COPY backend/package.json backend/bun.lock? /temp/dev/
COPY backend/prisma /temp/dev/prisma
RUN cd /temp/dev && bun install

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY backend/package.json backend/bun.lock? /temp/prod/
COPY backend/prisma /temp/prod/prisma
RUN cd /temp/prod && bun install --production
RUN cd /temp/prod && bunx prisma generate

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
# Copy backend source relative to where build context is (root)
COPY backend/ .
# [optional] tests & build
ENV NODE_ENV=production
# RUN bun test
RUN bun build src/index.ts --outdir ./dist --target bun

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/dist/index.js index.js
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 8080/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
