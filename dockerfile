# Use Node 20 slim
FROM node:20-slim

# Install git for fetching HTTPS repos
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port (Koyeb sets PORT env)
ENV PORT=10000
EXPOSE 10000

# Start server
CMD ["npm", "start"]