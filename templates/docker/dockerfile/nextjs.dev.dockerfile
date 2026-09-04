FROM {{NODE_IMAGE}}
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE {{FRONTEND_PORT}}
CMD ["npm", "run", "dev"]
