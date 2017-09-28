FROM node:8.6.0

WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .
RUN yarn

COPY . .

CMD ["node", "index.js"]