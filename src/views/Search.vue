<template>
  <div class="search-page">
    <!-- 搜索表单 -->
    <div class="search-form">
      <van-form @submit="handleSearch">
        <van-cell-group inset>
          
          <van-field
            v-model="searchParams.forestFarm"
            name="forestFarm"
            label="林场"
            placeholder="请输入林场名称"
            clearable
          />
          
          <van-field
            v-model="searchParams.forestTeam"
            name="forestTeam"
            label="林队"
            placeholder="请输入林队名称"
            clearable
          />
          
          <van-field
            v-model="searchParams.smallClass"
            name="smallClass"
            label="小班"
            placeholder="请输入小班名称"
            clearable
          />
          
          <van-field
            v-model="searchParams.renewalMethod"
            name="renewalMethod"
            label="更新方式"
            placeholder="如：植苗"
            clearable
          />
          
          <van-field
            v-model="searchParams.renewalYear"
            name="renewalYear"
            label="更新年度"
            placeholder="如：2016"
            type="number"
            clearable
          />
          
          <van-field
            v-model="searchParams.operationContent"
            name="operationContent"
            label="作业内容"
            placeholder="如：清理迹地"
            clearable
          />
          
          <van-field
            v-model="searchParams.operator"
            name="operator"
            label="作业人"
            placeholder="请输入作业人姓名"
            clearable
          />
          
          <van-field
            v-model="searchParams.acceptancePerson"
            name="acceptancePerson"
            label="验收人"
            placeholder="请输入验收人姓名"
            clearable
          />
        </van-cell-group>
        
        <div class="form-actions">
          <van-button 
            type="primary" 
            native-type="submit" 
            size="large"
            :loading="loading"
            class="search-btn"
          >
            搜索
          </van-button>
          
          <van-button 
            type="default" 
            size="large"
            @click="resetSearch"
            class="reset-btn"
          >
            重置
          </van-button>
        </div>
      </van-form>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="hasSearched">
      <div class="result-header">
        <h3>搜索结果</h3>
        <span class="result-count">共{{ filteredCount }}条数据</span>
      </div>
      
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <div class="result-list">
          <div 
            v-for="item in currentPageData" 
            :key="item._id || `item_${Math.random()}`"
            class="result-item"
            @click="viewDetail(item)"
          >
              <div class="item-header">
                <span class="item-title">{{ getItemTitle(item) }}</span>
                <span class="sheet-name">{{ item._sheetName || '未知工作表' }}</span>
              </div>
              
              <div class="item-content">
                <div class="item-row" v-if="item.林场">
                  <span class="label">林场：</span>
                  <span class="value">{{ item.林场 }}</span>
                </div>
                
                <div class="item-row" v-if="item.林队">
                  <span class="label">林队：</span>
                  <span class="value">{{ item.林队 }}</span>
                </div>
                
                <div class="item-row" v-if="item.小班">
                  <span class="label">小班：</span>
                  <span class="value">{{ item.小班 }}</span>
                </div>
                
                <div class="item-row" v-if="item.作业内容">
                  <span class="label">作业内容：</span>
                  <span class="value">{{ item.作业内容 }}</span>
                </div>
                
                <div class="item-row" v-if="item.作业人">
                  <span class="label">作业人：</span>
                  <span class="value">{{ item.作业人 }}</span>
                </div>
                
                <div class="item-row" v-if="item.作业面积">
                  <span class="label">作业面积：</span>
                  <span class="value">{{ item.作业面积 }}亩</span>
                </div>
                
                <div class="item-row" v-if="item.作业人">
                  <span class="label">作业人：</span>
                  <span class="value">{{ item.作业人 }}</span>
                </div>
                
                <div class="item-row" v-if="item.作业完成日期">
                  <span class="label">完成日期：</span>
                  <span class="value">{{ item.作业完成日期 }}</span>
                </div>
              </div>
              
              <div class="item-footer">
                <van-icon name="arrow" />
              </div>
          </div>
        </div>
      </van-pull-refresh>
      
      <!-- 分页控件 -->
      <div class="pagination" v-if="showPagination && totalPages > 1">
        <div class="pagination-info">
          <span>第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
        </div>
        <div class="pagination-controls">
          <van-button 
            type="default" 
            size="small" 
            :disabled="currentPage <= 1"
            @click="goToPrevPage"
          >
            上一页
          </van-button>
          
          <div class="page-numbers">
            <span 
              v-for="page in getPageNumbers()" 
              :key="page"
              :class="['page-number', { active: page === currentPage }]"
              @click="goToPage(page)"
            >
              {{ page }}
            </span>
          </div>
          
          <van-button 
            type="default" 
            size="small" 
            :disabled="currentPage >= totalPages"
            @click="goToNextPage"
          >
            下一页
          </van-button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <van-icon name="search" size="48" color="#ccc" />
      <p>请输入搜索条件开始查询</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useForestDataStore } from '../stores/forestData'
