<template>
  <div>
    <h1>用户中心</h1>
    <div ref="drag" id="drag">
      <input type="file" name="file" @change="handleFileChange" />
    </div>
    <div>
      <el-progress
        :stroke-width="20"
        :text-inside="true"
        :percentage="uploadProgress"
      ></el-progress>
    </div>
    <div>
      <el-button @click="uploadFile">上传</el-button>
    </div>
    <div>
      <p>计算hash得进度</p>
      <el-progress
        :stroke-width="20"
        :text-inside="true"
        :percentage="hashProgress"
      ></el-progress>
    </div>
    <div>
      <div class="cube-container" :style="{ width: cubeWidth + 'px' }">
        <div class="cube" v-for="chunk in chunks" :key="chunk.name">
          <div
            :class="{
              uploading: chunk.progress > 0 && chunk.progress < 100,
              success: chunk.progress == 100,
              error: chunk.progress < 0
            }"
            :style="{ height: chunk.progress + '%' }"
          >
            <i
              class="el-icon-loading"
              style="color:#f56c6c"
              v-if="chunk.progress > 0 && chunk.progress < 100"
            ></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="stylus">
#drag
  height 100px
  border 2px dashed #eee
  line-height 100px
  text-align center
.cube-container
  .cube
    width 14px
    height 14px
    line-height 12px
    border  1px black solid
    background #eeeeee
    float left
    >.success
      background green
    >.uploading
      background blue
    >.error
      background red
