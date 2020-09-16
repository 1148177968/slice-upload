'use strict';

// 解析token的中间件，可以用egg-jwt，这里自己分装
const jwt = require('jsonwebtoken');
module.exports = ({ app }) => {
  return async function verify(ctx, next) {
    if (!ctx.request.header.authorization) {
      return (ctx.body = {
        code: -666,
        message: '用户没有登陆',
      });
    }
    const token = ctx.request.header.authorization.replace('Bearer', '');
    try {
      const ret = await jwt.verify(token, app.config.jwt.secret);
      console.log(ret);
      ctx.state.email = ret.email;
      ctx.state.userid = ret._id;
      await next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        ctx.body = {
          code: -666,
          message: '登陆过期了',
        };
      } else {
        ctx.body = {
          code: -1,
          message: '用户信息出错',
        };
      }
    }
  };
};
