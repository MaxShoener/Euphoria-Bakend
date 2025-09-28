# Use official Node.js LTS image
FROM node:22-bullseye

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and Playwright with browsers
RUN npm install && npx playwright install --with-deps chromium

# Copy backend source code
COPY server.js ./

# Expose port
EXPOSE 10000

# Start backend
CMD ["npm", "start"]
