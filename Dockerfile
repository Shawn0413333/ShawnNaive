FROM node:20

VOLUME /naivecoin

WORKDIR /naivecoin

ENTRYPOINT node bin/naivecoin.js

EXPOSE 3001