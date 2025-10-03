# Use Node.js 18+ slim
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose the port Koyeb provides
EXPOSE 3000

# Start the app
CMD ["npm", "start"]