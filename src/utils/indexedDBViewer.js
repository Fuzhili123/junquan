// IndexedDB数据查看工具
// 在浏览器控制台中运行这些函数来查看IndexedDB中的数据

export const indexedDBViewer = {
  // 查看所有数据库
  async listDatabases() {
    if ('databases' in indexedDB) {
      try {
        const databases = await indexedDB.databases()
        console.log('所有数据库:', databases)
        return databases
      } catch (error) {
        console.error('获取数据库列表失败:', error)
        return []
      }
    } else {
      console.log('浏览器不支持databases()方法')
      return []
    }
  },

  // 查看forestDataDB数据库内容
  async viewForestData() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('forestDataDB', 1)
      
      request.onerror = () => {
        console.error('打开数据库失败:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = async () => {
        const db = request.result
        
        try {
          // 检查是否存在objectStore
          if (!db.objectStoreNames.contains('forestDataStore')) {
            console.log('forestDataStore不存在')
            resolve([])
            return
          }
          
          const transaction = db.transaction(['forestDataStore'], 'readonly')
          const store = transaction.objectStore('forestDataStore')
          
          // 获取所有数据
          const getAllRequest = store.getAll()
          
          getAllRequest.onsuccess = () => {
            const data = getAllRequest.result
            console.log('IndexedDB中的数据:', data)
            console.log('数据条数:', data.length)
            
            if (data.length > 0) {
              // 计算总数据大小
              const totalSize = data.reduce((size, batch) => {
                return size + (batch.data ? JSON.stringify(batch.data).length : 0)
              }, 0)
              console.log('数据大小:', this.formatSize(totalSize))
              
              // 显示第一个批次的前几条数据作为示例
              const firstBatch = data[0]
              if (firstBatch && firstBatch.data && firstBatch.data.length > 0) {
                console.log('第一个批次的数据示例:', firstBatch.data.slice(0, 3))
              }
            }
            
            resolve(data)
          }
          
          getAllRequest.onerror = () => {
            console.error('获取数据失败:', getAllRequest.error)
            reject(getAllRequest.error)
          }
          
        } catch (error) {
          console.error('操作数据库失败:', error)
          reject(error)
        }
        
        db.close()
      }
    })
  },

  // 查看localStorage中的数据
  viewLocalStorage() {
    console.log('=== LocalStorage 数据检查 ===')
    
    // 检查forest_data_single
    const singleData = localStorage.getItem('forest_data_single')
    if (singleData) {
      try {
        const parsed = JSON.parse(singleData)
        console.log('forest_data_single 数据:', parsed)
        console.log('forest_data_single 条数:', parsed.length)
        console.log('forest_data_single 大小:', this.formatSize(singleData.length))
      } catch (error) {
        console.error('解析forest_data_single失败:', error)
      }
    } else {
      console.log('forest_data_single: 无数据')
    }
    
    // 检查forest_data_batches
    const batchInfo = localStorage.getItem('forest_data_batches')
    if (batchInfo) {
      try {
        const parsed = JSON.parse(batchInfo)
        console.log('forest_data_batches 信息:', parsed)
        
        // 检查各个批次
        let totalBatches = 0
        let totalSize = 0
        for (let i = 0; i < parsed.totalBatches; i++) {
          const batchData = localStorage.getItem(`forest_data_batch_${i}`)
          if (batchData) {
            totalBatches++
            totalSize += batchData.length
          }
        }
        console.log('实际批次数量:', totalBatches)
        console.log('批次数据总大小:', this.formatSize(totalSize))
      } catch (error) {
        console.error('解析forest_data_batches失败:', error)
      }
    } else {
      console.log('forest_data_batches: 无数据')
    }
    
    // 检查历史记录
    const records = localStorage.getItem('forest_records')
    if (records) {
      try {
        const parsed = JSON.parse(records)
        console.log('搜索历史记录:', parsed)
      } catch (error) {
        console.error('解析历史记录失败:', error)
      }
    }
  },

  // 格式化文件大小
  formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  },

  // 清除所有存储
  async clearAllStorage() {
    console.log('=== 清除所有存储 ===')
    
    // 清除localStorage
    localStorage.removeItem('forest_data_single')
    localStorage.removeItem('forest_data_batches')
    localStorage.removeItem('forest_records')
    
    // 清除localStorage中的批次数据
    for (let i = 0; i < 100; i++) { // 假设最多100个批次
      localStorage.removeItem(`forest_data_batch_${i}`)
    }
    
    console.log('LocalStorage已清除')
    
    // 清除IndexedDB
    try {
      const request = indexedDB.deleteDatabase('forestDataDB')
      
      request.onsuccess = () => {
        console.log('IndexedDB已清除')
      }
      
      request.onerror = () => {
        console.error('清除IndexedDB失败:', request.error)
      }
      
      request.onblocked = () => {
        console.log('清除IndexedDB被阻塞，请关闭其他标签页')
      }
    } catch (error) {
      console.error('清除IndexedDB时出错:', error)
    }
  },

  // 完整检查
  async fullCheck() {
    console.log('=== 完整存储检查 ===')
    
    console.log('\n1. 检查LocalStorage:')
    this.viewLocalStorage()
    
    console.log('\n2. 检查IndexedDB:')
    await this.viewForestData()
    
    console.log('\n3. 检查所有数据库:')
    await this.listDatabases()
  }
}

// 将工具函数添加到window对象，方便在控制台使用
if (typeof window !== 'undefined') {
  window.indexedDBViewer = indexedDBViewer
  window.viewForestData = () => indexedDBViewer.viewForestData()
  window.viewLocalStorage = () => indexedDBViewer.viewLocalStorage()
  window.clearAllStorage = () => indexedDBViewer.clearAllStorage()
  window.fullCheck = () => indexedDBViewer.fullCheck()
  
  console.log('IndexedDB查看工具已加载到window对象')
  console.log('可用命令:')
  console.log('- viewForestData() - 查看IndexedDB中的森林数据')
  console.log('- viewLocalStorage() - 查看LocalStorage中的数据')
  console.log('- fullCheck() - 完整检查所有存储')
  console.log('- clearAllStorage() - 清除所有存储')
}

