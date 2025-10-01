# Use Playwright official image with all browsers preinstalled
FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy server code
COPY . .

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
