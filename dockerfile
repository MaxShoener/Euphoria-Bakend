# Dockerfile for Euphoria backend (proxy + cookie-jar)
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 10000
CMD ["node", "server.js"]
