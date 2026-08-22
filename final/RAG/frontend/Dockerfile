FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Chạy ở chế độ dev và bind host 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]
