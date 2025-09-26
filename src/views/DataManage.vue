<template>
  <div class="data-manage-page">
    <van-nav-bar
      title="数据管理"
      left-text="返回"
      left-arrow
      @click-left="goBack"
    />
    
    <div class="manage-content">
      <!-- 存储信息 -->
      <van-cell-group title="存储信息" inset>
        <van-cell title="总数据量" :value="totalCount + '条'" />
        <van-cell title="筛选结果" :value="filteredCount + '条'" />
        <van-cell title="存储类型" :value="getStorageTypeText()" />
        <van-cell title="存储时间" :value="storageTime" />
        <van-cell title="存储大小" :value="storageSize" />
      </van-cell-group>
      
      <!-- 数据统计 -->
      <van-cell-group title="数据统计" inset>
        <van-cell title="林场数量" :value="uniqueValues.forestFarms.length" />
        <van-cell title="林队数量" :value="uniqueValues.forestTeams.length" />
        <van-cell title="小班数量" :value="uniqueValues.smallClasses.length" />
        <van-cell title="更新方式" :value="uniqueValues.renewalMethods.length" />
        <van-cell title="作业人数量" :value="uniqueValues.operators.length" />
      </van-cell-group>
      
      <!-- 存储详情 -->
      <van-cell-group title="存储详情" inset>
        <van-cell title="LocalStorage 批次" :value="batchInfo.totalBatches + '个'" />
        <van-cell title="每批大小" :value="batchInfo.batchSize + '条'" />
        <van-cell title="最后更新" :value="formatDate(batchInfo.timestamp)" />
      </van-cell-group>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <van-button 
          type="primary" 
          size="large" 
          icon="eye"
          @click="showDataPreview"
          class="action-btn"
        >
          预览数据
        </van-button>
        
        <van-button 
          type="info" 
          size="large" 
          icon="search"
          @click="checkIndexedDB"
          class="action-btn"
        >
          检查IndexedDB
        </van-button>
        
        <van-button 
          type="success" 
          size="large" 
          icon="download"
          @click="exportData"
          class="action-btn"
        >
          导出数据
        </van-button>
        
        <van-button 
          type="warning" 
          size="large" 
          icon="delete"
          @click="clearAllData"
          class="action-btn"
        >
          清除数据
        </van-button>
        
        <van-button 
          type="default" 
          size="large" 
          icon="setting"
          @click="testStorage"
          class="action-btn"
        >
          测试存储
        </van-button>
      </div>
      
      <!-- 数据预览 -->
      <van-cell-group title="数据预览" inset v-if="showPreview">
        <van-cell>
          <template #title>
            <div class="preview-content">
              <pre>{{ previewData }}</pre>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForestDataStore } from '../stores/forestData'
import { Toast, Dialog } from 'vant'
import storageManager from '../utils/storageManager.js'

const router = useRouter()
const forestDataStore = useForestDataStore()

// 响应式数据
const showPreview = ref(false)
const previewData = ref('')
const storageType = ref('unknown')
const batchInfo = ref({
  totalBatches: 0,
  batchSize: 1000,
  timestamp: 0
})

// 计算属性
const totalCount = computed(() => forestDataStore.totalCount)
const filteredCount = computed(() => forestDataStore.filteredCount)
const uniqueValues = computed(() => forestDataStore.uniqueValues)

const storageTime = computed(() => {
  if (batchInfo.value.timestamp) {
    return formatDate(batchInfo.value.timestamp)
  }
  return '无数据'
})

const storageSize = computed(() => {
  try {
    let totalSize = 0
    for (let i = 0; i < batchInfo.value.totalBatches; i++) {
      const data = localStorage.getItem(`forest_data_batch_${i}`)
      if (data) {
        totalSize += data.length
      }
    }
    const batchInfoSize = localStorage.getItem('forest_data_batches')?.length || 0
    totalSize += batchInfoSize
    
    if (totalSize < 1024) {
      return totalSize + 'B'
    } else if (totalSize < 1024 * 1024) {
      return (totalSize / 1024).toFixed(1) + 'KB'
    } else {
      return (totalSize / (1024 * 1024)).toFixed(1) + 'MB'
    }
  } catch (error) {
    return '计算失败'
  }
})

// 方法
const goBack = () => {
  router.back()
}