import { Toast } from 'vant'

const router = useRouter()
const forestDataStore = useForestDataStore()

// 响应式数据
const hasSearched = ref(false)
const refreshing = ref(false)
const listLoading = ref(false)
const finished = ref(false)
const currentPage = ref(1)
const pageSize = 20
const totalPages = ref(0)
const showPagination = ref(false)

// 计算属性
const searchParams = computed(() => forestDataStore.searchParams)
const filteredCount = computed(() => forestDataStore.filteredCount)
const filteredData = computed(() => forestDataStore.filteredData)
const loading = computed(() => forestDataStore.loading)

const currentPageData = ref([])

// 方法
const handleSearch = () => {
  forestDataStore.searchData()
  hasSearched.value = true
  currentPage.value = 1
  totalPages.value = Math.ceil(filteredCount.value / pageSize)
  showPagination.value = filteredCount.value > pageSize
  loadPageData()
  
  if (filteredCount.value === 0) {
    Toast('未找到匹配的数据')
  } else {
    Toast(`找到${filteredCount.value}条数据，共${totalPages.value}页`)
  }
}

const resetSearch = () => {
  forestDataStore.resetSearch()
  hasSearched.value = false
  currentPageData.value = []
  currentPage.value = 1
  finished.value = false
}

const loadPageData = () => {
  const paginatedData = forestDataStore.getPaginatedData(currentPage.value, pageSize)
  currentPageData.value = paginatedData.data
  totalPages.value = paginatedData.totalPages
  finished.value = currentPage.value >= paginatedData.totalPages
  listLoading.value = false
}

const onLoad = () => {
  if (finished.value) {
    listLoading.value = false
    return
  }
  
  currentPage.value++
  loadPageData()
}

// 分页控制方法
const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  
  currentPage.value = page
  loadPageData()
}

const goToPrevPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

const goToNextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

// 获取页码数组
const getPageNumbers = () => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    // 总页数少于等于7页，显示所有页码
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // 总页数大于7页，显示省略号
    if (current <= 4) {
      // 当前页在前4页
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      // 当前页在后4页
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // 当前页在中间
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
}

const onRefresh = async () => {
  refreshing.value = true
  
  try {
    // 重新执行搜索
    forestDataStore.searchData()
    currentPage.value = 1
    loadPageData()
  } finally {
    refreshing.value = false
  }
}

// 获取项目标题
const getItemTitle = (item) => {
  // 优先使用名称字段
  if (item.名称 && item.名称.toString().trim()) {
    return item.名称.toString().trim()
  }
  
  // 如果没有名称，使用林场+林队+小班的组合
  const parts = []
  if (item.林场) parts.push(item.林场)
  if (item.林队) parts.push(item.林队)
  if (item.小班) parts.push(item.小班)
  
  if (parts.length > 0) {
    return parts.join(' - ')
  }
  
  // 如果都没有，显示默认标题
  return '未知项目'
}

