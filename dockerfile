# Use official Node.js
FROM node:22-slim

# Install dependencies needed for Playwright
RUN apt-get update && apt-get install -y \
    wget unzip fonts-liberation libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdbus-1-3 libdrm2 libxkbcommon0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libgtk-3-0 \
    libasound2 libnss3 xvfb && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy package.json and install
COPY package*.json ./
RUN npm install

# Force playwright to install Chromium at build time
RUN npx playwright install --with-deps chromium

# Copy the rest of the app
COPY . .

# Expose the port Render expects
EXPOSE 10000

# Start backend
CMD ["npm", "start"]