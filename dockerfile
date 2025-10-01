FROM node:22

# Create app dir
WORKDIR /app

# Copy files
COPY package.json package-lock.json* ./
RUN npm install

# Copy rest of the app
COPY . .

# Expose port
EXPOSE 10000

# Start app
CMD ["npm", "start"]