# Use Node 20 LTS
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy backend source
COPY server.js ./

# Expose port
EXPOSE 3000

# Start backend
CMD ["node", "server.js"]