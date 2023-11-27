require('dotenv').config();
const { Express } = require('express');
// const { redisClient } = require('../redis');

/**
 * Starts server
 * @param {Express} app
 */

const startServer = (app) => {
  const port = process.env.APP_PORT || 5000;
  // ping redis server
  // const ping = (async () => {
  //   // ping redis server
  //   if(redisClient.check_power()) {
  //     redisClient.isAlive()
  //     .then((res) => {
  //       if(res) {
  //         console.log(`CACHING ON`);
  //       }
  //     });
  //   } else {
  //       console.log(`CACHING OFF`);
  //   }
  // })();
  app.listen(port, () => {
    console.log(`Server listening on PORT ${port}`);;
  });

  // ping
  //   .catch((err) => {
  //     console.log('Redis error: ', err);
  //   });
};

module.exports = { startServer };
