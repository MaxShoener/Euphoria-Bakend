FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install dependencies (GitHub installs work)
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]