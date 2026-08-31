FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE {{FRONTEND_PORT}}
CMD ["npm", "run", "dev"]
