# Use official Node.js LTS image
FROM node:24-bullseye

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium

# Copy the rest of the backend files
COPY . .

# Expose backend port
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]