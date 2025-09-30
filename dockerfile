# Dockerfile (Debian-based) — installs Chromium and runs the app
FROM node:20-bullseye-slim

# install dependencies to run chromium
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libasound2 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    unzip \
 && rm -rf /var/lib/apt/lists/*

# Install chromium (from Debian repos)
RUN apt-get update && apt-get install -y chromium --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# Create app dir
WORKDIR /usr/src/app
COPY package*.json ./
# install dependencies (puppeteer-core avoids downloading chromium)
RUN npm ci --only=production

# copy app
COPY . .

# Set CHROME_PATH environment variable so puppeteer-core can use system chromium
ENV CHROME_PATH=/usr/bin/chromium

# optional: tune node environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server.js"]