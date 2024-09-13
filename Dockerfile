FROM node:21.6.1-alpine as node-package

WORKDIR /app

COPY package.json /.
COPY package-lock.json /.
COPY index.js /.
COPY google.js /.
COPY generate-credentials.js /.

RUN npm ci

CMD ["npm", "run", "start"]