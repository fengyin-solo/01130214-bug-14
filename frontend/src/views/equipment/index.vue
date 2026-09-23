<template>
  <div class="equipment-container">
    <el-row :gutter="20" class="mb-20">
      <el-col :span="6">
        <div class="stat-card" @click="filterByStatus('')">
          <div class="stat-value">{{ equipmentStats.total }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card running" @click="filterByStatus('运行中')">
          <div class="stat-value">{{ equipmentStats.running }}</div>
          <div class="stat-label">运行中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card maintenance" @click="filterByStatus('待维护')">
          <div class="stat-value">{{ equipmentStats.maintenance }}</div>
          <div class="stat-label">待维护</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card fault" @click="filterByStatus('故障')">
          <div class="stat-value">{{ equipmentStats.fault }}</div>
          <div class="stat-label">故障</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="mb-20">
      <template #header>
        <div class="card-header">
          <span>设备列表</span>
          <div>
            <el-button type="primary" size="small">新增设备</el-button>
            <el-button size="small">批量导入</el-button>
          </div>
        </div>
      </template>
      
      <el-form :inline="true" :model="filterForm" class="filter-form mb-20">
        <el-form-item label="设备名称">
          <el-input v-model="filterForm.equipmentName" placeholder="请输入设备名称" clearable @input="handleFilter" />
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="filterForm.equipmentType" placeholder="请选择设备类型" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="抽油机" value="抽油机" />
            <el-option label="阀门" value="阀门" />
            <el-option label="传感器" value="传感器" />
            <el-option label="电机" value="电机" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="请选择状态" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="运行中" value="运行中" />
            <el-option label="待维护" value="待维护" />
            <el-option label="故障" value="故障" />
            <el-option label="停机" value="停机" />
          </el-select>
        </el-form-item>
        <el-form-item label="维护日期范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="filteredEquipmentList" border stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="equipmentCode" label="设备编码" width="120" />
        <el-table-column prop="equipmentName" label="设备名称" width="150" />
        <el-table-column prop="equipmentType" label="设备类型" width="120" />
        <el-table-column prop="model" label="型号规格" width="150" />
        <el-table-column prop="installLocation" label="安装位置" width="150" />
        <el-table-column prop="wellName" label="所属井" width="100" />
        <el-table-column prop="runningHours" label="运行时长(h)" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastMaintenanceDate" label="上次维护日期" width="130" />
        <el-table-column prop="nextMaintenanceDate" label="下次维护日期" width="130">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isOverdue(row.nextMaintenanceDate) }">
              {{ row.nextMaintenanceDate }}
              <el-tag v-if="isOverdue(row.nextMaintenanceDate)" type="danger" size="small" class="ml-5">逾期</el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewMaintenanceRecords(row)">维护记录</el-button>
            <el-button type="success" size="small" link @click="openMaintenanceDialog(row)">维护登记</el-button>
            <el-button type="danger" size="small" link>删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>设备类型分布</span>
          </template>
          <div ref="typeChart" class="chart-medium"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>待维护设备提醒</span>
              <el-badge :value="overdueCount" class="item" type="danger" />
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-if="maintenanceList.length === 0"
              type="success"
            >
              <div class="timeline-content">
                <span class="content">暂无待维护设备</span>
              </div>
            </el-timeline-item>
            <el-timeline-item
              v-for="item in maintenanceList"
              :key="item.id"
              :timestamp="item.date"
              :type="item.type"
              @click="handleMaintenanceClick(item)"
              class="timeline-item"
            >
              <div class="timeline-content">
                <span class="equipment-name">{{ item.equipmentName }}</span>
                <span class="content">{{ item.content }}</span>
                <el-button type="primary" size="small" link @click.stop="openMaintenanceDialog(item)">立即维护</el-button>
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="maintenanceDialogVisible"
      title="维护登记"
      width="600px"
      :close-on-click-modal="false"
      @close="handleMaintenanceDialogClose"
    >
      <el-form :model="maintenanceForm" :rules="maintenanceRules" ref="maintenanceFormRef" label-width="100px">
        <el-form-item label="设备名称" prop="equipmentName">
          <el-input v-model="maintenanceForm.equipmentName" disabled />
        </el-form-item>
        <el-form-item label="设备编码" prop="equipmentCode">
          <el-input v-model="maintenanceForm.equipmentCode" disabled />
        </el-form-item>
        <el-form-item label="维护类型" prop="maintenanceType">
          <el-select v-model="maintenanceForm.maintenanceType" placeholder="请选择维护类型">
            <el-option label="常规维护" value="常规维护" />
            <el-option label="故障维修" value="故障维修" />
            <el-option label="定期保养" value="定期保养" />
            <el-option label="紧急维修" value="紧急维修" />
          </el-select>
        </el-form-item>
        <el-form-item label="维护日期" prop="maintenanceDate">
          <el-date-picker
            v-model="maintenanceForm.maintenanceDate"
            type="date"
            placeholder="选择维护日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="维护人员" prop="maintenancePerson">
          <el-input v-model="maintenanceForm.maintenancePerson" placeholder="请输入维护人员" />
        </el-form-item>
        <el-form-item label="维护内容" prop="maintenanceContent">
          <el-input
            v-model="maintenanceForm.maintenanceContent"
            type="textarea"
            :rows="4"
            placeholder="请详细描述维护内容"
          />
        </el-form-item>
        <el-form-item label="维护结果" prop="maintenanceResult">
          <el-radio-group v-model="maintenanceForm.maintenanceResult">
            <el-radio label="完成">完成</el-radio>
            <el-radio label="进行中">进行中</el-radio>
            <el-radio label="待跟进">待跟进</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="维护费用" prop="cost">
          <el-input-number v-model="maintenanceForm.cost" :min="0" :precision="2" placeholder="元" />
        </el-form-item>
        <el-form-item label="下次维护日期" prop="nextMaintenanceDate">
          <el-date-picker
            v-model="maintenanceForm.nextMaintenanceDate"
            type="date"
            placeholder="选择下次维护日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="maintenanceForm.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintenanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMaintenance" :loading="submitLoading">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="recordDialogVisible"
      title="维护记录"
      width="800px"
    >
      <div class="record-info">
        <span class="label">设备名称：</span>
        <span class="value">{{ liveEquipment?.equipmentName }}</span>
        <span class="label ml-20">设备编码：</span>
        <span class="value">{{ liveEquipment?.equipmentCode }}</span>
        <span class="label ml-20">当前状态：</span>
        <el-tag :type="getStatusType(liveEquipment?.status || '')" size="small">{{ liveEquipment?.status || '-' }}</el-tag>
      </div>
      <el-table :data="currentMaintenanceRecords" border stripe style="width: 100%; margin-top: 15px;" empty-text="暂无维护记录">
        <el-table-column prop="maintenanceDate" label="维护日期" width="120" />
        <el-table-column prop="maintenanceType" label="维护类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getMaintenanceTypeColor(row.maintenanceType)" size="small">{{ row.maintenanceType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maintenancePerson" label="维护人员" width="100" />
        <el-table-column prop="maintenanceContent" label="维护内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="maintenanceResult" label="维护结果" width="100">
          <template #default="{ row }">
            <el-tag :type="getResultColor(row.maintenanceResult)" size="small">{{ row.maintenanceResult }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cost" label="费用(元)" width="100">
          <template #default="{ row }">
            {{ row.cost || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="recordDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import * as echarts from 'echarts'
import type { MaintenanceRecord } from '@/api/equipment'

const typeChart = ref<HTMLElement>()
const loading = ref(false)
const submitLoading = ref(false)
const maintenanceDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const maintenanceFormRef = ref<FormInstance>()
// 标记本次弹窗是否已提交成功，成功后不再保存草稿
const maintenanceSubmitted = ref(false)

const currentEquipment = ref<any>(null)

const filterForm = reactive({
  equipmentName: '',
  equipmentType: '',
  status: '',
  dateRange: [] as string[]
})

const maintenanceForm = reactive({
  equipmentId: null as number | null,
  equipmentName: '',
  equipmentCode: '',
  maintenanceType: '',
  maintenanceDate: '',
  maintenancePerson: '',
  maintenanceContent: '',
  maintenanceResult: '',
  cost: 0,
  nextMaintenanceDate: '',
  remark: ''
})

const maintenanceRules: FormRules = {
  maintenanceType: [{ required: true, message: '请选择维护类型', trigger: 'change' }],
  maintenanceDate: [
    { required: true, message: '请选择维护日期', trigger: 'change' },
    {
      validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
        if (!value) return callback()
        const target = new Date(value)
        if (Number.isNaN(target.getTime())) {
          return callback(new Error('维护日期格式无效'))
        }
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        target.setHours(0, 0, 0, 0)
        if (target.getTime() > today.getTime()) {
          return callback(new Error('维护日期不能晚于今天'))
        }
        callback()
      },
      trigger: 'change'
    }
  ],
  maintenancePerson: [{ required: true, message: '请输入维护人员', trigger: 'blur' }],
  maintenanceContent: [{ required: true, message: '请输入维护内容', trigger: 'blur' }],
  maintenanceResult: [{ required: true, message: '请选择维护结果', trigger: 'change' }],
  nextMaintenanceDate: [
    { required: true, message: '请选择下次维护日期', trigger: 'change' },
    {
      validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
        if (!value) return callback()
        const target = new Date(value)
        if (Number.isNaN(target.getTime())) {
          return callback(new Error('下次维护日期格式无效'))
        }
        if (maintenanceForm.maintenanceDate && target.getTime() <= new Date(maintenanceForm.maintenanceDate).getTime()) {
          return callback(new Error('下次维护日期需晚于维护日期'))
        }
        callback()
      },
      trigger: 'change'
    }
  ]
}

const equipmentStats = computed(() => {
  const stats = { total: equipmentList.value.length, running: 0, maintenance: 0, fault: 0 }
  equipmentList.value.forEach(item => {
    if (item.status === '运行中') stats.running++
    else if (item.status === '待维护') stats.maintenance++
    else if (item.status === '故障') stats.fault++
  })
  return stats
})

const equipmentList = ref([
  { id: 1, equipmentCode: 'PUMP-001', equipmentName: '抽油机A1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'A井场1号', wellName: 'A-01井', runningHours: 8520, status: '运行中', lastMaintenanceDate: '2024-01-10', nextMaintenanceDate: '2024-02-10' },
  { id: 2, equipmentCode: 'PUMP-002', equipmentName: '抽油机B3', equipmentType: '抽油机', model: 'CYJ10-3-53HB', installLocation: 'B井场3号', wellName: 'B-03井', runningHours: 6350, status: '运行中', lastMaintenanceDate: '2024-01-05', nextMaintenanceDate: '2024-02-05' },
  { id: 3, equipmentCode: 'VALVE-001', equipmentName: '阀门组C2', equipmentType: '阀门', model: 'Z41H-16C DN100', installLocation: 'C井场2号', wellName: 'C-02井', runningHours: 12500, status: '待维护', lastMaintenanceDate: '2023-12-20', nextMaintenanceDate: '2024-01-20' },
  { id: 4, equipmentCode: 'SENSOR-001', equipmentName: '压力传感器D5', equipmentType: '传感器', model: 'PT-300', installLocation: 'D井场5号', wellName: 'D-05井', runningHours: 3200, status: '故障', lastMaintenanceDate: '2023-11-15', nextMaintenanceDate: '2023-12-15' },
  { id: 5, equipmentCode: 'MOTOR-001', equipmentName: '电机E1', equipmentType: '电机', model: 'Y2-315M-4', installLocation: 'E井场1号', wellName: 'E-01井', runningHours: 9800, status: '运行中', lastMaintenanceDate: '2024-01-08', nextMaintenanceDate: '2024-02-08' },
  { id: 6, equipmentCode: 'PUMP-003', equipmentName: '抽油机C1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'C井场1号', wellName: 'C-01井', runningHours: 7200, status: '待维护', lastMaintenanceDate: '2023-11-25', nextMaintenanceDate: '2023-12-25' },
  { id: 7, equipmentCode: 'VALVE-002', equipmentName: '阀门组A3', equipmentType: '阀门', model: 'Z41H-16C DN80', installLocation: 'A井场3号', wellName: 'A-03井', runningHours: 9500, status: '运行中', lastMaintenanceDate: '2024-01-12', nextMaintenanceDate: '2024-02-12' }
])

const REMIND_SOON_DAYS = 7

// 待维护提醒统一从设备列表派生，保证与统计卡片、表格状态始终一致
const maintenanceList = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return equipmentList.value
    .filter(item => item.status !== '停机')
    .map(item => {
      const nextDate = new Date(item.nextMaintenanceDate)
      nextDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((nextDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

      let type = 'primary'
      let content = '即将到期维护'
      if (item.status === '故障') {
        type = 'danger'
        content = '故障待维修'
      } else if (diffDays < 0) {
        type = 'danger'
        content = '已逾期，请尽快安排维护'
      } else if (item.status === '待维护') {
        type = 'warning'
        content = '到期需要进行常规维护'
      }
      return { id: item.id, date: item.nextMaintenanceDate, equipmentName: item.equipmentName, equipmentCode: item.equipmentCode, content, type, diffDays }
    })
    .filter(item => item.type === 'danger' || item.type === 'warning' || item.diffDays <= REMIND_SOON_DAYS)
    .sort((a, b) => a.diffDays - b.diffDays)
})

const maintenanceRecords = ref<MaintenanceRecord[]>([
  { id: 1, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '常规维护', maintenanceDate: '2024-01-10', maintenancePerson: '张三', maintenanceContent: '检查润滑油、紧固螺丝、清洁设备表面', maintenanceResult: '完成', cost: 500, remark: '运行正常' },
  { id: 2, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '定期保养', maintenanceDate: '2023-10-15', maintenancePerson: '李四', maintenanceContent: '更换油封、检查皮带张力', maintenanceResult: '完成', cost: 1200, remark: '皮带磨损正常' },
  { id: 3, equipmentId: 3, equipmentName: '阀门组C2', equipmentCode: 'VALVE-001', maintenanceType: '常规维护', maintenanceDate: '2023-12-20', maintenancePerson: '王五', maintenanceContent: '阀门开关测试、密封检查', maintenanceResult: '完成', cost: 200, remark: '一切正常' }
])

// 记录弹窗始终展示设备列表中的最新状态，避免列表更新后弹窗仍显示旧值
const liveEquipment = computed(() => {
  if (!currentEquipment.value) return null
  return equipmentList.value.find(e => e.id === currentEquipment.value.id) || currentEquipment.value
})

// 记录弹窗只展示当前设备的维护记录
const currentMaintenanceRecords = computed(() =>
  currentEquipment.value
    ? maintenanceRecords.value.filter(r => r.equipmentId === currentEquipment.value.id)
    : []
)

const overdueCount = computed(() => {
  return maintenanceList.value.filter(item => item.type === 'danger').length
})

const filteredEquipmentList = computed(() => {
  let result = [...equipmentList.value]
  
  if (filterForm.equipmentName) {
    result = result.filter(item => 
      item.equipmentName.includes(filterForm.equipmentName)
    )
  }
  
  if (filterForm.equipmentType) {
    result = result.filter(item => 
      item.equipmentType === filterForm.equipmentType
    )
  }
  
  if (filterForm.status) {
    result = result.filter(item => 
      item.status === filterForm.status
    )
  }
  
  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    const [start, end] = filterForm.dateRange
    result = result.filter(item => {
      const nextDate = new Date(item.nextMaintenanceDate)
      return nextDate >= new Date(start) && nextDate <= new Date(end)
    })
  }
  
  return result
})

const getStatusType = (status: string) => {
  const map: Record<string, any> = {
    '运行中': 'success',
    '待维护': 'warning',
    '故障': 'danger',
    '停机': 'info'
  }
  return map[status] || 'info'
}

const getMaintenanceTypeColor = (type: string) => {
  const map: Record<string, any> = {
    '常规维护': 'info',
    '故障维修': 'danger',
    '定期保养': 'success',
    '紧急维修': 'warning'
  }
  return map[type] || 'info'
}

const getResultColor = (result: string) => {
  const map: Record<string, any> = {
    '完成': 'success',
    '进行中': 'warning',
    '待跟进': 'danger'
  }
  return map[result] || 'info'
}

const isOverdue = (date: string) => {
  if (!date) return false
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}

const handleFilter = () => {
  console.log('Filter applied:', filterForm)
}

const resetFilter = () => {
  filterForm.equipmentName = ''
  filterForm.equipmentType = ''
  filterForm.status = ''
  filterForm.dateRange = []
}

const filterByStatus = (status: string) => {
  filterForm.status = status
  handleFilter()
}

// 按设备暂存未提交的登记草稿（费用、备注等），取消或中断后再次进入不丢失
const maintenanceDrafts = new Map<number, typeof maintenanceForm>()

const formatDate = (time: number) => {
  const d = new Date(time)
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

const resetMaintenanceForm = (row: any) => {
  maintenanceForm.equipmentId = row.id
  maintenanceForm.equipmentName = row.equipmentName
  maintenanceForm.equipmentCode = row.equipmentCode
  maintenanceForm.maintenanceType = ''
  maintenanceForm.maintenanceDate = formatDate(Date.now())
  maintenanceForm.maintenancePerson = ''
  maintenanceForm.maintenanceContent = ''
  maintenanceForm.maintenanceResult = ''
  maintenanceForm.cost = 0
  maintenanceForm.nextMaintenanceDate = formatDate(Date.now() + 30 * 24 * 60 * 60 * 1000)
  maintenanceForm.remark = ''
}

const openMaintenanceDialog = (row: any) => {
  const equipment = equipmentList.value.find(e => e.id === row.id)
  if (!equipment) {
    ElMessage.error('设备维护数据不存在或已被删除，无法登记维护')
    return
  }

  const draft = maintenanceDrafts.get(equipment.id)
  if (draft) {
    Object.assign(maintenanceForm, draft)
  } else {
    resetMaintenanceForm(equipment)
  }

  maintenanceDialogVisible.value = true
  maintenanceSubmitted.value = false
  // 恢复草稿时清除上一次的校验提示
  maintenanceFormRef.value?.clearValidate()
}

// 模拟提交：网络失败 / 业务失败 / 响应结构异常都会走 reject
const mockSubmitMaintenance = (record: MaintenanceRecord): Promise<{ code: number; data: MaintenanceRecord }> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const rand = Math.random()
      if (rand < 0.06) {
        reject(new Error('网络异常，维护登记提交失败，请稍后重试'))
        return
      }
      if (rand < 0.11) {
        reject(new Error('服务器繁忙，维护登记未保存，请重试'))
        return
      }
      if (rand < 0.16) {
        // 模拟响应体异常（如网关返回非预期内容）
        resolve({ code: 500, data: record })
        return
      }
      resolve({ code: 200, data: record })
    }, 500)
  })
}

