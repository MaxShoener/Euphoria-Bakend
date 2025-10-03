FROM node:20-slim

# Create app dir
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install deps (directly from GitHub allowed)
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 8080

# Run app
CMD ["npm", "start"]