const viewDetail = (item) => {
  // 确保有ID，如果没有则生成一个
  if (!item._id) {
    item._id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  console.log('=== 详情页数据结构 ===')
  console.log('项目ID:', item._id)
  console.log('工作表:', item._sheetName)
  console.log('行号:', item._rowIndex)
  console.log('完整数据结构:', item)
  console.log('数据结构字段列表:', Object.keys(item))
  console.log('数据字段统计:', {
    总字段数: Object.keys(item).length,
    有值字段数: Object.values(item).filter(v => v !== '' && v !== null && v !== undefined).length,
    空字段数: Object.values(item).filter(v => v === '' || v === null || v === undefined).length
  })
  console.log('========================')
  
  router.push({
    name: 'Detail',
    params: { id: item._id },
    query: { data: JSON.stringify(item) }
  })
}

// 监听路由参数
watch(() => router.currentRoute.value.query, (newQuery) => {
  if (newQuery && Object.keys(newQuery).length > 0) {
    // 从URL参数恢复搜索条件
    Object.keys(newQuery).forEach(key => {
      if (searchParams.value.hasOwnProperty(key)) {
        searchParams.value[key] = newQuery[key]
      }
    })
    handleSearch()
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  // 如果URL中有查询参数，自动执行搜索
  const query = router.currentRoute.value.query
  if (query && Object.keys(query).length > 0) {
    Object.keys(query).forEach(key => {
      if (searchParams.value.hasOwnProperty(key)) {
        searchParams.value[key] = query[key]
      }
    })
    handleSearch()
  }
})
</script>

<style scoped>
.search-page {
  padding: 0;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.search-form {
  background: white;
  margin-bottom: 10px;
}

.form-actions {
  padding: 20px;
  display: flex;
  gap: 15px;
}

.search-btn {
  flex: 2;
}

.reset-btn {
  flex: 1;
}

.search-results {
  background: white;
  margin-top: 10px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.result-count {
  font-size: 12px;
  color: #666;
}

.result-list {
  padding: 0 20px;
}

.result-item {
  display: block;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: #f8f9fa;
}

.result-item:last-child {
  border-bottom: none;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  width: 100%;
}

.item-title {
  font-weight: 600;
  color: #1989fa;
  font-size: 16px;
  flex: 1;
  line-height: 1.4;
}

.sheet-name {
  background: #e8f4fd;
  color: #1989fa;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
}

.item-content {
  width: 100%;
  margin-top: 8px;
}

.item-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 12px;
}

.item-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #666;
  min-width: 60px;
  flex-shrink: 0;
}

.value {
  color: #333;
  flex: 1;
  word-break: break-all;
}

.item-footer {
  color: #ccc;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state p {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .form-actions {
    padding: 15px;
    flex-direction: column;
  }
  
  .search-btn,
  .reset-btn {
    flex: none;
    height: 45px;
  }
  
  .result-header {
    padding: 12px 15px;
  }
  
  .result-list {
    padding: 0 15px;
  }
  
  .result-item {
    padding: 12px 0;
  }
  
  .item-row {
    font-size: 11px;
  }
  
  .label {
    min-width: 50px;
  }
}

/* 分页控件样式 */
.pagination {
  background: white;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 10px;
}

.pagination-info {
  text-align: center;
  margin-bottom: 10px;
  font-size: 12px;
  color: #666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.page-numbers {
  display: flex;
  gap: 5px;
  align-items: center;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.page-number:hover {
  background-color: #f5f5f5;
  border-color: #1989fa;
}

.page-number.active {
  background-color: #1989fa;
  color: white;
  border-color: #1989fa;
}

.page-number:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media screen and (max-width: 768px) {
  .pagination {
    padding: 10px 15px;
  }
  
  .page-number {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }
  
  .pagination-controls {
    gap: 5px;
  }
}
</style>
