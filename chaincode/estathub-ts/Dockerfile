FROM node:18-alpine
ARG CC_SERVER_PORT=9999
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist/ dist/
ENV NODE_ENV=production
CMD ["sh", "-c", "./node_modules/.bin/fabric-chaincode-node server --chaincode-address=${CHAINCODE_SERVER_ADDRESS:-0.0.0.0:9999} --chaincode-id=${CHAINCODE_ID}"]
