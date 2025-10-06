FROM node:20-bullseye

# Install build tools for Scramjet & Ultraviolet
RUN apt-get update && \
    apt-get install -y git python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.js ./
COPY index.html ./public/

EXPOSE 3000
CMD ["node", "server.js"]