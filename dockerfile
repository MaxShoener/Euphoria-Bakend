# Use an official Node image
FROM node:20-slim

# Avoid interactive tzdata issues
ENV DEBIAN_FRONTEND=noninteractive

# Install git in case you later switch to packages requiring it (small footprint)
RUN apt-get update && apt-get install -y git ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package descriptor, install deps
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]