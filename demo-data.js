// 演示数据生成器 - 用于测试系统功能
export const generateDemoData = () => {
  const forestFarms = ['北坡新村', '北坡旺基', '北坡港门', '南山林场', '东山林场']
  const forestTeams = ['北坡', '南山', '东山', '西林', '中林']
  const smallClasses = ['新村', '旺基塘', '港门', '南山001', '东山002', '西林003', '中林004']
  const renewalMethods = ['植苗', '直播', '嫁接', '扦插']
  const operationContents = ['清理迹地', '下挖树头直接全垦', '机开沟', '机犁草全垦', '机全垦', '人工整地', '施肥作业']
  const operators = ['黄德生', '妃尾', '马妹', '蔡彪', '张三', '李四', '王五', '赵六']
  const acceptancePersons = ['兆信李科张元', '胡兆信张元辉', '兆信日旺张元', '验收员A', '验收员B']
  
  const data = []
  const years = [2015, 2016, 2017, 2018, 2019, 2020]
  
  for (let i = 0; i < 100; i++) {
    const year = years[Math.floor(Math.random() * years.length)]
    const operationArea = Math.round((Math.random() * 500 + 10) * 10) / 10
    const unitPrice = Math.round(Math.random() * 50 + 5)
    const investmentAmount = Math.round(operationArea * unitPrice * 100) / 100
    
    data.push({
      _id: `demo_${i}`,
      _sheetName: '整地',
      _rowIndex: i + 2,
      林场: forestFarms[Math.floor(Math.random() * forestFarms.length)],
      林队: forestTeams[Math.floor(Math.random() * forestTeams.length)],
      小班: smallClasses[Math.floor(Math.random() * smallClasses.length)],
      更新方式: renewalMethods[Math.floor(Math.random() * renewalMethods.length)],
      更新年度: year,
      作业面积: operationArea,
      本批次结算面积: operationArea,
      作业内容: operationContents[Math.floor(Math.random() * operationContents.length)],
      录账项目: operationContents[Math.floor(Math.random() * operationContents.length)],
      作业完成日期: `${year}.${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}.${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      投资标准: unitPrice,
      '投资标准.1': investmentAmount,
      实际投资: Math.round((unitPrice + Math.random() * 2 - 1) * 100) / 100,
      '实际投资.1': Math.round(investmentAmount * (0.95 + Math.random() * 0.1) * 100) / 100,
      作业人: operators[Math.floor(Math.random() * operators.length)],
      验收人: acceptancePersons[Math.floor(Math.random() * acceptancePersons.length)],
      验收日期: `${year}.${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}.${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      本周期开始日期: `${year-1}.12.20`,
      本周期结束日期: `${year}.01.20`,
      备注: i % 3 === 0 ? '风害皆伐小班' : (i % 5 === 0 ? '并一个班,1009-1原是农用地不用清理' : '')
    })
  }
  
  return data
}

// 生成Excel格式的数据（用于测试导入功能）
export const createDemoExcelBlob = () => {
  const data = generateDemoData()
  
  // 创建CSV格式的演示数据
  const headers = [
    '林场', '林队', '小班', '更新方式', '更新年度', '作业面积', '本批次结算面积',
    '作业内容', '录账项目', '作业完成日期', '投资标准', '投资标准.1',
    '实际投资', '实际投资.1', '作业人', '验收人', '验收日期',
    '本周期开始日期', '本周期结束日期', '备注'
  ]
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || ''
        return `"${value}"`
      }).join(',')
    )
  ].join('\n')
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
}

