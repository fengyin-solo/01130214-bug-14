import type { Equipment, MaintenanceRecord } from './equipment'

/**
 * ⚠️ 演示用前端 Mock 接口层
 * 当前项目没有可用后端，设备与维护记录接口由本模块在本地模拟，
 * 并按 MOCK_ERROR_RATE 随机制造“提交失败 / 响应异常”，用于验证错误提示与重试。
 * 接入真实后端时：将页面中的 getMockEquipmentList / addMockMaintenanceRecord /
 * getMockMaintenanceRecords 替换为 api/equipment.ts 中的同名真实接口，
 * 并把 MOCK_ERROR_RATE 置为 0（或直接删除本文件）。
 */
const MOCK_ERROR_RATE = 0.15
const REQUEST_LATENCY = 500

const EQUIPMENT_KEY = 'mock-equipment-list'
const RECORDS_KEY = 'mock-maintenance-records'

const seedEquipmentList: Equipment[] = [
  { id: 1, equipmentCode: 'PUMP-001', equipmentName: '抽油机A1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'A井场1号', wellName: 'A-01井', runningHours: 8520, status: '运行中', lastMaintenanceDate: '2026-09-01', nextMaintenanceDate: '2026-09-30' },
  { id: 2, equipmentCode: 'PUMP-002', equipmentName: '抽油机B3', equipmentType: '抽油机', model: 'CYJ10-3-53HB', installLocation: 'B井场3号', wellName: 'B-03井', runningHours: 6350, status: '运行中', lastMaintenanceDate: '2026-08-25', nextMaintenanceDate: '2026-09-25' },
  { id: 3, equipmentCode: 'VALVE-001', equipmentName: '阀门组C2', equipmentType: '阀门', model: 'Z41H-16C DN100', installLocation: 'C井场2号', wellName: 'C-02井', runningHours: 12500, status: '待维护', lastMaintenanceDate: '2026-08-20', nextMaintenanceDate: '2026-09-10' },
  { id: 4, equipmentCode: 'SENSOR-001', equipmentName: '压力传感器D5', equipmentType: '传感器', model: 'PT-300', installLocation: 'D井场5号', wellName: 'D-05井', runningHours: 3200, status: '故障', lastMaintenanceDate: '2026-07-15', nextMaintenanceDate: '2026-08-15' },
  { id: 5, equipmentCode: 'MOTOR-001', equipmentName: '电机E1', equipmentType: '电机', model: 'Y2-315M-4', installLocation: 'E井场1号', wellName: 'E-01井', runningHours: 9800, status: '运行中', lastMaintenanceDate: '2026-09-05', nextMaintenanceDate: '2026-09-22' },
  { id: 6, equipmentCode: 'PUMP-003', equipmentName: '抽油机C1', equipmentType: '抽油机', model: 'CYJ12-4.8-73HB', installLocation: 'C井场1号', wellName: 'C-01井', runningHours: 7200, status: '待维护', lastMaintenanceDate: '2026-08-10', nextMaintenanceDate: '2026-09-20' },
  { id: 7, equipmentCode: 'VALVE-002', equipmentName: '阀门组A3', equipmentType: '阀门', model: 'Z41H-16C DN80', installLocation: 'A井场3号', wellName: 'A-03井', runningHours: 9500, status: '运行中', lastMaintenanceDate: '2026-09-12', nextMaintenanceDate: '2026-09-26' }
]

const seedMaintenanceRecords: MaintenanceRecord[] = [
  { id: 1, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '常规维护', maintenanceDate: '2026-09-01', maintenancePerson: '张三', maintenanceContent: '检查润滑油、紧固螺丝、清洁设备表面', maintenanceResult: '完成', cost: 500, remark: '运行正常', createdAt: '2026-09-01T10:00:00.000Z' },
  { id: 2, equipmentId: 1, equipmentName: '抽油机A1', equipmentCode: 'PUMP-001', maintenanceType: '定期保养', maintenanceDate: '2026-06-15', maintenancePerson: '李四', maintenanceContent: '更换油封、检查皮带张力', maintenanceResult: '完成', cost: 1200, remark: '皮带磨损正常', createdAt: '2026-06-15T10:00:00.000Z' },
  { id: 3, equipmentId: 3, equipmentName: '阀门组C2', equipmentCode: 'VALVE-001', maintenanceType: '常规维护', maintenanceDate: '2026-08-20', maintenancePerson: '王五', maintenanceContent: '阀门开关测试、密封检查', maintenanceResult: '完成', cost: 200, remark: '一切正常', createdAt: '2026-08-20T10:00:00.000Z' }
]

function readStorage<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // 本地缓存损坏时回退到种子数据
  }
  localStorage.setItem(key, JSON.stringify(seed))
  return JSON.parse(JSON.stringify(seed)) as T
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

/** 模拟网络往返，并随机抛出网络异常 / 服务端响应异常 */
function mockRequest<T>(handler: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < MOCK_ERROR_RATE) {
        const isNetworkError = Math.random() < 0.5
        reject(new Error(isNetworkError ? '网络连接异常，请稍后重试' : '服务端响应异常（HTTP 500），请稍后重试'))
        return
      }
      try {
        resolve(handler())
      } catch (e) {
        reject(e instanceof Error ? e : new Error('未知异常'))
      }
    }, REQUEST_LATENCY + Math.random() * 300)
  })
}

export const getMockEquipmentList = (): Promise<Equipment[]> => {
  return mockRequest(() => readStorage(EQUIPMENT_KEY, seedEquipmentList))
}

export const saveMockEquipmentList = (list: Equipment[]): Promise<void> => {
  return mockRequest(() => {
    writeStorage(EQUIPMENT_KEY, list)
  })
}

export const getMockMaintenanceRecords = (equipmentId?: number): Promise<MaintenanceRecord[]> => {
  return mockRequest(() => {
    const all = readStorage(RECORDS_KEY, seedMaintenanceRecords)
    const list = equipmentId != null
      ? all.filter(r => r.equipmentId === equipmentId)
      : all
    // 最新维护记录排在最前
    return [...list].sort((a, b) => (b.maintenanceDate || '').localeCompare(a.maintenanceDate || ''))
  })
}

export const addMockMaintenanceRecord = (data: MaintenanceRecord): Promise<MaintenanceRecord> => {
  return mockRequest(() => {
    if (!data || !data.equipmentId || !data.maintenanceDate) {
      throw new Error('维护登记数据不完整')
    }
    const all = readStorage(RECORDS_KEY, seedMaintenanceRecords)
    const record: MaintenanceRecord = {
      ...data,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    writeStorage(RECORDS_KEY, [record, ...all])
    return record
  })
}
