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
        <template #empty>
          <div v-if="listError" class="table-state">
            <el-alert :title="`设备列表加载失败：${listError}`" type="error" :closable="false" show-icon />
            <el-button type="primary" size="small" style="margin-top: 12px;" @click="loadEquipmentList">重试</el-button>
          </div>
          <el-empty v-else description="暂无设备数据" />
        </template>
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
          <el-timeline v-if="maintenanceReminders.length">
            <el-timeline-item
              v-for="item in maintenanceReminders"
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
          <el-empty v-else description="暂无待维护提醒" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="maintenanceDialogVisible"
      title="维护登记"
      width="600px"
      :close-on-click-modal="false"
      :before-close="handleMaintenanceDialogClose"
      @closed="handleMaintenanceDialogClosed"
    >
      <el-alert
        v-if="submitError"
        :title="submitError"
        type="error"
        show-icon
        :closable="false"
        class="mb-20"
      />
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
            :disabled-date="disableFutureDate"
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
        <el-button @click="maintenanceDialogVisible = false" :disabled="submitLoading">取消</el-button>
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
        <span class="value">{{ currentEquipment?.equipmentName }}</span>
        <span class="label ml-20">设备编码：</span>
        <span class="value">{{ currentEquipment?.equipmentCode }}</span>
      </div>
      <el-table :data="maintenanceRecords" border stripe v-loading="recordsLoading" style="width: 100%; margin-top: 15px;">
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
        <template #empty>
          <div v-if="recordsError" class="table-state">
            <el-alert :title="`维护记录加载失败：${recordsError}`" type="error" :closable="false" show-icon />
            <el-button
              type="primary"
              size="small"
              style="margin-top: 12px;"
              @click="currentEquipment && loadMaintenanceRecords(currentEquipment.id)"
            >
              重试
            </el-button>
          </div>
          <el-empty v-else description="该设备暂无维护记录" />
        </template>
      </el-table>
      <template #footer>
        <el-button @click="recordDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import * as echarts from 'echarts'
import type { Equipment, MaintenanceRecord } from '@/api/equipment'
import {
  getMockEquipmentList,
  saveMockEquipmentList,
  getMockMaintenanceRecords,
  addMockMaintenanceRecord
} from '@/api/equipmentMock'

/** 维护结果 -> 设备状态 的映射 */
const RESULT_STATUS_MAP: Record<string, Equipment['status']> = {
  '完成': '运行中',
  '进行中': '待维护',
  '待跟进': '故障'
}

interface MaintenanceReminder {
  id: number
  equipmentCode: string
  equipmentName: string
  date: string
  content: string
  type: 'primary' | 'warning' | 'danger'
}

const typeChart = ref<HTMLElement>()
const loading = ref(false)
const listError = ref('')
const submitLoading = ref(false)
const submitError = ref('')
const recordsLoading = ref(false)
const recordsError = ref('')
const maintenanceDialogVisible = ref(false)
const recordDialogVisible = ref(false)
const maintenanceFormRef = ref<FormInstance>()

const currentEquipment = ref<Equipment | null>(null)

const filterForm = reactive({
  equipmentName: '',
  equipmentType: '',
  status: '',
  dateRange: [] as string[]
})

interface MaintenanceFormState {
  equipmentId: number | null
  equipmentName: string
  equipmentCode: string
  maintenanceType: string
  maintenanceDate: string
  maintenancePerson: string
  maintenanceContent: string
  maintenanceResult: string
  cost: number
  nextMaintenanceDate: string
  remark: string
}