const buildMaintenanceRecord = (): MaintenanceRecord => ({
  id: Date.now(),
  equipmentId: maintenanceForm.equipmentId!,
  equipmentName: maintenanceForm.equipmentName,
  equipmentCode: maintenanceForm.equipmentCode,
  maintenanceType: maintenanceForm.maintenanceType,
  maintenanceDate: maintenanceForm.maintenanceDate,
  maintenancePerson: maintenanceForm.maintenancePerson,
  maintenanceContent: maintenanceForm.maintenanceContent,
  maintenanceResult: maintenanceForm.maintenanceResult,
  cost: maintenanceForm.cost,
  remark: maintenanceForm.remark,
  nextMaintenanceDate: maintenanceForm.nextMaintenanceDate,
  createdAt: new Date().toISOString()
})

const submitMaintenance = async () => {
  if (!maintenanceFormRef.value) return

  try {
    await maintenanceFormRef.value.validate()
  } catch {
    // 表单未通过校验（含日期超出范围），保留填写内容供修改后重试
    return
  }

  const equipment = equipmentList.value.find(e => e.id === maintenanceForm.equipmentId)
  if (!equipment) {
    ElMessage.error('设备维护数据不存在或已被删除，无法提交维护登记')
    return
  }

  const newRecord = buildMaintenanceRecord()
  submitLoading.value = true
  try {
    const res = await mockSubmitMaintenance(newRecord)
    if (!res || res.code !== 200 || !res.data) {
      throw new Error('维护登记响应异常，请重试')
    }

    maintenanceRecords.value.unshift(newRecord)

    // 更新维护日期
    equipment.lastMaintenanceDate = maintenanceForm.maintenanceDate
    equipment.nextMaintenanceDate = maintenanceForm.nextMaintenanceDate

    // 仅当状态真正发生变化时才更新（统计由设备列表派生，自动同步）
    const oldStatus = equipment.status
    let newStatus = oldStatus
    if (maintenanceForm.maintenanceResult === '完成') {
      newStatus = '运行中'
    } else if (maintenanceForm.maintenanceResult === '进行中' || maintenanceForm.maintenanceResult === '待跟进') {
      newStatus = '待维护'
    }
    if (oldStatus !== newStatus) {
      equipment.status = newStatus
    }

    // 提交成功后清除该设备的草稿
    maintenanceDrafts.delete(equipment.id)

    ElMessage.success('维护登记成功！')
    maintenanceSubmitted.value = true
    maintenanceDialogVisible.value = false
  } catch (error: any) {
    // 提交失败 / 响应异常：说明原因，弹窗与已填内容保留，允许直接重试
    ElMessage.error(error?.message || '维护登记提交失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// 关闭弹窗（取消/成功）时暂存草稿，防止中断后费用、备注丢失；已提交成功则不再保存
const handleMaintenanceDialogClose = () => {
  if (!maintenanceSubmitted.value && maintenanceForm.equipmentId != null && submitLoading.value === false) {
    maintenanceDrafts.set(maintenanceForm.equipmentId, { ...maintenanceForm })
  }
}

const viewMaintenanceRecords = (row: any) => {
  currentEquipment.value = row
  recordDialogVisible.value = true
}

const handleMaintenanceClick = (item: any) => {
  console.log('Clicked reminder:', item)
}

const initChart = () => {
  if (!typeChart.value) return
  const chart = echarts.init(typeChart.value)
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    series: [{
      name: '设备类型',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: [
        { value: 68, name: '抽油机', itemStyle: { color: '#3b82f6' } },
        { value: 42, name: '阀门', itemStyle: { color: '#22c55e' } },
        { value: 25, name: '传感器', itemStyle: { color: '#f59e0b' } },
        { value: 12, name: '电机', itemStyle: { color: '#ef4444' } },
        { value: 9, name: '其他', itemStyle: { color: '#8b5cf6' } }
      ]
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

onMounted(() => {
  initChart()
})
</script>

<style scoped lang="scss">
.equipment-container {
  width: 100%;
}

.stat-card {
  padding: 25px;
  border-radius: 8px;
  background: #fff;
  text-align: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.12);
  }
  
  &.running {
    .stat-value {
      color: #22c55e;
    }
  }
  
  &.maintenance {
    .stat-value {
      color: #f59e0b;
    }
  }
  
  &.fault {
    .stat-value {
      color: #ef4444;
    }
  }
  
  .stat-value {
    font-size: 36px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
  }
  
  .stat-label {
    font-size: 14px;
    color: #64748b;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.filter-form {
  padding: 10px 0;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 0;
  
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.chart-medium {
  width: 100%;
  height: 300px;
}

.text-danger {
  color: #ef4444;
}

.ml-5 {
  margin-left: 5px;
}

.ml-10 {
  margin-left: 10px;
}

.ml-20 {
  margin-left: 20px;
}

.mb-20 {
  margin-bottom: 20px;
}

.timeline-item {
  cursor: pointer;
  
  &:hover {
    .timeline-content {
      background: #f8fafc;
    }
  }
}

.timeline-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  padding: 5px 0;
  border-radius: 4px;
  transition: background 0.3s;
  
  .equipment-name {
    font-weight: 600;
    margin-right: 10px;
  }
  
  .content {
    color: #64748b;
    margin-right: 10px;
  }
}

.record-info {
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  
  .label {
    color: #64748b;
  }
  
  .value {
    font-weight: 600;
    color: #1e293b;
  }
}

.item {
  margin-left: 10px;
}
</style>
