FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# Install Chromium for Playwright (some sites need it)
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 3000

CMD ["npm", "start"]