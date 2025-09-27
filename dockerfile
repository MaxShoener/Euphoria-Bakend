# Use official Node.js LTS image
FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend code
COPY server.js ./

# Expose the port
EXPOSE 10000

# Start the backend
CMD ["node", "server.js"]
