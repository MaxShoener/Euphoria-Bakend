# Use official Node.js LTS
FROM node:22

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app files
COPY . .

# Expose backend port
EXPOSE 3000

# Start app
CMD ["npm", "start"]