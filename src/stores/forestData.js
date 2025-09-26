import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import storageManager from '../utils/storageManager.js'

export const useForestDataStore = defineStore('forestData', () => {
  // 状态
  const rawData = ref([])
  const filteredData = ref([])
  const loading = ref(false)
  const searchParams = ref({
    forestFarm: '', // 林场
    forestTeam: '', // 林队
    smallClass: '', // 小班
    renewalMethod: '', // 更新方式
    renewalYear: '', // 更新年度
    operationArea: '', // 作业面积
    operationContent: '', // 作业内容
    accountingItem: '', // 录账项目
    operator: '', // 作业人
    acceptancePerson: '', // 验收人
    completionDate: '', // 作业完成日期
    acceptanceDate: '', // 验收日期
    remarks: '' // 备注
  })

  // 计算属性
  const totalCount = computed(() => rawData.value.length)
  const filteredCount = computed(() => filteredData.value.length)
  
  // 获取所有唯一值用于下拉选择
  const uniqueValues = computed(() => ({
    forestFarms: [...new Set(rawData.value.map(item => item.林场).filter(Boolean))],
    forestTeams: [...new Set(rawData.value.map(item => item.林队).filter(Boolean))],
    smallClasses: [...new Set(rawData.value.map(item => item.小班).filter(Boolean))],
    renewalMethods: [...new Set(rawData.value.map(item => item.更新方式).filter(Boolean))],
    renewalYears: [...new Set(rawData.value.map(item => item.更新年度).filter(Boolean))],
    operationContents: [...new Set(rawData.value.map(item => item.作业内容).filter(Boolean))],
    accountingItems: [...new Set(rawData.value.map(item => item.录账项目).filter(Boolean))],
    operators: [...new Set(rawData.value.map(item => item.作业人).filter(Boolean))],
    acceptancePersons: [...new Set(rawData.value.map(item => item.验收人).filter(Boolean))]
  }))

  // 解析Excel数据 - 优化大数据量处理
  const parseExcelData = (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          // 报告进度：文件读取完成
          onProgress && onProgress(10)
          
          const data = new Uint8Array(e.target.result)
          
          // 报告进度：开始解析工作簿
          onProgress && onProgress(20)
          
          const workbook = XLSX.read(data, { 
            type: 'array',
            // 优化选项
            cellDates: false,
            cellNF: false,
            cellStyles: false
          })
          
          // 获取所有工作表
          const sheetNames = workbook.SheetNames
          const allData = []
          
          // 使用 for...of 循环来处理异步操作
          for (let sheetIndex = 0; sheetIndex < sheetNames.length; sheetIndex++) {
            const sheetName = sheetNames[sheetIndex]
            try {
              // 报告进度：处理工作表
              const sheetProgress = 20 + (sheetIndex / sheetNames.length) * 60
              onProgress && onProgress(sheetProgress)
              
              const worksheet = workbook.Sheets[sheetName]
              
              // 获取工作表范围，避免处理空行
              const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
              const maxRows = Math.min(range.e.r + 1, 50000) // 限制每个工作表最多5万行
              
              // 批量处理数据，避免一次性加载所有数据
              const batchSize = 1000
              let processedRows = 0
              
              // 先获取第4行的表头（真正的列标题）
              const headerRange = XLSX.utils.encode_range({
                s: { c: 0, r: 3 }, // 第4行，索引为3
                e: { c: range.e.c, r: 3 }
              })
              
              const headerWorksheet = {
                ...worksheet,
                '!ref': headerRange
              }
              
              // 直接读取第4行的原始数据作为列标题
              const headerRow = XLSX.utils.sheet_to_json(headerWorksheet, { 
                header: 1,
                defval: '',
                raw: false
              })
              
              let headers = headerRow.length > 0 ? headerRow[0] : []
              // 规范化列标题：去掉所有空白字符（包含换行、制表符、空格）
              const normalizeHeader = (h) => (h === undefined || h === null) 
                ? '' 
                : String(h).replace(/\s+/g, '').trim()
              headers = headers.map(normalizeHeader)
              console.log(`工作表 ${sheetName} 的列标题(已规范化):`, headers)
              
              // 智能检测列标题行
              const findHeaderRow = (worksheet, maxRows) => {
                const expectedHeaders = ['林场', '林队', '小班', '更新方式', '更新年度', '作业面', '作业内容', '作业人']
                
                // 检查前10行，找到包含最多预期列标题的行
                let bestRow = 3 // 默认第4行
                let maxMatches = 0
                
                for (let rowIndex = 0; rowIndex < Math.min(10, maxRows); rowIndex++) {
                  const testRange = XLSX.utils.encode_range({
                    s: { c: 0, r: rowIndex },
                    e: { c: range.e.c, r: rowIndex }
                  })
                  
                  const testWorksheet = {
                    ...worksheet,
                    '!ref': testRange
                  }
                  
                  const testRow = XLSX.utils.sheet_to_json(testWorksheet, { 
                    header: 1,
                    defval: '',
                    raw: false
                  })
                  
                  if (testRow.length > 0) {
                    const rowHeaders = testRow[0]
                    const matches = expectedHeaders.filter(header => 
                      rowHeaders.some(h => h && h.toString().includes(header))
                    ).length
                    
                    console.log(`第${rowIndex + 1}行匹配度: ${matches}/${expectedHeaders.length}`, rowHeaders)
                    
                    if (matches > maxMatches) {
                      maxMatches = matches
                      bestRow = rowIndex
                    }
                  }
                }
                
                console.log(`选择第${bestRow + 1}行作为列标题行，匹配度: ${maxMatches}/${expectedHeaders.length}`)
                return bestRow
              }
              
              // 智能查找列标题行
              const headerRowIndex = findHeaderRow(worksheet, maxRows)
              
              // 如果找到的列标题行不是第4行，重新获取
              if (headerRowIndex !== 3) {
                const correctHeaderRange = XLSX.utils.encode_range({
                  s: { c: 0, r: headerRowIndex },
                  e: { c: range.e.c, r: headerRowIndex }
                })
                
                const correctHeaderWorksheet = {
                  ...worksheet,
                  '!ref': correctHeaderRange
                }
                
                const correctHeaderRow = XLSX.utils.sheet_to_json(correctHeaderWorksheet, { 
                  header: 1,
                  defval: '',
                  raw: false
                })
                
                headers.length = 0
                const alt = (correctHeaderRow.length > 0 ? correctHeaderRow[0] : [])
                headers.push(...alt.map(normalizeHeader))
                console.log(`最终列标题(已规范化):`, headers)
              }
              
              // 从第5行开始解析数据（跳过前4行标题）
              const startDataRow = 4 // 第5行，索引为4
              
              for (let startRow = startDataRow; startRow < maxRows; startRow += batchSize) {
                const endRow = Math.min(startRow + batchSize, maxRows)
                
                // 创建临时工作表范围
                const tempRange = XLSX.utils.encode_range({
                  s: { c: 0, r: startRow },
                  e: { c: range.e.c, r: endRow - 1 }
                })
                
                const tempWorksheet = {
                  ...worksheet,
                  '!ref': tempRange
                }
                
                const jsonData = XLSX.utils.sheet_to_json(tempWorksheet, { 
                  header: 1,
                  defval: '',
                  raw: false
                })
                
                if (jsonData.length > 0) {
                  // 使用之前获取的列标题
                  for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    if (row && row.some(cell => cell !== '')) {
                      const item = {}
                      headers.forEach((header, index) => {
                        if (header && row[index] !== undefined && row[index] !== '') {
                          item[header] = row[index]
                        }
                      })
                      
                      // 只添加有数据的行
                      if (Object.keys(item).length > 0) {
                        item._id = `sheet_${sheetIndex}_row_${startRow + i + 1}` // 添加唯一ID，+1因为从第5行开始
                        item._sheetName = sheetName
                        item._rowIndex = startRow + i + 1
                        allData.push(item)
                        
                        // 只在处理前几行时打印示例数据（避免打印太多）
                        if (allData.length <= 3) {
                          console.log(`示例数据 ${allData.length}:`, {
                            行号: startRow + i + 1,
                            林场: item.林场,
                            林队: item.林队,
                            小班: item.小班,
                            作业内容: item.作业内容
                          })
                        }
                      }
                    }
                  }
                }
                
                processedRows += batchSize
                
                // 报告进度
                const sheetProgress = 20 + (sheetIndex / sheetNames.length) * 60
                const batchProgress = ((processedRows / maxRows) / sheetNames.length) * 20
                const totalProgress = Math.min(sheetProgress + batchProgress, 100)
                onProgress && onProgress(totalProgress)
                
                // 让出控制权，避免阻塞UI
                if (startRow % (batchSize * 10) === 0) {
                  await new Promise(resolve => setTimeout(resolve, 1))
                }
              }
              
            } catch (sheetError) {
              console.warn(`处理工作表 ${sheetName} 时出错:`, sheetError)
              // 继续处理其他工作表
            }
          }
          
          // 报告进度：完成
          onProgress && onProgress(100)
          
          // 打印解析统计信息
          console.log(`=== Excel解析完成 ===`)
          console.log(`总数据条数: ${allData.length}`)
          console.log(`工作表数量: ${sheetNames.length}`)
          console.log(`工作表列表:`, sheetNames)
          
          // 按工作表统计数据量
          const sheetStats = {}
          allData.forEach(item => {
            const sheetName = item._sheetName
            sheetStats[sheetName] = (sheetStats[sheetName] || 0) + 1
          })
          console.log(`各工作表数据量:`, sheetStats)
          
          // 打印字段统计
          if (allData.length > 0) {
            const sampleItem = allData[0]
            console.log(`数据字段列表:`, Object.keys(sampleItem).filter(key => !key.startsWith('_')))
            console.log(`示例数据字段:`, {
              林场: sampleItem.林场,
              林队: sampleItem.林队,
              小班: sampleItem.小班,
              作业内容: sampleItem.作业内容,
              作业人: sampleItem.作业人
            })
          }
          console.log(`====================`)
          
          resolve(allData)
          
        } catch (error) {
          console.error('Excel解析失败:', error)
          reject(error)
        }
      }
      reader.onerror = (error) => {
        console.error('文件读取失败:', error)
        reject(error)
      }
      reader.readAsArrayBuffer(file)
    })
  }

  // 加载Excel文件
  const loadExcelFile = async (file, onProgress) => {
    loading.value = true
    try {
      // 先清除所有旧数据
      onProgress && onProgress(5)
      await clearAllStorage()
      rawData.value = []
      filteredData.value = []
      
      // 解析新数据
      console.log('开始解析Excel数据...')
      const data = await parseExcelData(file, (progress) => {
        // 将解析进度映射到5-80%范围
        const mappedProgress = 5 + (progress * 0.75)
        onProgress && onProgress(Math.min(mappedProgress, 80))
      })
      
      console.log(`Excel解析完成，共解析到 ${data.length} 条数据`)
      
      // 检查数据量是否过大
      if (data.length > 100000) {
        console.warn(`数据量较大 (${data.length}条)，建议分批处理`)
      }
      
      rawData.value = data
      filteredData.value = data
      
      // 保存新数据到存储
      console.log('开始保存数据到存储...')
      onProgress && onProgress(85)
      const saveResult = await storageManager.smartSave(data, (progress) => {
        // 将保存进度映射到85-100%范围
        const mappedProgress = 85 + (progress * 0.15)
        onProgress && onProgress(Math.min(mappedProgress, 100))
      })
      
      console.log('数据保存结果:', saveResult)
      
      // 验证数据是否真的保存成功
      if (saveResult.success) {
        console.log(`数据已成功保存到 ${saveResult.storageType}`)
      } else {
        console.error('数据保存失败:', saveResult)
        throw new Error('数据保存失败')
      }
      
      onProgress && onProgress(100)
      
      return { success: true, count: data.length, storageType: saveResult.storageType }
    } catch (error) {
      console.error('Excel解析失败:', error)
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  // 保存数据到本地存储
  const saveDataToLocalStorage = (data) => {
    try {
      // 分批保存，避免超过localStorage大小限制
      const batchSize = 1000
      const batches = []
      
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize))
      }
      
      // 保存批次信息
      localStorage.setItem('forest_data_batches', JSON.stringify({
        totalBatches: batches.length,
        totalCount: data.length,
        timestamp: Date.now()
      }))
      
      // 分批保存数据
      batches.forEach((batch, index) => {
        localStorage.setItem(`forest_data_batch_${index}`, JSON.stringify(batch))
      })
      
      console.log(`数据已保存到本地存储，共${batches.length}个批次`)
    } catch (error) {
      console.warn('保存到本地存储失败:', error)
      // 如果localStorage满了，尝试清理旧数据
      try {
        localStorage.removeItem('forest_data_batches')
        for (let i = 0; i < 100; i++) {
          localStorage.removeItem(`forest_data_batch_${i}`)
        }
        // 重新尝试保存
        saveDataToLocalStorage(data)
      } catch (retryError) {
        console.error('重试保存也失败:', retryError)
      }
    }
  }

  // 从存储加载数据
  const loadDataFromStorage = async () => {
    try {
      const result = await storageManager.smartLoad()
      if (result && result.data.length > 0) {
        rawData.value = result.data
        filteredData.value = result.data
        console.log(`从${result.storageType}加载了${result.data.length}条数据`)
        return { success: true, storageType: result.storageType, count: result.data.length }
      }
    } catch (error) {
      console.error('从存储加载数据失败:', error)
    }
    return { success: false }
  }

  // 清除所有存储数据
  const clearAllStorage = async () => {
    try {
      await storageManager.clearAll()
      console.log('所有存储数据已清除')
    } catch (error) {
      console.error('清除存储失败:', error)
    }
  }

  // 搜索数据
  const searchData = () => {
    let results = [...rawData.value]
    
    // 应用搜索条件
    Object.keys(searchParams.value).forEach(key => {
      const value = searchParams.value[key]
      if (value) {
        const query = String(value).toLowerCase().trim()
        if (query.length === 0) return

        results = results.filter(item => {
          const fieldKey = getChineseFieldName(key)
          const itemValue = item[fieldKey]

          if (itemValue === null || itemValue === undefined) return false

          // 统一转为字符串做不区分大小写的模糊匹配
          const candidate = String(itemValue).toLowerCase()
          return candidate.includes(query)
        })
      }
    })
    
    filteredData.value = results
  }

  // 重置搜索条件
  const resetSearch = () => {
    searchParams.value = {
      forestFarm: '',
      forestTeam: '',
      smallClass: '',
      renewalMethod: '',
      renewalYear: '',
      operationArea: '',
      operationContent: '',
      accountingItem: '',
      operator: '',
      acceptancePerson: '',
      completionDate: '',
      acceptanceDate: '',
      remarks: ''
    }
    filteredData.value = rawData.value
  }

  // 获取分页数据
  const getPaginatedData = (page = 1, pageSize = 20) => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: filteredData.value.slice(start, end),
      total: filteredData.value.length,
      page,
      pageSize,
      totalPages: Math.ceil(filteredData.value.length / pageSize)
    }
  }

  // 字段名映射
  const getChineseFieldName = (englishKey) => {
    const mapping = {
      forestFarm: '林场',
      forestTeam: '林队',
      smallClass: '小班',
      renewalMethod: '更新方式',
      renewalYear: '更新年度',
      operationArea: '作业面积',
      operationContent: '作业内容',
      accountingItem: '录账项目',
      operator: '作业人',
      acceptancePerson: '验收人',
      completionDate: '作业完成日期',
      acceptanceDate: '验收日期',
      remarks: '备注'
    }
    return mapping[englishKey] || englishKey
  }

    return {
      // 状态
      rawData,
      filteredData,
      loading,
      searchParams,
      
      // 计算属性
      totalCount,
      filteredCount,
      uniqueValues,
      
      // 方法
      loadExcelFile,
      searchData,
      resetSearch,
      getPaginatedData,
      parseExcelData,
      loadDataFromStorage,
      clearAllStorage
    }
})
