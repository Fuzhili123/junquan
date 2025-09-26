<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 全局样式重置 */
* {
  box-sizing: border-box;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .van-cell {
    font-size: 14px;
  }
  
  .van-field__control {
    font-size: 14px;
  }
}
</style>