</style>
<script>
import sparkMD5 from "spark-md5";
const CHUNK_SIZE = 0.1 * 1000 * 1024;
export default {
  data() {
    return {
      file: null,
      // uploadProgress: 0,
      chunks: [],
      hashProgress: 0
    };
  },
  computed: {
    cubeWidth() {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16;
    },
    uploadProgress() {
      if (!this.file || this.chunks.length) {
        return 0;
      }
      const loaded = this.chunks
        .map(item => item.chunk.size * item.progress)
        .reduce((acc, cur) => acc + cur, 0);
      return parseInt(((loaded * 100) / this.file.size).toFixed(2));
    }
  },
  async mounted() {
    const ret = await this.$http.get("/user/info");
    console.log(ret);
    this.bindEvents();
  },
  methods: {
    bindEvents() {
      const drag = this.$refs.drag;
      drag.addEventListener("dragover", e => {
        drag.style.borderColor = "red";
        e.preventDefault();
      });
      drag.addEventListener("dragleave", e => {
        drag.style.borderColor = "#eee";
        e.preventDefault();
      });
      drag.addEventListener("drop", e => {
        const fileList = e.dataTransfer.files;
        drag.style.borderColor = "#eee";
        this.file = fileList[0];
        e.preventDefault();
      });
    },
    handleFileChange(e) {
      const [file] = e.target.files;
      if (!file) return;
      this.file = file;
      console.log(file, file.slice(0, 6));
    },
    blobToString(blob) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = function() {
          console.log(reader.result);
          const ret = reader.result
            .split("")
            .map(v => v.charCodeAt())
            .map(v => v.toString(16).toUpperCase())
            .join(" ");
          resolve(ret);
        };
        reader.readAsBinaryString(blob);
      });
    },
    async isGif(file) {
      //GIF89a 和GIF87a
      //前面6个16进制，'47 49 46 38 39 61' '47 49 46 38 37 61'
      //16进制转换

      const ret = await this.blobToString(file.slice(0, 6));
      console.log(ret);
      const isGif = ret == "47 49 46 38 39 61" || ret == "47 49 46 38 37 61";
      return isGif;
    },
    async usPng(file) {
      const ret = await this.blobToString(file.slice(0, 8));
      const ispng = ret == "89 50 4E 47 0D 0A 1A 0A";
      return ispng;
    },
    async isJpg(file) {
      const len = file.size;
      const start = await this.blobToString(file.slice(0, 2));
      const tail = await this.blobToString(file.slice(len - 2, len));
      const ispng = start == "FF 08" && tail == "FF D9";
      return isJpg;
    },
    async isImage(file) {
      //通过文件流判断
      //线判定gif
      return (
        (await this.isGif(file)) ||
        (await this.usPng(file)) ||
        (await this.isJpg(file))
      );
    },
    createFileChunk(file, size = CHUNK_SIZE) {
      console.log(file);
      const chunks = [];
      let cur = 0;
      while (cur < file.size) {
        chunks.push({
          index: cur,
          file: file.slice(cur, cur + size)
        });
        cur += size;
      }
      return chunks;
    },
    async calculateHashWorker() {
      //不在主线程计算，用webworker开启额外线程
      //注意 这个是加载额外的js
      return new Promise(resolve => {
        this.worker = new Worker("/hash.js");
        this.worker.postMessage({ chunks: this.chunks });
        this.worker.onmessage = e => {
          const { progress, hash } = e.data;
          this.hashProgress = Number(progress.toFixed(2));
          if (hash) {
            resolve(hash);
          }
        };
      });
    },
    async calculateHashIdle() {
      const chunks = this.chunks;
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        let count = 0;

        const appendToSpark = async file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = e => {
              spark.append(e.target.result);
              resolve();
            };
          });
        };

        const workloop = async deadline => {
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            await appendToSpark(chunks[count].file);
            count++;
            if (count < chunks.length) {
              this.hashProgress = Number(
                ((100 * count) / chunks.length).toFixed
              );
            } else {
              this.hashProgress = 100;
              resolve(spark.end());
            }
          }
          window.requestIdleCallback(workloop);
        };
        window.requestIdleCallback(workloop);
      });
    },

    async calculateHashSample() {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        const reader = new FileReader();
        const file = this.file;
        const size = file.size;

        const offset = 0.1 * 1024 * 1024;

        let chunks = [file.slice(0, offset)];

        let cur = offset;
        while (cur < size) {
          if (cur + offset >= size) {
            chunks.push(file.slice(cur, cur + offset));
          } else {
            const min = cur + offset / 2;
            const end = cur + offset;
            chunks.push(file.slice(cur, cur + 2));
            chunks.push(file.slice(min, min + 2));
            chunks.push(file.slice(end - 2, end));
          }
          cur += offset;
        }

        reader.readAsArrayBuffer(new Blob(chunks));
        reader.onload = e => {
          spark.append(e.target.result);
          this.hashProgress = 100;
          resolve(spark.end());
        };
      });
    },
    async uploadFile() {
      // if(!await this.isImage(this.file)){
      //   console.log('格式不对')
      // }else{
      //   console.log('giftu')
      // }
      // return
      console.log("123");
      const chunks = this.createFileChunk(this.file);
      console.log(this.chunks);
      // const hash = await this.calculateHashWorker();
      // const hash = await this.calculateHashIdle();

      const hash = await this.calculateHashSample();
      this.hash = hash;
      console.log("hash", hash);
      // console.log("hash1", hash1);
      // console.log("hash1", hash2);

      const {
        data: { uploaded, uploadedList }
      } = await this.$http.post("/checkfile", {
        hash: this.hash,
        ext: this.file.name.split(".").pop()
      });
      if (uploaded) {
        return this.$message.success("妙传成功");
      }
      this.chunks = chunks.map((chunk, index) => {
        const name = hash + "-" + index;
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          //已经上穿的设为100
          progress: uploadedList.indexOf(name) > -1 ? 100 : 0
        };
      });

      this.uploadChunks(uploadedList);
    },
    async uploadChunks(uploadedList) {
      const requests = this.chunks
        .filter(chunk => {
          return uploadedList.indexOf(chunk.name) == -1;
        })
        .map((chunk, index) => {
          const form = new FormData();
          form.append("chunk", chunk.chunk);
          form.append("hash", chunk.hash);
          form.append("name", chunk.name);

          return { form, index: chunk.index, error: 0 };
        });
      // .map(({ form, index }) =>
      //   this.$http.post("/uploadfile", form, {
      //     onUploadProgress: progress => {
      //       this.chunks[index].progress = Number(
      //         (progress.loaded / progress.total) * 100
      //       ).toFixed(2);
      //     }
      //   })
      // );
      // await Promise.all(requests);
      await this.sendRequest(requests);
      await this.mergeRequest();
      // const form = new FormData();
      // form.append("name", "file");
      // form.append("file", this.file);
      // const ret = await this.$http.post("/uploadfile", form, {
      //   onUploadProgress: progress => {
      //     this.uploadProgress = Number(
      //       (progress.loaded / progress.total) * 100
      //     ).toFixed(2);
      //   }
      // });
      // console.log(ret);
    },
    async sendRequest(chunks, limit = 3) {
      return new Promise((resolve, reject) => {
        const len = chunks.length;
        let counter = 0;
        let isStop = false;
        const start = async () => {
          if (isStop) {
            return;
          }
          const task = chunks.shift();
          if (task) {
            const { form, index } = task;
            try {
              await this.$http.post("/uploadfile", form, {
                onUploadProgress: progress => {
                  this.chunks[index].progress = Number(
                    (progress.loaded / progress.total) * 100
                  ).toFixed(2);
                }
              });
              if (counter == len - 1) {
                resolve();
              } else {
                counter++;
                start();
              }
            } catch {
              this.chunks[index].progress = -1;
              if (task.error < 3) {
                task.error++;
                chunks.unshift(task);
                start();
              } else {
                isStop = true;
                reject();
              }
            }
          }
        };
        while (limit > 0) {
          start();
          limit -= 1;
        }
      });
    },

    async mergeRequest() {
      this.$http.post("/mergefile", {
        ext: this.file.name.split(".").pop(),
        size: CHUNK_SIZE,
        hash: this.hash
      });
    }
  }
};
</script>

<style lang="scss" scoped></style>
