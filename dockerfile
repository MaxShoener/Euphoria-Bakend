# Use Node Alpine for small image
FROM node:20-alpine

# Install dependencies for Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm \
    bash \
    curl

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Set Chromium path environment variable
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

EXPOSE 4000
CMD ["npm", "start"]