const formatDate = (timestamp) => {
  if (!timestamp) return '无'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const getStorageTypeText = () => {
  switch (storageType.value) {
    case 'localStorage':
      return '本地存储 (LocalStorage)'
    case 'indexedDB':
      return '浏览器数据库 (IndexedDB)'
    case 'unknown':
      return '未知'
    default:
      return '无数据'
  }
}

const checkIndexedDB = async () => {
  try {
    Toast.loading('正在检查IndexedDB...')
    
    // 尝试从存储管理器加载数据
    const result = await storageManager.smartLoad()
    
    if (result) {
      const info = {
        存储类型: result.storageType === 'localStorage' ? '本地存储' : '浏览器数据库',
        数据条数: result.data.length,
        数据大小: formatDataSize(result.data),
        检查时间: new Date().toLocaleString('zh-CN')
      }
      
      previewData.value = JSON.stringify(info, null, 2)
      showPreview.value = true
      
      Toast.success('IndexedDB检查完成')
    } else {
      Toast('未找到存储的数据')
    }
  } catch (error) {
    console.error('检查IndexedDB失败:', error)
    Toast.fail('检查失败: ' + error.message)
  }
}

const formatDataSize = (data) => {
  const size = new TextEncoder().encode(JSON.stringify(data)).length
  if (size < 1024) {
    return size + 'B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(1) + 'KB'
  } else {
    return (size / (1024 * 1024)).toFixed(1) + 'MB'
  }
}

const showDataPreview = () => {
  if (totalCount.value === 0) {
    Toast('暂无数据')
    return
  }
  
  // 只显示前5条数据作为预览
  const preview = forestDataStore.rawData.slice(0, 5).map((item, index) => ({
    序号: index + 1,
    林场: item.林场,
    林队: item.林队,
    小班: item.小班,
    作业内容: item.作业内容,
    作业人: item.作业人
  }))
  
  previewData.value = JSON.stringify(preview, null, 2)
  showPreview.value = !showPreview.value
}

const exportData = () => {
  if (totalCount.value === 0) {
    Toast('暂无数据可导出')
    return
  }
  
  try {
    const data = forestDataStore.rawData
    const csvContent = convertToCSV(data)
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `森林管理数据_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    Toast.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    Toast.fail('导出失败')
  }
}

const convertToCSV = (data) => {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = []
  
  // 添加表头
  csvRows.push(headers.join(','))
  
  // 添加数据行
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || ''
      // 处理包含逗号的字段
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  })
  
  return csvRows.join('\n')
}

const testStorage = async () => {
  try {
    Toast.loading('正在测试存储...')
    
    // 创建测试数据
    const testData = [
      { 名称: '测试1', 林场: '测试林场', 林队: '测试林队', 小班: '测试小班' },
      { 名称: '测试2', 林场: '测试林场', 林队: '测试林队', 小班: '测试小班' }
    ]
    
    // 测试保存
    const saveResult = await storageManager.smartSave(testData)
    console.log('保存测试结果:', saveResult)
    
    // 测试加载
    const loadResult = await storageManager.smartLoad()
    console.log('加载测试结果:', loadResult)
    
    const testResult = {
      保存结果: saveResult,
      加载结果: loadResult ? {
        存储类型: loadResult.storageType,
        数据条数: loadResult.data.length
      } : null,
      测试时间: new Date().toLocaleString('zh-CN')
    }
    
    previewData.value = JSON.stringify(testResult, null, 2)
    showPreview.value = true
    
    Toast.success('存储测试完成，请查看控制台')
  } catch (error) {
    console.error('存储测试失败:', error)
    Toast.fail('存储测试失败: ' + error.message)
  }
}

const clearAllData = () => {
  Dialog.confirm({
    title: '确认清除',
    message: '确定要清除所有数据吗？此操作不可撤销。',
  }).then(async () => {
    await forestDataStore.clearAllStorage()
    forestDataStore.rawData = []
    forestDataStore.filteredData = []
    
    Toast.success('所有数据已清除')
    router.back()
  }).catch(() => {
    // 用户取消
  })
}

// 生命周期
onMounted(async () => {
  // 检测存储类型
  try {
    const result = await storageManager.smartLoad()
    if (result) {
      storageType.value = result.storageType
    }
  } catch (error) {
    console.error('检测存储类型失败:', error)
  }
  
  // 获取批次信息
  try {
    const batchInfoStr = localStorage.getItem('forest_data_batches')
    if (batchInfoStr) {
      batchInfo.value = JSON.parse(batchInfoStr)
    }
  } catch (error) {
    console.error('获取批次信息失败:', error)
  }
})
</script>

<style scoped>
.data-manage-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.manage-content {
  padding: 10px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 20px 0;
}

.action-btn {
  height: 50px;
  border-radius: 8px;
  font-size: 16px;
}

.preview-content {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
}

.preview-content pre {
  margin: 0;
  font-size: 12px;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .manage-content {
    padding: 5px;
  }
  
  .action-buttons {
    margin: 15px 0;
  }
  
  .preview-content {
    max-height: 200px;
  }
}
</style>
