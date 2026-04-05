ARG BASE_IMAGE=node:20-alpine
FROM $BASE_IMAGE

RUN apk add --no-cache npm nodejs

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

CMD ["npm", "test"]