FROM node:20

WORKDIR /app
COPY package.json ./

# Install dependencies (no SSH, retry network)
RUN npm install --legacy-peer-deps --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

COPY . .

EXPOSE 8080
CMD ["npm", "start"]