/* eslint valid-jsdoc: "off" */

'use strict';
const path = require('path');
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = (exports = {});

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1589081758044_7877';

  // add your middleware config here
  // 注意这里不添加jwt是因为不是所有路由都需要
  config.middleware = [];

  config.multipart = {
    mode: 'file',
    whitelist: () => true,
  };
  config.UPLOAD_DIR = path.resolve(__dirname, '..', 'app/public');
  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  };

  return {
    ...config,
    ...userConfig,
    security: {
      csrf: {
        enable: false,
      },
    },
    mongoose: {
      client: {
        url: 'mongodb://localhost:27017/luomuhub',
        options: {},
      },
    },
    jwt: {
      secret: ':luomude@jiejiejie@@@',
    },
  };
};
