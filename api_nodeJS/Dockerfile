FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY .env.example /app/.env

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]