const createDefaultForm = (): MaintenanceFormState => ({
  equipmentId: null,
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

const maintenanceForm = reactive<MaintenanceFormState>(createDefaultForm())

/** 本地日期工具：统一使用 YYYY-MM-DD 字符串，避免 toISOString 的时区偏移 */
const pad2 = (n: number) => `${n}`.padStart(2, '0')
const formatDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const todayStr = () => formatDate(new Date())
const addDays = (dateStr: string, days: number) => {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

const validateMaintenanceDate = (_rule: any, value: string, callback: (e?: Error) => void) => {
  if (!value) return callback()
  if (value > todayStr()) {
    return callback(new Error('维护日期不能晚于今天，请重新选择'))
  }
  if (maintenanceForm.nextMaintenanceDate && value >= maintenanceForm.nextMaintenanceDate) {
    return callback(new Error('维护日期需早于下次维护日期'))
  }
  callback()
}

const validateNextMaintenanceDate = (_rule: any, value: string, callback: (e?: Error) => void) => {
  if (!value) return callback()
  if (maintenanceForm.maintenanceDate && value <= maintenanceForm.maintenanceDate) {
    return callback(new Error('下次维护日期需晚于本次维护日期，请重新选择'))
  }
  callback()
}

const maintenanceRules: FormRules = {
  maintenanceType: [{ required: true, message: '请选择维护类型', trigger: 'change' }],
  maintenanceDate: [
    { required: true, message: '请选择维护日期', trigger: 'change' },
    { validator: validateMaintenanceDate, trigger: 'change' }
  ],
  maintenancePerson: [{ required: true, message: '请输入维护人员', trigger: 'blur' }],
  maintenanceContent: [{ required: true, message: '请输入维护内容', trigger: 'blur' }],
  maintenanceResult: [{ required: true, message: '请选择维护结果', trigger: 'change' }],
  nextMaintenanceDate: [
    { required: true, message: '请选择下次维护日期', trigger: 'change' },
    { validator: validateNextMaintenanceDate, trigger: 'change' }
  ]
}

const equipmentList = ref<Equipment[]>([])

const maintenanceRecords = ref<MaintenanceRecord[]>([])

/* ---------------- 统计卡片：唯一数据源为设备列表，禁止手工增减 ---------------- */
const equipmentStats = computed(() => ({
  total: equipmentList.value.length,
  running: equipmentList.value.filter(e => e.status === '运行中').length,
  maintenance: equipmentList.value.filter(e => e.status === '待维护').length,
  fault: equipmentList.value.filter(e => e.status === '故障').length
}))

const isOverdue = (date: string) => !!date && date < todayStr()

/* ---------------- 待维护提醒：同样从设备列表派生，保证与卡片、列表一致 ---------------- */
const maintenanceReminders = computed<MaintenanceReminder[]>(() => {
  const today = todayStr()
  const soon = addDays(today, 7)
  const items: MaintenanceReminder[] = []

  for (const e of equipmentList.value) {
    const next = e.nextMaintenanceDate
    let type: MaintenanceReminder['type'] | null = null
    let content = ''

    if (e.status === '故障') {
      type = 'danger'
      content = '故障待维修'
    } else if (next && next < today) {
      type = 'danger'
      content = '已逾期，请尽快安排维护'
    } else if (e.status === '待维护') {
      type = 'warning'
      content = '到期需要进行常规维护'
    } else if (next && next <= soon) {
      type = 'primary'
      content = '即将到期维护'
    }

    if (type) {
      items.push({
        id: e.id!,
        equipmentCode: e.equipmentCode,
        equipmentName: e.equipmentName,
        date: next,
        content,
        type
      })
    }
  }

  // 逾期/故障排最前，其余按下次维护日期升序
  return items.sort((a, b) => {
    const aDanger = a.type === 'danger' ? 0 : 1
    const bDanger = b.type === 'danger' ? 0 : 1
    if (aDanger !== bDanger) return aDanger - bDanger
    return (a.date || '').localeCompare(b.date || '')
  })
})

/** 逾期提醒角标：与时间线中的 danger 条目严格一致 */
const overdueCount = computed(() =>
  maintenanceReminders.value.filter(item => item.type === 'danger').length
)

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
    result = result.filter(item =>
      item.nextMaintenanceDate >= start && item.nextMaintenanceDate <= end
    )
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

const disableFutureDate = (d: Date) =>
  d.getTime() > new Date(`${todayStr()}T23:59:59`).getTime()

const handleFilter = () => {
  // 筛选由 computed 自动完成
}

const resetFilter = () => {
  filterForm.equipmentName = ''
  filterForm.equipmentType = ''
  filterForm.status = ''
  filterForm.dateRange = []
}

const filterByStatus = (status: string) => {
  filterForm.status = status
}

/* ---------------- 维护登记草稿：中断/取消后再次进入不丢失费用与备注 ---------------- */
const draftKey = (equipmentId: number | null) =>
  `equipment-maintenance-draft-${equipmentId}`

watch(maintenanceForm, (val) => {
  // 仅在登记弹窗打开、且已绑定设备时持久化；
  // 弹窗关闭后的残留赋值不写回，恢复草稿时回写的是同一份数据，幂等无副作用
  if (!maintenanceDialogVisible.value || val.equipmentId == null) return
  localStorage.setItem(draftKey(val.equipmentId), JSON.stringify(val))
}, { deep: true })

const openMaintenanceDialog = (row: Partial<Equipment> & { id?: number }) => {
  const equipment = equipmentList.value.find(e => e.id === row.id)
  const target = equipment || (row as Equipment)

  submitError.value = ''
  // 先重置为默认值，防止上一台设备的数据串入
  Object.assign(maintenanceForm, createDefaultForm(), {
    equipmentId: target.id ?? null,
    equipmentName: target.equipmentName ?? '',
    equipmentCode: target.equipmentCode ?? '',
    maintenanceDate: todayStr(),
    nextMaintenanceDate: addDays(todayStr(), 30)
  })

  // 恢复该设备上次未提交成功的草稿（含费用、备注等全部字段）
  let restored = false
  if (target.id != null) {
    try {
      const raw = localStorage.getItem(draftKey(target.id))
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft && draft.equipmentId === target.id) {
          Object.assign(maintenanceForm, draft)
          restored = true
        }
      }
    } catch {
      // 草稿损坏时忽略，使用默认表单
    }
  }

  maintenanceDialogVisible.value = true
  maintenanceFormRef.value?.clearValidate()
  if (restored) ElMessage.info('已恢复上次未提交的维护登记内容，请确认后重新提交')
}

const handleMaintenanceDialogClose = (done: () => void) => {
  // 提交进行中禁止误关闭导致中断
  if (submitLoading.value) return
  done()
}

const handleMaintenanceDialogClosed = () => {
  // 草稿已在 watch 中保存；关闭后仅清理校验态，不清除草稿，便于再次进入恢复
  submitError.value = ''
  maintenanceFormRef.value?.clearValidate()
}

const submitMaintenance = async () => {
  if (!maintenanceFormRef.value || maintenanceForm.equipmentId == null) return

  try {
    await maintenanceFormRef.value.validate()
  } catch {
    // 校验未通过（含日期超出范围）：保留全部输入，用户修改后可直接重试
    return
  }

  submitLoading.value = true
  submitError.value = ''

  const payload: MaintenanceRecord = {
    equipmentId: maintenanceForm.equipmentId,
    equipmentName: maintenanceForm.equipmentName,
    equipmentCode: maintenanceForm.equipmentCode,
    maintenanceType: maintenanceForm.maintenanceType,
    maintenanceDate: maintenanceForm.maintenanceDate,
    maintenancePerson: maintenanceForm.maintenancePerson,
    maintenanceContent: maintenanceForm.maintenanceContent,
    maintenanceResult: maintenanceForm.maintenanceResult,
    cost: maintenanceForm.cost,
    remark: maintenanceForm.remark
  }

  try {
    const savedRecord = await addMockMaintenanceRecord(payload)

    // 记录接口成功后，再更新设备状态——只有状态真正发生变化时才改写，
    // 统计卡片与提醒由 computed 自动重算，无需（也不允许）手工加减
    const equipment = equipmentList.value.find(e => e.id === payload.equipmentId)
    if (equipment) {
      const nextStatus = RESULT_STATUS_MAP[payload.maintenanceResult]
      const statusChanged = !!nextStatus && equipment.status !== nextStatus
      if (statusChanged) {
        equipment.status = nextStatus
      }
      // 仅“完成”的维护才滚动维护日期，未完成的登记不改变排期
      if (payload.maintenanceResult === '完成') {
        equipment.lastMaintenanceDate = payload.maintenanceDate
        equipment.nextMaintenanceDate = maintenanceForm.nextMaintenanceDate
      }
      await saveMockEquipmentList(equipmentList.value)
    }

    // 同步本地已加载的记录（记录弹窗若正打开同一设备可立即看到）
    maintenanceRecords.value = [
      savedRecord,
      ...maintenanceRecords.value.filter(r => r.id !== savedRecord.id)
    ]

    localStorage.removeItem(draftKey(payload.equipmentId))
    ElMessage.success('维护登记成功！')
    maintenanceDialogVisible.value = false
  } catch (e: any) {
    // 提交失败 / 响应异常：说明原因，表单与草稿原样保留，允许重试
    const reason = e?.message || '响应异常，请稍后重试'
    submitError.value = `维护登记提交失败：${reason}。已保留您填写的内容（含费用与备注），可直接修改后重试。`
    ElMessage.error(submitError.value)
  } finally {
    submitLoading.value = false
  }
}

/* ---------------- 维护记录弹窗：加载 / 空态 / 失败重试 ---------------- */
const loadEquipmentList = async () => {
  loading.value = true
  listError.value = ''
  try {
    equipmentList.value = await getMockEquipmentList()
  } catch (e: any) {
    listError.value = e?.message || '响应异常'
  } finally {
    loading.value = false
  }
}

const loadMaintenanceRecords = async (equipmentId: number) => {
  recordsLoading.value = true
  recordsError.value = ''
  maintenanceRecords.value = []
  try {
    maintenanceRecords.value = await getMockMaintenanceRecords(equipmentId)
  } catch (e: any) {
    recordsError.value = e?.message || '响应异常，请稍后重试'
  } finally {
    recordsLoading.value = false
  }
}

const viewMaintenanceRecords = async (row: Equipment) => {
  currentEquipment.value = row
  recordDialogVisible.value = true
  await loadMaintenanceRecords(row.id!)
  // 关闭弹窗返回列表后，统计卡片与提醒均来自 equipmentList 的 computed，
  // 维护登记引发的变化会自动同步显示，无需额外刷新
}

const handleMaintenanceClick = (item: MaintenanceReminder) => {
  openMaintenanceDialog(item)
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
  loadEquipmentList()
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

.table-state {
  padding: 24px 0;
  text-align: center;

  .el-alert {
    max-width: 420px;
    margin: 0 auto;
  }
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
