<template>
  <div class="home-page">
    <!-- 头部 -->
    <div class="header">
      <h1>森林管理数据查询系统</h1>
      <p class="subtitle">支持Excel数据导入和移动端查询</p>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-number">{{ totalCount }}</div>
        <div class="stat-label">总数据量</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ filteredCount }}</div>
        <div class="stat-label">筛选结果</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ uniqueValues.forestFarms.length }}</div>
        <div class="stat-label">林场数量</div>
      </div>
    </div>

    <!-- 功能按钮 -->
    <div class="action-buttons">
      <van-button 
        type="primary" 
        size="large" 
        icon="search"
        @click="goToSearch"
        class="action-btn"
      >
        数据查询
      </van-button>
      
      <van-button 
        type="default" 
        size="large" 
        icon="upload"
        @click="showUploadDialog = true"
        class="action-btn"
      >
        导入Excel
      </van-button>
      
      <van-button 
        type="success" 
        size="large" 
        icon="star"
        @click="loadDemoData"
        class="action-btn"
        v-if="totalCount === 0"
      >
        加载演示数据
      </van-button>
      
      <van-button 
        type="info" 
        size="large" 
        icon="setting"
        @click="goToDataManage"
        class="action-btn"
        v-if="totalCount > 0"
      >
        数据管理
      </van-button>
      
      <van-button 
        type="warning" 
        size="large" 
        icon="delete"
        @click="clearAllData"
        class="action-btn"
        v-if="totalCount > 0"
      >
        清除所有数据
      </van-button>
    </div>

    <!-- 最近查询记录 -->
    <div class="recent-searches" v-if="recentSearches.length > 0">
      <h3>最近查询</h3>
      <div class="search-list">
        <div 
          v-for="search in recentSearches" 
          :key="search.id"
          class="search-item"
          @click="executeRecentSearch(search)"
        >
          <div class="search-title">{{ search.title }}</div>
          <div class="search-info">
            {{ search.resultCount }}条结果 · {{ formatDate(search.timestamp) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 数据导入对话框 -->
    <van-dialog
      v-model:show="showUploadDialog"
      title="导入Excel数据"
      :show-cancel-button="!isUploading"
      :show-confirm-button="!isUploading"
      @confirm="handleUpload"
      @cancel="cancelUploadProcess"
    >
      <div class="upload-content">
        <van-uploader
          v-model="fileList"
          :after-read="handleFileRead"
          accept=".xlsx,.xls"
          :max-count="1"
        >
          <div class="upload-area">
            <van-icon name="plus" size="24" />
            <p>点击上传Excel文件</p>
            <p class="upload-tip">支持.xlsx和.xls格式</p>
          </div>
        </van-uploader>
        
        <div v-if="uploadProgress > 0" class="upload-progress">
          <van-loading type="spinner" size="20" />
          <div class="progress-info">
            <div class="progress-text">{{ getProgressText() }}</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <div class="progress-percent">{{ Math.round(uploadProgress) }}%</div>
          </div>
          <van-button 
            type="danger" 
            size="small" 
            @click="cancelUploadProcess"
            :disabled="!isUploading"
          >
            取消
          </van-button>
        </div>
      </div>
    </van-dialog>

    <!-- 加载状态 -->
    <van-loading v-if="loading" type="spinner" size="24" class="loading" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForestDataStore } from '../stores/forestData'
import { Toast, Dialog } from 'vant'
import { ExcelParser } from '../utils/excelParser'
import { generateDemoData } from '../../demo-data.js'
import storageManager from '../utils/storageManager.js'

const router = useRouter()
const forestDataStore = useForestDataStore()

// 响应式数据
const showUploadDialog = ref(false)
const fileList = ref([])
const uploadProgress = ref(0)
const recentSearches = ref([])
const isUploading = ref(false)
const cancelUpload = ref(false)

// 计算属性
const totalCount = computed(() => forestDataStore.totalCount)
const filteredCount = computed(() => forestDataStore.filteredCount)
const uniqueValues = computed(() => forestDataStore.uniqueValues)
const loading = computed(() => forestDataStore.loading)

// 方法
const goToSearch = () => {
  router.push('/search')
}

const goToDataManage = () => {
  router.push('/data-manage')
}

const handleFileRead = async (file) => {
  if (isUploading.value) return
  
  try {
    // 验证文件格式
    if (!ExcelParser.validateFile(file.file)) {
      Toast.fail('请选择有效的Excel文件')
      return
    }

    // 检查文件大小
    const fileSizeMB = file.file.size / (1024 * 1024)
    if (fileSizeMB > 50) {
      Toast.fail('文件过大，建议文件大小不超过50MB')
      return
    }

    isUploading.value = true
    cancelUpload.value = false
    uploadProgress.value = 5
    
    // 解析Excel文件，带进度回调
    const result = await forestDataStore.loadExcelFile(file.file, (progress) => {
      if (!cancelUpload.value) {
        uploadProgress.value = progress
      }
    })
    
    if (cancelUpload.value) {
      Toast('导入已取消')
      return
    }
    
    if (result.success) {
      uploadProgress.value = 100
      Toast.success(`成功导入${result.count}条数据`)
      showUploadDialog.value = false
      fileList.value = []
      
      // 保存导入记录
      saveImportRecord(result.count)
    } else {
      Toast.fail(`导入失败: ${result.error}`)
    }
  } catch (error) {
    console.error('文件处理失败:', error)
    Toast.fail('文件处理失败，请重试')
  } finally {
    uploadProgress.value = 0
    isUploading.value = false
    cancelUpload.value = false
  }
}

const handleUpload = () => {
  if (fileList.value.length === 0) {
    Toast.fail('请先选择文件')
    return
  }
}

const cancelUploadProcess = () => {
  cancelUpload.value = true
  uploadProgress.value = 0
  isUploading.value = false
}

const getProgressText = () => {
  const progress = uploadProgress.value
  if (progress <= 5) {
    return '正在清除旧数据...'
  } else if (progress <= 90) {
    return '正在解析Excel数据...'
  } else if (progress <= 100) {
    return '正在保存数据...'
  }
  return '处理中...'
}

const clearAllData = () => {
  Dialog.confirm({
    title: '确认清除',
    message: '确定要清除所有数据吗？此操作不可撤销。',
  }).then(async () => {
    // 清除内存中的数据
    forestDataStore.rawData = []
    forestDataStore.filteredData = []
    
    // 清除所有存储
    await forestDataStore.clearAllStorage()
    
    // 清除历史记录
    localStorage.removeItem('forest_records')
    recentSearches.value = []
    
    Toast.success('所有数据已清除')
  }).catch(() => {
    // 用户取消
  })
}

const saveImportRecord = (count) => {
  const record = {
    id: Date.now(),
    timestamp: new Date(),
    count,
    type: 'import'
  }
  
  const records = JSON.parse(localStorage.getItem('forest_records') || '[]')
  records.unshift(record)
  records.splice(10) // 只保留最近10条
  
  localStorage.setItem('forest_records', JSON.stringify(records))
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const executeRecentSearch = (search) => {
  // 执行历史搜索
  router.push({
    path: '/search',
    query: search.params
  })
}

const loadDemoData = async () => {
  try {
    // 先清除所有旧数据
    await forestDataStore.clearAllStorage()
    forestDataStore.rawData = []
    forestDataStore.filteredData = []
    
    // 生成演示数据
    const demoData = generateDemoData()
    forestDataStore.rawData = demoData
    forestDataStore.filteredData = demoData
    
    // 保存演示数据到存储
    await storageManager.smartSave(demoData)
    
    Toast.success(`成功加载${demoData.length}条演示数据`)
    
    // 保存加载记录
    saveImportRecord(demoData.length)
  } catch (error) {
    console.error('加载演示数据失败:', error)
    Toast.fail('加载演示数据失败')
  }
}

// 生命周期
onMounted(async () => {
  // 加载历史记录
  const records = JSON.parse(localStorage.getItem('forest_records') || '[]')
  recentSearches.value = records.slice(0, 5)
  
  // 尝试从存储加载数据
  const loadResult = await forestDataStore.loadDataFromStorage()
  // 不再弹出提示，静默加载
})
</script>

<style scoped>
.home-page {
  padding: 20px;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #1989fa;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.action-btn {
  height: 50px;
  border-radius: 8px;
  font-size: 16px;
}

.recent-searches {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recent-searches h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
}

.search-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-item:hover {
  background: #e9ecef;
}

.search-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.search-info {
  font-size: 12px;
  color: #666;
}

.upload-content {
  padding: 20px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  color: #666;
}

.upload-area p {
  margin: 8px 0 0;
  font-size: 14px;
}

.upload-tip {
  font-size: 12px;
  color: #999;
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  color: #1989fa;
}

.progress-info {
  flex: 1;
}

.progress-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background-color: #1989fa;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 12px;
  text-align: right;
  color: #666;
}

.loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .home-page {
    padding: 15px;
  }
  
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  
  .stat-card {
    padding: 15px;
  }
  
  .stat-number {
    font-size: 20px;
  }
  
  .header h1 {
    font-size: 20px;
  }
}
</style>
