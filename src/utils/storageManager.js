/**
 * 智能存储管理器
 * 根据数据量自动选择存储方式：localStorage 或 IndexedDB
 */

class StorageManager {
  constructor() {
    this.dbName = 'ForestManagementDB'
    this.dbVersion = 1
    this.storeName = 'forestData'
    this.db = null
  }

  // 初始化 IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          store.createIndex('sheetName', 'sheetName', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  // 估算数据大小
  estimateDataSize(data) {
    const jsonString = JSON.stringify(data)
    return new Blob([jsonString]).size
  }

  // 智能选择存储方式
  async smartSave(data, onProgress) {
    try {
      const dataSize = this.estimateDataSize(data)
      const sizeMB = dataSize / (1024 * 1024)
      
      console.log(`数据大小: ${sizeMB.toFixed(2)}MB`)
      console.log(`数据条数: ${data.length}`)
      
      let result
      // 如果数据小于2MB，使用localStorage
      if (sizeMB < 2) {
        console.log('选择localStorage存储')
        result = await this.saveToLocalStorage(data, onProgress)
      } else {
        // 数据较大，使用IndexedDB
        console.log('选择IndexedDB存储')
        result = await this.saveToIndexedDB(data, onProgress)
      }
      
      console.log('存储结果:', result)
      return result
    } catch (error) {
      console.error('smartSave失败:', error)
      throw error
    }
  }

