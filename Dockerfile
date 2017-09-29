FROM node:8.6.0

WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .
RUN yarn

COPY . .

CMD [ "npm", "start" ]
EXPOSE 3000 9229