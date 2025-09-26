<template>
  <div class="detail-page">
    <div class="detail-header">
      <van-nav-bar
        title="详细信息"
        left-text="返回"
        left-arrow
        @click-left="goBack"
      />
    </div>
    
    <div class="detail-content" v-if="detailData">
      <!-- 基本信息 -->
      <van-cell-group title="基本信息" inset>
        <van-cell title="名称" :value="detailData.名称" v-if="detailData.名称" />
        <van-cell title="工作表" :value="detailData._sheetName" />
        <van-cell title="行号" :value="detailData._rowIndex" />
      </van-cell-group>
      
      <!-- 位置信息 -->
      <van-cell-group title="位置信息" inset>
        <van-cell title="林场" :value="detailData.林场" />
        <van-cell title="林队" :value="detailData.林队" />
        <van-cell title="小班" :value="detailData.小班" />
      </van-cell-group>
      
      <!-- 作业信息 -->
      <van-cell-group title="作业信息" inset>
        <van-cell title="更新方式" :value="detailData.更新方式" />
        <van-cell title="更新年度" :value="detailData.更新年度" />
        <van-cell title="作业面积" :value="formatArea(detailData.作业面积)" />
        <van-cell title="本批次结算面积" :value="formatArea(detailData.本批次结算面积)" />
        <van-cell title="作业内容" :value="detailData.作业内容" />
        <van-cell title="录账项目" :value="detailData.录账项目" />
      </van-cell-group>
      
      <!-- 投资信息 -->
      <van-cell-group title="投资信息" inset>
        <van-cell 
          title="投资标准" 
          :value="formatInvestment(detailData.投资标准, detailData['投资标准.1'])" 
        />
        <van-cell 
          title="实际投资" 
          :value="formatInvestment(detailData.实际投资, detailData['实际投资.1'])" 
        />
      </van-cell-group>
      
      <!-- 人员信息 -->
      <van-cell-group title="人员信息" inset>
        <van-cell title="作业人" :value="detailData.作业人" />
        <van-cell title="验收人" :value="detailData.验收人" />
      </van-cell-group>
      
      <!-- 时间信息 -->
      <van-cell-group title="时间信息" inset>
        <van-cell title="作业完成日期" :value="detailData.作业完成日期" />
        <van-cell title="验收日期" :value="detailData.验收日期" />
        <van-cell title="本周期开始日期" :value="detailData.本周期开始日期" />
        <van-cell title="本周期结束日期" :value="detailData.本周期结束日期" />
      </van-cell-group>
      
      <!-- 备注信息 -->
      <van-cell-group title="备注信息" inset v-if="detailData.备注">
        <van-cell>
          <template #title>
            <div class="remarks-content">
              {{ detailData.备注 }}
            </div>
          </template>
        </van-cell>
      </van-cell-group>
      
      <!-- 原始数据 -->
      <van-cell-group title="原始数据" inset>
        <van-cell>
          <template #title>
            <div class="raw-data">
              <pre>{{ JSON.stringify(detailData, null, 2) }}</pre>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
    
    <!-- 加载状态 -->
    <div v-else class="loading-container">
      <van-loading type="spinner" size="24" />
      <p>加载中...</p>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-bar" v-if="detailData">
      <van-button 
        type="primary" 
        size="large" 
        icon="share"
        @click="shareData"
        class="action-btn"
      >
        分享
      </van-button>
      
      <van-button 
        type="default" 
        size="large" 
        icon="edit"
        @click="editData"
        class="action-btn"
      >
        编辑
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Toast } from 'vant'

const router = useRouter()
const route = useRoute()

const detailData = ref(null)

// 方法
const goBack = () => {
  router.back()
}

const formatArea = (area) => {
  if (!area) return '-'
  return `${area}亩`
}

const formatInvestment = (unitPrice, amount) => {
  if (!unitPrice && !amount) return '-'
  
  let result = ''
  if (unitPrice) {
    result += `${unitPrice}元/亩`
  }
  if (amount) {
    if (result) result += ' · '
    result += `${amount}元`
  }
  return result
}

const shareData = () => {
  const nameText = detailData.value.名称 ? `名称：${detailData.value.名称}\n` : ''
  const shareText = `${nameText}林场：${detailData.value.林场}，林队：${detailData.value.林队}，小班：${detailData.value.小班}`
  
  if (navigator.share) {
    navigator.share({
      title: '森林管理数据详情',
      text: shareText,
      url: window.location.href
    }).catch(err => {
      console.log('分享失败:', err)
      Toast('分享功能暂不可用')
    })
  } else {
    // 复制到剪贴板
    const text = `${nameText}林场：${detailData.value.林场}\n林队：${detailData.value.林队}\n小班：${detailData.value.小班}\n作业内容：${detailData.value.作业内容 || '-'}`
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        Toast('已复制到剪贴板')
      }).catch(() => {
        Toast('复制失败')
      })
    } else {
      Toast('浏览器不支持分享功能')
    }
  }
}

const editData = () => {
  Toast('编辑功能开发中...')
}

// 生命周期
onMounted(() => {
  const { id } = route.params
  const { data } = route.query
  
  if (data) {
    try {
      detailData.value = JSON.parse(data)
    } catch (error) {
      console.error('解析数据失败:', error)
      Toast('数据格式错误')
    }
  } else {
    Toast('未找到数据')
  }
})
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}

.detail-header {
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.detail-content {
  padding: 10px;
}

.van-cell-group {
  margin-bottom: 10px;
}

.remarks-content {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
}

.raw-data {
  max-height: 300px;
  overflow-y: auto;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
}

.raw-data pre {
  margin: 0;
  font-size: 12px;
  color: #666;
  white-space: pre-wrap;
  word-break: break-all;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.loading-container p {
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 15px;
}

.action-btn {
  flex: 1;
  height: 45px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .detail-content {
    padding: 5px;
  }
  
  .van-cell-group {
    margin-bottom: 5px;
  }
  
  .action-bar {
    padding: 12px 15px;
  }
  
  .raw-data {
    max-height: 200px;
  }
  
  .raw-data pre {
    font-size: 10px;
  }
}
</style>