  // 保存到 localStorage
  async saveToLocalStorage(data, onProgress) {
    try {
      const batchSize = 1000
      const batches = []
      
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize))
      }
      
      // 保存批次信息
      localStorage.setItem('forest_data_batches', JSON.stringify({
        totalBatches: batches.length,
        totalCount: data.length,
        timestamp: Date.now(),
        storageType: 'localStorage'
      }))
      
      // 分批保存数据
      batches.forEach((batch, index) => {
        localStorage.setItem(`forest_data_batch_${index}`, JSON.stringify(batch))
        onProgress && onProgress((index + 1) / batches.length * 100)
      })
      
      console.log(`数据已保存到localStorage，共${batches.length}个批次`)
      return { success: true, storageType: 'localStorage', batchCount: batches.length }
    } catch (error) {
      console.warn('localStorage保存失败，尝试使用IndexedDB:', error)
      // localStorage满了，尝试IndexedDB
      return this.saveToIndexedDB(data, onProgress)
    }
  }

  // 保存到 IndexedDB
  async saveToIndexedDB(data, onProgress) {
    try {
      await this.initDB()
      
      // 分批保存数据，每批使用独立的事务
      const batchSize = 500 // 减小批次大小，避免事务超时
      const batches = []
      
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize))
      }
      
      console.log(`准备保存 ${batches.length} 个批次到IndexedDB`)
      
      // 先清除旧数据
      await this.clearIndexedDB()
      
      // 保存批次信息
      await this.saveBatchToIndexedDB({
        id: 'batch_info',
        totalBatches: batches.length,
        totalCount: data.length,
        timestamp: Date.now(),
        storageType: 'indexedDB'
      })
      
      // 分批保存数据，每批使用独立事务
      for (let i = 0; i < batches.length; i++) {
        const batchData = {
          id: `batch_${i}`,
          data: batches[i],
          batchIndex: i
        }
        
        await this.saveBatchToIndexedDB(batchData)
        
        // 报告进度
        onProgress && onProgress((i + 1) / batches.length * 100)
        
        // 每10个批次让出控制权，避免阻塞UI
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      console.log(`数据已保存到IndexedDB，共${batches.length}个批次`)
      return { success: true, storageType: 'indexedDB', batchCount: batches.length }
    } catch (error) {
      console.error('IndexedDB保存失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 保存单个批次到IndexedDB（使用独立事务）
  async saveBatchToIndexedDB(batchData) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      const request = store.put(batchData)
      
      request.onsuccess = () => {
        resolve()
      }
      
      request.onerror = () => {
        reject(request.error)
      }
      
      // 设置事务超时处理
      transaction.onabort = () => {
        reject(new Error('事务被中止'))
      }
      
      transaction.onerror = () => {
        reject(transaction.error)
      }
    })
  }

  // 智能加载数据
  async smartLoad() {
    // 首先尝试从localStorage加载
    const localStorageData = this.loadFromLocalStorage()
    if (localStorageData) {
      return localStorageData
    }
    
    // 如果localStorage没有数据，尝试从IndexedDB加载
    return this.loadFromIndexedDB()
  }

  // 从 localStorage 加载
  loadFromLocalStorage() {
    try {
      const batchInfo = localStorage.getItem('forest_data_batches')
      if (!batchInfo) return null
      
      const info = JSON.parse(batchInfo)
      if (info.storageType !== 'localStorage') return null
      
      const allData = []
      for (let i = 0; i < info.totalBatches; i++) {
        const batchData = localStorage.getItem(`forest_data_batch_${i}`)
        if (batchData) {
          const batch = JSON.parse(batchData)
          allData.push(...batch)
        }
      }
      
      if (allData.length > 0) {
        console.log(`从localStorage加载了${allData.length}条数据`)
        return { data: allData, storageType: 'localStorage', info }
      }
    } catch (error) {
      console.error('从localStorage加载数据失败:', error)
    }
    return null
  }

  // 从 IndexedDB 加载
  async loadFromIndexedDB() {
    try {
      await this.initDB()
      
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      // 获取批次信息
      const batchInfo = await new Promise((resolve, reject) => {
        const request = store.get('batch_info')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      if (!batchInfo || batchInfo.storageType !== 'indexedDB') {
        return null
      }
      
      // 加载所有批次数据
      const allData = []
      for (let i = 0; i < batchInfo.totalBatches; i++) {
        const batchData = await new Promise((resolve, reject) => {
          const request = store.get(`batch_${i}`)
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        
        if (batchData && batchData.data) {
          allData.push(...batchData.data)
        }
      }
      
      if (allData.length > 0) {
        console.log(`从IndexedDB加载了${allData.length}条数据`)
        return { data: allData, storageType: 'indexedDB', info: batchInfo }
      }
    } catch (error) {
      console.error('从IndexedDB加载数据失败:', error)
    }
    return null
  }

  // 清除 IndexedDB 数据
  async clearIndexedDB() {
    try {
      await this.initDB()
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      
      await new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('清除IndexedDB失败:', error)
    }
  }

  // 清除所有存储
  async clearAll() {
    // 清除localStorage
    try {
      const batchInfo = localStorage.getItem('forest_data_batches')
      if (batchInfo) {
        const info = JSON.parse(batchInfo)
        for (let i = 0; i < info.totalBatches; i++) {
          localStorage.removeItem(`forest_data_batch_${i}`)
        }
      }
      localStorage.removeItem('forest_data_batches')
    } catch (error) {
      console.error('清除localStorage失败:', error)
    }
    
    // 清除IndexedDB
    await this.clearIndexedDB()
    
    console.log('所有存储数据已清除')
  }

  // 获取存储信息
  async getStorageInfo() {
    const localStorageInfo = this.getLocalStorageInfo()
    const indexedDBInfo = await this.getIndexedDBInfo()
    
    return {
      localStorage: localStorageInfo,
      indexedDB: indexedDBInfo,
      currentStorage: localStorageInfo ? 'localStorage' : (indexedDBInfo ? 'indexedDB' : 'none')
    }
  }

  getLocalStorageInfo() {
    try {
      const batchInfo = localStorage.getItem('forest_data_batches')
      if (!batchInfo) return null
      
      const info = JSON.parse(batchInfo)
      if (info.storageType !== 'localStorage') return null
      
      // 计算存储大小
      let totalSize = batchInfo.length
      for (let i = 0; i < info.totalBatches; i++) {
        const batchData = localStorage.getItem(`forest_data_batch_${i}`)
        if (batchData) {
          totalSize += batchData.length
        }
      }
      
      return {
        ...info,
        size: totalSize,
        sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      }
    } catch (error) {
      return null
    }
  }

  async getIndexedDBInfo() {
    try {
      await this.initDB()
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      
      const batchInfo = await new Promise((resolve, reject) => {
        const request = store.get('batch_info')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      if (!batchInfo || batchInfo.storageType !== 'indexedDB') {
        return null
      }
      
      return {
        ...batchInfo,
        sizeMB: '计算中...' // IndexedDB大小计算较复杂
      }
    } catch (error) {
      return null
    }
  }
}

export default new StorageManager()
