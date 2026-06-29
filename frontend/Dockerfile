# syntax=docker/dockerfile:1
# Build the Vite/React app, then serve the static bundle with nginx.
# (Activates once the frontend project lands in this directory.)

FROM node:20-slim AS build
WORKDIR /app
# Copy only package.json (not the lockfile): the lockfile is generated on macOS and
# npm's optional-dependency bug makes `npm ci` skip the Linux rollup native binary
# (@rollup/rollup-linux-x64-gnu), which breaks `vite build`. A fresh install in the
# Linux build image resolves the correct platform binary.
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
