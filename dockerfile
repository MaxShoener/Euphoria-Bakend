FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

# Install Chromium for Playwright
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 10000
CMD ["npm", "start"]
