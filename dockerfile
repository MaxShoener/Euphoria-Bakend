# Use official Node image
FROM node:22-slim

# Install Playwright dependencies + Chromium
RUN apt-get update && apt-get install -y wget gnupg ca-certificates \
    && npx playwright install --with-deps chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of project
COPY . .

# Expose Render port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
