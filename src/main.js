import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 导入IndexedDB查看工具
import './utils/indexedDBViewer.js'

// 引入Vant组件库
import { Button, Search, Field, Cell, CellGroup, Tab, Tabs, List, Loading, PullRefresh, Toast, Dialog, Uploader, Form, Picker, Popup } from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)

// 注册Vant组件 - 只注册确实存在的组件
app.use(Button)
app.use(Search)
app.use(Field)
app.use(Cell)
app.use(CellGroup)
app.use(Tab)
app.use(Tabs)
app.use(List)
app.use(Loading)
app.use(PullRefresh)
app.use(Toast)
app.use(Dialog)
app.use(Uploader)
app.use(Form)
app.use(Picker)
app.use(Popup)

app.use(createPinia())
app.use(router)

app.mount('#app')
