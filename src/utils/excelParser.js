import * as XLSX from 'xlsx'

/**
 * Excel解析工具类
 */
export class ExcelParser {
  /**
   * 解析Excel文件
   * @param {File} file Excel文件
   * @returns {Promise<Array>} 解析后的数据数组
   */
  static async parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const result = this.processWorkbook(workbook)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 处理工作簿
   * @param {Object} workbook XLSX工作簿对象
   * @returns {Array} 处理后的数据
   */
  static processWorkbook(workbook) {
    const allData = []
    const sheetNames = workbook.SheetNames

    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const sheetData = this.processWorksheet(worksheet, sheetName)
      allData.push(...sheetData)
    })

    return allData
  }

  /**
   * 处理单个工作表
   * @param {Object} worksheet 工作表对象
   * @param {string} sheetName 工作表名称
   * @returns {Array} 处理后的数据
   */
  static processWorksheet(worksheet, sheetName) {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
    const data = []

    if (jsonData.length === 0) return data

    // 第一行作为表头
    const headers = this.normalizeHeaders(jsonData[0])
    
    // 从第二行开始处理数据
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (this.isValidRow(row)) {
        const item = this.createDataItem(headers, row, sheetName, i)
        data.push(item)
      }
    }

    return data
  }

  /**
   * 标准化表头
   * @param {Array} headers 原始表头
   * @returns {Array} 标准化后的表头
   */
  static normalizeHeaders(headers) {
    return headers.map(header => {
      if (typeof header === 'string') {
        return header.trim()
      }
      return String(header || '').trim()
    })
  }

  /**
   * 验证行数据是否有效
   * @param {Array} row 行数据
   * @returns {boolean} 是否有效
   */
  static isValidRow(row) {
    if (!row || row.length === 0) return false
    // 检查是否有非空值
    return row.some(cell => cell !== null && cell !== undefined && cell !== '')
  }

  /**
   * 创建数据项
   * @param {Array} headers 表头
   * @param {Array} row 行数据
   * @param {string} sheetName 工作表名称
   * @param {number} rowIndex 行索引
   * @returns {Object} 数据项
   */
  static createDataItem(headers, row, sheetName, rowIndex) {
    const item = {
      _id: `${sheetName}_${rowIndex}`,
      _sheetName: sheetName,
      _rowIndex: rowIndex
    }

    headers.forEach((header, index) => {
      if (header && row[index] !== undefined) {
        const value = row[index]
        item[header] = this.normalizeValue(value)
      }
    })

    return item
  }

  /**
   * 标准化值
   * @param {any} value 原始值
   * @returns {any} 标准化后的值
   */
  static normalizeValue(value) {
    if (value === null || value === undefined) return ''
    
    // 如果是数字，保持数字类型
    if (typeof value === 'number') return value
    
    // 如果是字符串，去除首尾空格
    if (typeof value === 'string') {
      const trimmed = value.trim()
      // 尝试转换为数字
      const num = parseFloat(trimmed)
      if (!isNaN(num) && isFinite(num)) {
        return num
      }
      return trimmed
    }
    
    return value
  }

  /**
   * 根据Excel截图中的列名映射数据
   */
  static getFieldMapping() {
    return {
      '林场': 'forestFarm',
      '林队': 'forestTeam', 
      '小班': 'smallClass',
      '更新方式': 'renewalMethod',
      '更新年度': 'renewalYear',
      '作业面积': 'operationArea',
      '本批次结算面积': 'settlementArea',
      '作业内容': 'operationContent',
      '录账项目': 'accountItem',
      '作业完成日期': 'completionDate',
      '投资标准': 'investmentStandard',
      '实际投资': 'actualInvestment',
      '作业人': 'operator',
      '验收人': 'acceptancePerson',
      '验收日期': 'acceptanceDate',
      '本周期开始日期': 'periodStartDate',
      '本周期结束日期': 'periodEndDate',
      '备注': 'remarks'
    }
  }

  /**
   * 验证Excel文件格式
   * @param {File} file 文件
   * @returns {boolean} 是否有效
   */
  static validateFile(file) {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ]
    
    const validExtensions = ['.xlsx', '.xls']
    const fileName = file.name.toLowerCase()
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => fileName.endsWith(ext))
  }
}

