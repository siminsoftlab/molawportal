FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY docai-server/package*.json ./
COPY docai-server . .

EXPOSE 8080
CMD ["node", "index.js"]
