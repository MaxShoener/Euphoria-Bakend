# Use official Node.js LTS
FROM node:24

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy server code
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium

# Expose port
EXPOSE 10000

# Run server
CMD ["node", "server.js"]