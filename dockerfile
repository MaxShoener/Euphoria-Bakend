# Use Node.js LTS
FROM node:22

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Chromium for Playwright (needed for some sites)
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Expose app port
EXPOSE 3000

# Run server
CMD [ "npm", "start" ]