'use strict';
const { Service } = require('egg');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const userEmail = 'a1148177968@126.com';

const transporter = nodemailer.createTransport({
  service: '126',
  secureConnection: true,
  auth: {
    user: userEmail,
    pass: 'ULTFCKQHMHOYODAC',
  },
});

class ToolService extends Service {
  async mergeFile(filePath, filehash, size) {
    const chunkdDir = path.resolve(this.config.UPLOAD_DIR, filehash);
    let chunks = await fse.readdir(chunkdDir);
    chunks.sort((a, b) => a.split('-')[1] - b.split('-')[1]);

    chunks = chunks.map((cp) => path.resolve(chunkdDir, cp));
    console.log(chunks);
    await this.mergeChunks(chunks, filePath, size);
  }
  async mergeChunks(files, dest, size) {
    const pipStream = (filePath, writeStream) =>
      new Promise((resolve) => {
        const readStream = fse.createReadStream(filePath);
        readStream.on('end', () => {
          // fse.unlinkSync(filePath);
          resolve();
        });
        readStream.pipe(writeStream);
      });
    await Promise.all(
      files.map((file, index) => {
        console.log(index * size);
        return pipStream(
          file,
          fse.createWriteStream(dest, {
            start: index * size,
            end: (index + 1) * size,
          })
        );
      })
    );
  }
  // mergeChunks(files, dest) {
  //   files.map((file) => {
  //     return fs.appendFileSync(dest, fs.readFileSync(file));
  //   });

  // }
  async sendMail(email, subject, text, html) {
    const mailOptions = {
      from: userEmail,
      cc: userEmail,
      to: email,
      subject,
      text,
      html,
    };
    console.log(mailOptions);
    try {
      await transporter.sendMail(mailOptions);
      return true;
    } catch (e) {
      console.log('email error', e);
      return false;
    }
  }
}

module.exports = ToolService;
