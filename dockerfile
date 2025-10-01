# Use official Playwright image with browsers preinstalled
FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy server code
COPY . .

# Expose port
EXPOSE 4000

# Run server
CMD ["node", "server.js"]
