# Use official Node.js LTS image
FROM node:24-bullseye

# Set working directory
WORKDIR /app

# Copy package.json and server.js first (for better caching)
COPY package.json server.js ./
# Copy frontend
COPY index.html ./public/index.html

# Install dependencies
RUN npm install

# Install Playwright browsers
RUN npx playwright install chromium

# Expose port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]