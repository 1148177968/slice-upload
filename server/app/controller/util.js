'use strict';
const svgCaptcha = require('svg-captcha');
const fse = require('fs-extra');
const path = require('path');
const BaseController = require('./base');
const { existsSync } = require('fs-extra');

class UtilController extends BaseController {
  async captcha() {
    const captcha = svgCaptcha.create({
      size: 4,
      fontSize: 50,
      width: 100,
      height: 40,
      noise: 3,
    });
    this.ctx.session.captcha = captcha.text;
    this.ctx.response.type = 'image/svg+xml';
    this.ctx.body = captcha.data;
  }
  async mergefile() {
    const { ext, size, hash } = this.ctx.request.body;
    const filePath = path.resolve(this.config.UPLOAD_DIR, `${hash}.${ext}`);
    await this.ctx.service.tools.mergeFile(filePath, hash, size);
    this.success({
      url: `/public/${hash}.${ext}`,
    });
  }
  async checkfile() {
    const { ctx } = this;
    const { ext, hash } = ctx.request.body;
    const filePath = path.resolve(this.config.UPLOAD_DIR, `${hash}.${ext}`);
    let uploaded = false;
    let uploadedList = [];
    if (fse.existsSync(filePath)) {
      uploaded = true;
    } else {
      uploadedList = await this.getUploadedList(
        path.resolve(this.config.UPLOAD_DIR, hash)
      );
    }
    this.success({
      uploaded,
      uploadedList,
    });
  }
  async getUploadedList(dirPath) {
    return fse.existsSync(dirPath)
      ? (await fse.readdir(dirPath)).filter((name) => name[0] !== '.')
      : [];
  }
  async uploadfile() {
    // if (Math.random() > 0.8) {
    //   return (this.ctx.status = 500);
    // }
    const { ctx } = this;
    const file = ctx.request.files[0];
    const { hash, name } = ctx.request.body;

    const chunkPath = path.resolve(this.config.UPLOAD_DIR, hash);
    // const filePath = path.resolve()
    // console.log(name, file);
    if (!fse.existsSync(chunkPath)) {
      await fse.mkdir(chunkPath);
    }
    await fse.move(file.filepath, chunkPath + '/' + name);
    this.message('切片上传成功');
    // this.success({
    //   url: `/public/${file.filename}`,
    // });
  }
  // async uploadfile() {
  // 普通上传
  //   const { ctx } = this;
  //   const file = ctx.request.files[0];
  //   const { name } = ctx.request.body;
  //   console.log(name, file);
  //   await fse.move(file.filepath, this.config.UPLOAD_DIR + '/' + file.filename);
  //   this.success({
  //     url: `/public/${file.filename}`,
  //   });
  // }
  async sendcode() {
    const { ctx } = this;
    const email = ctx.query.email;
    const code = Math.random().toString().slice(2, 6);
    console.log('邮箱' + email + '验证码' + code);
    ctx.session.emailcode = code;
    const subject = '落木中台验证码';
    const text = 'ad';
    const html = `<h2>落木中台</h2><a href="https://kaikeba.com"><span>${code}</span></a>`;
    const hasSend = await this.service.tools.sendMail(
      email,
      subject,
      text,
      html
    );
    if (hasSend) {
      this.message('发送成功');
    } else {
      this.error('发送失败');
    }
  }
}

module.exports = UtilController;
