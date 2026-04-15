FROM node:20-alpine

# Install language runtimes
RUN apk add --no-cache python3 py3-pip g++ openjdk17-jre

# Install ts-node for TypeScript support
RUN npm install -g ts-node typescript

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.js .

EXPOSE 2358
CMD ["node", "index.js"]
