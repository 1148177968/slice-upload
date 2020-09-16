<template>
  <div>
    <div class="write-btn">
      <el-button @click="sumbit" type="primary">提交</el-button>
    </div>
    <el-row>
      <el-col :span="12">
        <textarea
          ref="editor"
          class="md-editor"
          :value="content"
          @input="update"
        ></textarea>
      </el-col>
      <el-col :span="12">
        <div class="markdown-body" v-html="compiledContent"></div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import marked from "marked";
import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/monokai-sublime.css";
export default {
  data() {
    return {
      content: `# 开课吧
* asdasd
* aasdaszxc
\`\`\`javascript
  let a= 1;
  console.log(a)
\`\`\`
`
    };
  },
  mounted() {
    this.timer = null;
    this.bindEvent();
    marked.setOptions({
      rendered: new marked.Renderer(),
      highlight(code) {
        return hljs.highlightAuto(code).value;
      }
    });
  },
  computed: {
    compiledContent() {
      return marked(this.content, {});
    }
  },
  methods: {
    bindEvent() {
      this.$refs.editor.addEventListener("paste", async e => {
        const files = e.clipboardData.files;
        console.log(files);
      });
      this.$refs.editor.addEventListener("drop", async e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        console.log(files);
      });
    },
    update(e) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.content = e.target.value;
      }, 350);
    },
    async sumbit() {
      // let ret = await this.$http
    }
  }
};
</script>

<style scoped>
.md-editor {
  width: 100%;
  height: 100vh;
  outline: none;
}
.write-btn {
  position: fixed;
  z-index: 100;
  right: 30px;
  top: 10px;
}
</style>
