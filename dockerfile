# Use Node.js 22 (Render defaults to 22.16.0 anyway)
FROM node:22-slim

# Create and set working directory
WORKDIR /app

# Copy package files first (better build caching)
COPY package.json package-lock.json* ./

# Install dependencies (force fresh install to avoid old cache issues)
RUN npm install --legacy-peer-deps

# Copy the rest of your project
COPY . .

# Expose the port your server uses
EXPOSE 10000

# Start the backend
CMD ["npm", "start"]
