<template>
  <div>
    <!-- <div>导航</div> -->
    <nuxt></nuxt>

    <!-- <div>底部信息</div> -->
  </div>

</template>

<script>
  export default {
    
  }
</script>

<style lang="stylus">
.login-container
  width 100%
  height 100%
  .login-form
    width 520px
    padding 160px 0
    margin 0 auto
    overflow hidden
  .title-container
    display flex
    align-items center
    justify-content center
    margin-bottom 50px
    img
      width 200px
  .captcha-container
    width 340px
    position relative
    .el-button
      width 90px
      padding 0
      line-height 30px
    .captcha
      position absolute
      right  -110px
      img 
        width 90px
        height 50px
        cursor pointer

</style>