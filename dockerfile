# Use the official Playwright image (includes Chromium, Firefox, WebKit)
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set working directory
WORKDIR /app

# Copy package.json first (for caching npm install layer)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port (Render uses PORT env var)
EXPOSE 10000

# Start the app
CMD ["npm", "start"]
