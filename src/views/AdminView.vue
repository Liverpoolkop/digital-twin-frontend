<template>
  <div class="layout">
    <!-- ===== 侧边栏 ===== -->
    <aside class="sidebar">
      <div class="logo">
        <el-icon class="logo-icon"><Cpu /></el-icon>
        <span>数字孪生平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="side-menu"
        background-color="transparent"
        text-color="#a0b4cc"
        active-text-color="#4fc3f7"
        @select="onMenuSelect"
      >
        <el-menu-item index="experiment">
          <el-icon><Operation /></el-icon>
          <span>实验管理</span>
        </el-menu-item>
        <el-menu-item index="simulation">
          <el-icon><MagicStick /></el-icon>
          <span>仿真沙盒</span>
        </el-menu-item>
      </el-menu>

      <!-- 返回主页 / 退出 -->
      <div class="sidebar-footer">
        <el-button class="home-btn" size="small" @click="goHome">
          <el-icon><House /></el-icon> 返回主页
        </el-button>
        <el-button class="logout-btn" size="small" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon> 退出登录
        </el-button>
      </div>
    </aside>

    <!-- ===== 主区域 ===== -->
    <div class="main-wrapper">
      <!-- 顶部标题栏 -->
      <header class="topbar">
        <div class="topbar-title">
          <el-icon><Monitor /></el-icon>
          动物替代实验 · 数字孪生原型系统
        </div>
        <div class="topbar-info">
          <span class="topbar-user">
            <el-icon><User /></el-icon> {{ username }}
          </span>
          <el-tag type="success" effect="dark" round>系统运行中</el-tag>
          <span class="topbar-time">{{ currentTime }}</span>
        </div>
      </header>

      <main class="content">

        <!-- ===== 实验数据管理 ===== -->
        <section class="card" v-if="activeMenu === 'experiment'">
          <div class="card-header">
            <span class="card-title">
              <el-icon><List /></el-icon> 实验数据管理
            </span>
            <div class="card-actions">
              <el-input
                v-model="searchName"
                placeholder="按名称搜索..."
                style="width:200px; margin-right:12px;"
                clearable
                @clear="onSearch"
                @keyup.enter="onSearch"
                prefix-icon="Search"
              />
              <el-select
                v-model="listSort"
                placeholder="排序方式"
                style="width:168px; margin-right:12px;"
                @change="onSortChange"
              >
                <el-option
                  v-for="opt in SORT_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button type="primary" :icon="Plus" @click="openCreate">
                新增实验
              </el-button>
            </div>
          </div>

          <el-table
            :data="experiments"
            v-loading="loading"
            stripe
            style="width:100%"
            :header-cell-style="{ background: '#0d1f35', color: '#7ab3d0' }"
            :row-style="{ background: '#0a1828' }"
            :cell-style="{ color: '#c8dff0', borderColor: '#1e3a54' }"
          >
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="实验名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="实验动物" width="100">
              <template #default="{ row }">{{ animalLabel(row.animalType) }}</template>
            </el-table-column>
            <el-table-column prop="chemicalName"  label="化学物质" width="130" show-overflow-tooltip />
            <el-table-column prop="indicatorName" label="观测指标" width="140" show-overflow-tooltip />
            <el-table-column prop="description"   label="说明"    min-width="160" show-overflow-tooltip />
            <el-table-column prop="createdTime" label="创建时间" width="175">
              <template #default="{ row }">{{ formatTime(row.createdTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" text @click="launchSimFromExp(row)">
                  <el-icon><MagicStick /></el-icon> 发起仿真
                </el-button>
                <el-button size="small" type="primary" text @click="openEdit(row)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button size="small" type="danger" text @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="pageNum"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="onPageSizeChange"
              @current-change="fetchList"
            />
          </div>
        </section>

        <!-- ===== 数字孪生仿真沙盒 ===== -->
        <section v-if="activeMenu === 'simulation'" class="sim-section">
          <el-row :gutter="20" style="height:100%">

            <!-- 左侧：参数设置卡片 -->
            <el-col :span="9">
              <el-card class="sim-card" shadow="never">
                <template #header>
                  <div class="sim-card-header">
                    <el-icon class="sim-card-icon"><MagicStick /></el-icon>
                    <span>孪生实验参数设置</span>
                  </div>
                </template>

                <el-form
                  ref="simFormRef"
                  :model="simForm"
                  :rules="simRules"
                  label-position="top"
                  class="sim-form"
                >
                  <!-- 目标物种 -->
                  <el-form-item label="目标物种" prop="animalType">
                    <el-select v-model="simForm.animalType" placeholder="选择物种" style="width:100%">
                      <el-option label="🐭 小白鼠（MOUSE）"  value="MOUSE"  />
                      <el-option label="🐰 兔子（RABBIT）"   value="RABBIT" />
                      <el-option label="🐸 青蛙（FROG）"     value="FROG"   />
                    </el-select>
                  </el-form-item>

                  <!-- 化学物质（与训练语料一致的下拉） -->
                  <el-form-item label="化学物质名称" prop="chemicalName">
                    <el-select v-model="simForm.chemicalName" placeholder="选择化学物质" style="width:100%" filterable>
                      <el-option v-for="c in CHEMICAL_OPTIONS" :key="c" :label="c" :value="c" />
                    </el-select>
                  </el-form-item>

                  <!-- 观测指标 -->
                  <el-form-item label="观测指标" prop="indicatorName">
                    <el-select v-model="simForm.indicatorName" placeholder="选择指标名称" style="width:100%">
                      <el-option v-for="ind in INDICATOR_OPTIONS" :key="ind" :label="ind" :value="ind" />
                    </el-select>
                  </el-form-item>

                  <!-- 环境温度区间 -->
                  <el-form-item label="环境温度筛选范围（℃）" prop="tempRange">
                    <div class="slider-wrap">
                      <el-slider
                        v-model="simForm.tempRange"
                        range
                        :min="0"
                        :max="50"
                        :marks="tempMarks"
                        show-stops
                        style="margin: 10px 8px 0"
                      />
                      <div class="temp-range-label">
                        <span>筛选区间：{{ simForm.tempRange[0] }}℃ ~ {{ simForm.tempRange[1] }}℃</span>
                      </div>
                    </div>
                  </el-form-item>

                  <!-- 算法模型 -->
                  <el-form-item label="仿真算法模型" prop="algorithmModel">
                    <el-select v-model="simForm.algorithmModel" placeholder="选择算法" style="width:100%">
                      <el-option label="📈 简单线性回归（LINEAR）"        value="LINEAR"      />
                      <el-option label="📉 二次多项式回归（POLYNOMIAL）"  value="POLYNOMIAL"  />
                      <el-option label="🔬 受体饱和对数回归（LOGARITHMIC）" value="LOGARITHMIC" />
                    </el-select>
                  </el-form-item>

                  <!-- 目标预测剂量 -->
                  <el-form-item label="目标预测剂量（mg/kg）" prop="targetDosage">
                    <el-input-number
                      v-model="simForm.targetDosage"
                      :min="0.001"
                      :precision="3"
                      :step="0.5"
                      controls-position="right"
                      style="width:100%"
                    />
                  </el-form-item>

                  <el-button
                    class="sim-run-btn"
                    type="primary"
                    :loading="simLoading"
                    @click="runSimulation"
                  >
                    <el-icon v-if="!simLoading"><VideoPlay /></el-icon>
                    {{ simLoading ? '仿真计算中...' : '启动数字孪生计算' }}
                  </el-button>
                </el-form>
              </el-card>
            </el-col>

            <!-- 右侧：仿真结果卡片 -->
            <el-col :span="15">
              <el-card class="sim-card" shadow="never" style="height:100%">
                <template #header>
                  <div class="sim-card-header">
                    <el-icon class="sim-card-icon"><TrendCharts /></el-icon>
                    <span>仿真结果分析</span>
                  </div>
                </template>

                <!-- 空态提示 -->
                <div v-if="!simResult && !simLoading" class="sim-empty">
                  <el-icon class="sim-empty-icon"><MagicStick /></el-icon>
                  <p>请在左侧配置参数后</p>
                  <p>点击「启动数字孪生计算」</p>
                </div>

                <!-- 加载中 -->
                <div v-if="simLoading" class="sim-loading">
                  <div class="loading-rings">
                    <div class="ring ring-1" />
                    <div class="ring ring-2" />
                    <div class="ring ring-3" />
                  </div>
                  <p class="loading-text">数字孪生引擎计算中...</p>
                </div>

                <!-- 结果展示 -->
                <div v-if="simResult && !simLoading" class="sim-result">
                  <!-- 核心指标 -->
                  <div class="result-peak">
                    <div class="result-peak-label">
                      预测指标：{{ simResult.indicatorName || simForm.indicatorName || '生理指标' }}
                    </div>
                    <div class="result-peak-value">
                      {{ simResult.predictedValue }}
                      <span class="result-unit">{{ simResult.indicatorName || '' }}</span>
                    </div>
                    <div class="result-meta">
                      <el-tag size="small" type="success" effect="dark">{{ animalLabel(simResult.targetAnimal) }}</el-tag>
                      <el-tag size="small" type="info"    effect="dark">{{ simResult.targetChemical }}</el-tag>
                      <el-tag size="small" type="warning" effect="dark">{{ simResult.selectedModel }}</el-tag>
                    </div>
                  </div>
                  <!-- 衰减曲线图 -->
                  <div ref="simChartRef" class="sim-chart-box" />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </section>

      </main>
    </div>

    <!-- ===== 新增 / 编辑对话框 ===== -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑实验' : '新增实验'"
      width="500px"
      :close-on-click-modal="false"
      class="dark-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
        label-position="left"
      >
        <el-form-item label="实验名称" prop="name">
          <el-input v-model="form.name" placeholder="方案名称，如：小鼠乙醇肝毒性初筛" />
        </el-form-item>
        <el-form-item label="实验动物" prop="animalType">
          <el-select v-model="form.animalType" placeholder="选择实验动物" style="width:100%">
            <el-option label="小白鼠" value="MOUSE" />
            <el-option label="兔子"   value="RABBIT" />
            <el-option label="青蛙"   value="FROG" />
          </el-select>
        </el-form-item>
        <el-form-item label="化学物质" prop="chemicalName">
          <el-select v-model="form.chemicalName" placeholder="选择化学物质" style="width:100%">
            <el-option v-for="c in CHEMICAL_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="观测指标" prop="indicatorName">
          <el-select v-model="form.indicatorName" placeholder="选择观测指标" style="width:100%">
            <el-option v-for="ind in INDICATOR_OPTIONS" :key="ind" :label="ind" :value="ind" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选：方案说明" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ isEdit ? '保存修改' : '确认创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import {
  Plus, Edit, Delete, Refresh, Search, VideoPlay,
  Cpu, Operation, TrendCharts, Monitor, List,
  SwitchButton, User, MagicStick, House
} from '@element-plus/icons-vue'
import { experimentApi, simulationApi } from '../api/experiment.js'

const router = useRouter()
const username = localStorage.getItem('dt_username') || 'admin'

/** 化学物质下拉（与 dataset_raw 训练语料一致） */
const CHEMICAL_OPTIONS = ['乙醇', '丙酮', '十二烷基硫酸钠', '二甲苯']

/** 观测指标下拉（与 dataset_raw.indicator_name 枚举保持一致） */
const INDICATOR_OPTIONS = ['血清ALT(U/L)', '角膜刺激评分', '皮肤反应指数', '体重变化率(%)']

const animalLabel = type => {
  if (type === 'MOUSE')  return '小白鼠'
  if (type === 'RABBIT') return '兔子'
  if (type === 'FROG')   return '青蛙'
  return type || '-'
}

const goHome = () => {
  router.push('/')
}

// ─── 退出登录 ─────────────────────────────────────────
const handleLogout = async () => {
  await ElMessageBox.confirm('确定退出登录吗？', '提示', {
    confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning'
  })
  localStorage.removeItem('dt_token')
  localStorage.removeItem('dt_username')
  ElMessage.success('已退出登录')
  router.push('/login')
}

// ─── 时钟 ─────────────────────────────────────────────
const currentTime = ref('')
let clockTimer = null
const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false })
}
updateTime()
clockTimer = setInterval(updateTime, 1000)
onUnmounted(() => clearInterval(clockTimer))

// ─── 导航 ─────────────────────────────────────────────
const activeMenu = ref('experiment')

/** 为 true 时表示当前切到仿真页来自「发起仿真」按钮，不清除 experimentId */
let simLaunchFromTable = false

const onMenuSelect = (index) => {
  activeMenu.value = index
  if (index === 'simulation' && !simLaunchFromTable) {
    simForm.experimentId = null
  }
  simLaunchFromTable = false
}

// ─── 实验列表 ─────────────────────────────────────────
const experiments = ref([])

// ─── 列表（服务端排序 + 分页）──────────────────────────
const loading = ref(false)
const searchName = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
/** 格式 sortBy|order，与后端 sortBy、order 对应 */
const listSort = ref('id|asc')

const SORT_OPTIONS = [
  { label: 'ID 升序', value: 'id|asc' },
  { label: 'ID 降序', value: 'id|desc' },
  { label: '创建时间升序', value: 'createdTime|asc' },
  { label: '创建时间降序', value: 'createdTime|desc' }
]

const fetchList = async () => {
  loading.value = true
  try {
    const [sortBy, order] = listSort.value.split('|')
    const params = {
      sortBy,
      order,
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    const q = searchName.value?.trim()
    if (q) params.name = q
    const res = await experimentApi.list(params)
    if (res.code === 200 && res.data) {
      experiments.value = res.data.records ?? []
      total.value = Number(res.data.total) || 0
    } else {
      experiments.value = []
      total.value = 0
    }
  } catch {
    ElMessage.error('加载实验列表失败，请确认后端已启动')
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  pageNum.value = 1
  fetchList()
}

const onSortChange = () => {
  pageNum.value = 1
  fetchList()
}

const onPageSizeChange = () => {
  pageNum.value = 1
  fetchList()
}

const formatTime = t => (t ? t.replace('T', ' ').slice(0, 19) : '-')

// ─── 表单对话框 ───────────────────────────────────────
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const editId = ref(null)

const form = reactive({ name: '', animalType: '', chemicalName: '', indicatorName: '', description: '' })
const rules = {
  name:          [{ required: true, message: '请输入实验名称', trigger: 'blur' }],
  animalType:    [{ required: true, message: '请选择实验动物', trigger: 'change' }],
  chemicalName:  [{ required: true, message: '请选择化学物质', trigger: 'change' }],
  indicatorName: [{ required: true, message: '请选择观测指标', trigger: 'change' }]
}

const resetForm = () => Object.assign(form, { name: '', animalType: '', chemicalName: '', indicatorName: '', description: '' })

const openCreate = () => { isEdit.value = false; resetForm(); dialogVisible.value = true }

const openEdit = row => {
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, {
    name:          row.name,
    animalType:    row.animalType,
    chemicalName:  row.chemicalName,
    indicatorName: row.indicatorName,
    description:   row.description
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value) {
      await experimentApi.update(editId.value, { ...form })
      ElMessage.success('实验信息已更新')
    } else {
      await experimentApi.create({ ...form })
      ElMessage.success('实验创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async row => {
  await ElMessageBox.confirm(
    `确定要删除实验「${row.name}」吗？此操作不可撤销。`,
    '二次确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
  try {
    await experimentApi.remove(row.id)
    ElMessage.success('删除成功')
    await fetchList()
    if (experiments.value.length === 0 && pageNum.value > 1) {
      pageNum.value -= 1
      await fetchList()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(async () => {
  await fetchList()
})

onUnmounted(() => {
  simChartInstance?.dispose()
  window.removeEventListener('resize', () => {})
})

// ─────────────────────────────────────────────────────────────────────────────
// 数字孪生仿真沙盒
// ─────────────────────────────────────────────────────────────────────────────

const simFormRef  = ref(null)
const simChartRef = ref(null)
const simLoading  = ref(false)
const simResult   = ref(null)
let   simChartInstance = null

const simForm = reactive({
  experimentId:   null,
  animalType:     '',
  chemicalName:   '',
  indicatorName:  '',
  tempRange:      [15, 35],
  algorithmModel: '',
  targetDosage:   1.0
})

// 温度滑块刻度
const tempMarks = { 0: '0℃', 15: '15', 25: '25', 35: '35', 50: '50℃' }

const simRules = {
  animalType:     [{ required: true, message: '请选择目标物种',     trigger: 'change' }],
  chemicalName:   [{ required: true, message: '请选择化学物质',     trigger: 'change' }],
  indicatorName:  [{ required: true, message: '请选择观测指标',     trigger: 'change' }],
  algorithmModel: [{ required: true, message: '请选择仿真算法模型', trigger: 'change' }],
  targetDosage:   [{ required: true, message: '请输入目标预测剂量', trigger: 'change' }]
}

// 启动仿真
const runSimulation = async () => {
  await simFormRef.value.validate()
  simLoading.value = true
  simResult.value  = null

  try {
    const userId = Number(localStorage.getItem('dt_userId') || 1)
    const res = await simulationApi.run({
      userId,
      experimentId:   simForm.experimentId ?? undefined,
      animalType:     simForm.animalType,
      chemicalName:   simForm.chemicalName,
      indicatorName:  simForm.indicatorName,
      minTemp:        simForm.tempRange[0],
      maxTemp:        simForm.tempRange[1],
      algorithmModel: simForm.algorithmModel,
      targetDosage:   simForm.targetDosage
    })

    if (res.code === 200) {
      simResult.value = res.data
      ElMessage.success('仿真计算完成！')
      // 等 DOM 渲染（v-if 使图表容器重新挂载），再多一帧确保尺寸计算完成
      await nextTick()
      requestAnimationFrame(() => {
        renderSimChart(Number(res.data.predictedValue), res.data.indicatorName || simForm.indicatorName)
      })
    } else {
      ElMessage.error(res.message || '仿真引擎返回异常')
    }
  } catch {
    ElMessage.error('请求失败，请检查后端服务是否已启动')
  } finally {
    simLoading.value = false
  }
}

/**
 * 以预测峰值为起点，使用指数衰减公式模拟 12 小时药效衰减曲线：
 *   y(t) = peak * e^(-λ * t)
 * λ = 0.12 约等于半衰期 5.8h，可根据业务调整
 */
const renderSimChart = (peak, indicatorName) => {
  if (!simChartRef.value) return
  simChartInstance?.dispose()
  simChartInstance = echarts.init(simChartRef.value, 'dark')

  const LAMBDA = 0.12       // 衰减速率常数
  const HOURS  = 12         // 模拟总时长
  const STEP   = 0.5        // 采样步长（h）
  const xData  = []
  const yData  = []

  for (let t = 0; t <= HOURS; t += STEP) {
    xData.push(`${t.toFixed(1)}h`)
    yData.push(+(peak * Math.exp(-LAMBDA * t)).toFixed(4))
  }

  simChartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d2135',
      borderColor: '#1e4a6e',
      textStyle: { color: '#c8dff0' },
      formatter: (params) => {
        const p = params[0]
        return `时间：${p.name}<br/>指标值：<b style="color:#4fc3f7">${p.value}</b>`
      }
    },
    grid: { left: '4%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine:  { lineStyle: { color: '#1e3a54' } },
      axisLabel: { color: '#4a7fa5', fontSize: 11, interval: 3 }
    },
    yAxis: {
      type: 'value',
      name: indicatorName || '生理指标值',
      nameTextStyle: { color: '#4a7fa5', fontSize: 11 },
      splitLine: { lineStyle: { color: '#0f2d45', type: 'dashed' } },
      axisLabel: { color: '#4a7fa5' }
    },
    series: [{
      name: '药效衰减曲线',
      type: 'line',
      data: yData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: '#4fc3f7', width: 2.5 },
      itemStyle: { color: '#4fc3f7' },
      markPoint: {
        data: [{ type: 'max', name: '峰值', itemStyle: { color: '#81c784' } }]
      },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(79,195,247,0.35)' },
          { offset: 1, color: 'rgba(79,195,247,0.02)' }
        ])
      }
    }]
  })

  window.addEventListener('resize', () => simChartInstance?.resize())
}

// 切换到 simulation 时若有结果则重渲图表
watch(activeMenu, async (val) => {
  if (val === 'simulation' && simResult.value) {
    await nextTick()
    requestAnimationFrame(() => {
      renderSimChart(
        Number(simResult.value.predictedValue),
        simResult.value.indicatorName || simForm.indicatorName
      )
    })
  }
})

// ─── 从实验列表「发起仿真」：带入动物、化学物质，并关联 experiment_id（不写实验名称到化学物质） ───
const launchSimFromExp = (row) => {
  simLaunchFromTable = true
  simForm.experimentId   = row.id
  simForm.animalType     = row.animalType
  simForm.chemicalName   = row.chemicalName
  simForm.indicatorName  = row.indicatorName
  simForm.algorithmModel = ''
  simForm.tempRange      = [15, 35]
  simForm.targetDosage   = 1.0
  simResult.value        = null
  activeMenu.value       = 'simulation'
  ElMessage.info(`已关联方案「${row.name}」，已带入动物、化学物质与观测指标，请设置算法与剂量后启动仿真`)
}
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #061525;
  color: #c8dff0;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}

.layout { display: flex; height: 100vh; overflow: hidden; }

/* ─── 侧边栏 ─── */
.sidebar {
  width: 220px; min-width: 220px;
  background: linear-gradient(180deg, #0a1f38 0%, #071525 100%);
  border-right: 1px solid #1e3a54;
  display: flex; flex-direction: column;
}
.logo {
  display: flex; align-items: center; gap: 10px;
  padding: 22px 20px; font-size: 15px; font-weight: 700;
  color: #4fc3f7; border-bottom: 1px solid #1e3a54; letter-spacing: 0.5px;
}
.logo-icon { font-size: 22px; }
.side-menu { flex: 1; border-right: none !important; padding-top: 10px; }
.el-menu-item { border-radius: 6px !important; margin: 2px 10px !important; transition: background 0.2s !important; }
.el-menu-item.is-active { background: rgba(79,195,247,0.12) !important; border-left: 3px solid #4fc3f7; }

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #1e3a54;
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: stretch;
}
.home-btn,
.logout-btn {
  flex: 1;
  min-width: 0;
  padding: 8px 6px !important;
  background: transparent !important;
}
.home-btn {
  border: 1px solid rgba(79,195,247,0.35) !important;
  color: #4fc3f7 !important;
}
.home-btn:hover { background: rgba(79,195,247,0.1) !important; }
.logout-btn {
  border: 1px solid rgba(255,100,100,0.3) !important;
  color: #ff7070 !important;
}
.logout-btn:hover { background: rgba(255,100,100,0.1) !important; }

/* ─── 主区域 ─── */
.main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar {
  height: 58px;
  background: linear-gradient(90deg, #0a1f38, #0d2a47);
  border-bottom: 1px solid #1e3a54;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; flex-shrink: 0;
}
.topbar-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; color: #e0f3ff; letter-spacing: 1px; }
.topbar-info { display: flex; align-items: center; gap: 16px; }
.topbar-user { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #4fc3f7; }
.topbar-time { font-size: 13px; color: #5a8fab; font-variant-numeric: tabular-nums; }
.content { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

/* ─── 通用卡片 ─── */
.card {
  background: linear-gradient(135deg, #0d2135 0%, #091a2e 100%);
  border: 1px solid #1e3a54; border-radius: 12px; padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: #a0c8e8; }
.card-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #1a3550;
}
.table-pagination :deep(.el-pagination) {
  --el-pagination-text-color: #7ab3d0;
  --el-pagination-button-color: #c8dff0;
}
.table-pagination :deep(.el-pagination__total),
.table-pagination :deep(.el-input__inner) {
  color: #7ab3d0 !important;
}

/* ─── 表格 ─── */
.el-table { background: transparent !important; border-radius: 8px; overflow: hidden; }
.el-table tr { background: transparent !important; }
.el-table--striped .el-table__body tr.el-table__row--striped td { background: rgba(255,255,255,0.025) !important; }
.el-table__border-left-patch,.el-table__inner-wrapper::before,.el-table__inner-wrapper::after { display: none !important; }
.el-table td, .el-table th { border-bottom: 1px solid #1a3550 !important; }

/* ─── 对话框 ─── */
.dark-dialog .el-dialog { background: #0d2135 !important; border: 1px solid #1e3a54; border-radius: 12px; }
.dark-dialog .el-dialog__title { color: #c8dff0; }
.dark-dialog .el-dialog__headerbtn .el-dialog__close { color: #5a8fab; }
.dark-dialog .el-form-item__label { color: #7ab3d0; }
.dark-dialog .el-input__wrapper,
.dark-dialog .el-textarea__inner,
.dark-dialog .el-select .el-input__wrapper { background: #061525 !important; box-shadow: 0 0 0 1px #1e3a54 inset !important; }
.dark-dialog .el-input__inner,.dark-dialog .el-textarea__inner { color: #c8dff0 !important; }
.dark-dialog .el-dialog__footer { border-top: 1px solid #1e3a54; }

/* ─── 全局 ─── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #07192b; }
::-webkit-scrollbar-thumb { background: #1e3a54; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2e5a7e; }
.el-button--primary { background-color: #1976a8 !important; border-color: #1976a8 !important; }
.el-button--primary:hover { background-color: #4fc3f7 !important; border-color: #4fc3f7 !important; color: #061525 !important; }

/* ─── 仿真沙盒布局 ─── */
.sim-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.sim-section .el-row { flex: 1; }
.sim-section .el-col { display: flex; flex-direction: column; }

/* Element Plus el-card 深色覆盖 */
.sim-card {
  flex: 1;
  background: linear-gradient(135deg, #0d2135 0%, #091a2e 100%) !important;
  border: 1px solid rgba(79,195,247,0.18) !important;
  border-radius: 14px !important;
}
.sim-card :deep(.el-card__header) {
  background: rgba(79,195,247,0.06);
  border-bottom: 1px solid rgba(79,195,247,0.15);
  padding: 14px 20px;
}
.sim-card :deep(.el-card__body) { padding: 20px; height: calc(100% - 53px); }

.sim-card-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 600; color: #a0c8e8;
}
.sim-card-icon { font-size: 18px; color: #4fc3f7; }

/* 表单深色覆盖 */
.sim-form :deep(.el-form-item__label) { color: #7ab3d0; font-size: 13px; }
.sim-form :deep(.el-input__wrapper),
.sim-form :deep(.el-select .el-input__wrapper),
.sim-form :deep(.el-input-number .el-input__wrapper) {
  background: rgba(2,13,26,0.7) !important;
  box-shadow: 0 0 0 1px rgba(79,195,247,0.2) inset !important;
}
.sim-form :deep(.el-input__wrapper:hover),
.sim-form :deep(.el-input__wrapper.is-focus),
.sim-form :deep(.el-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4fc3f7 inset !important;
}
.sim-form :deep(.el-input__inner),
.sim-form :deep(.el-input-number .el-input__inner) { color: #c8dff0 !important; }
.sim-form :deep(.el-input-number__decrease),
.sim-form :deep(.el-input-number__increase) { background: #0d2135 !important; border-color: #1e3a54 !important; color: #4fc3f7 !important; }

/* 滑块 */
.slider-wrap { padding: 0 4px; }
.sim-form :deep(.el-slider__runway) { background: #1e3a54 !important; }
.sim-form :deep(.el-slider__bar) { background: linear-gradient(90deg, #1565a8, #4fc3f7) !important; }
.sim-form :deep(.el-slider__button) { border-color: #4fc3f7 !important; }
.temp-range-label { text-align: center; font-size: 12px; color: #4fc3f7; margin-top: 8px; }

/* 启动按钮 */
.sim-run-btn {
  width: 100% !important;
  height: 46px !important;
  margin-top: 8px;
  background: linear-gradient(90deg, #0d4f8c, #1976d2) !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 15px !important;
  letter-spacing: 1px;
  box-shadow: 0 4px 20px rgba(79,195,247,0.25) !important;
  transition: box-shadow 0.25s !important;
}
.sim-run-btn:hover {
  background: linear-gradient(90deg, #1565a8, #4fc3f7) !important;
  box-shadow: 0 6px 28px rgba(79,195,247,0.5) !important;
}

/* 空态 */
.sim-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; gap: 10px;
  color: #2a4d6a; font-size: 14px;
}
.sim-empty-icon { font-size: 52px; color: #1e3a54; }

/* Loading 动画：三圈扩散 */
.sim-loading {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; gap: 24px;
}
.loading-rings { position: relative; width: 80px; height: 80px; }
.ring {
  position: absolute; border-radius: 50%; border: 2px solid transparent;
  border-top-color: #4fc3f7;
  animation: spin 1.4s linear infinite;
}
.ring-1 { inset: 0;     animation-duration: 1.4s; }
.ring-2 { inset: 10px;  animation-duration: 1.8s; border-top-color: #81c784; }
.ring-3 { inset: 20px;  animation-duration: 2.2s; border-top-color: #ffb74d; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #4fc3f7; font-size: 14px; letter-spacing: 2px; }

/* 结果展示 */
.sim-result { display: flex; flex-direction: column; height: 100%; gap: 16px; }
.result-peak {
  background: rgba(79,195,247,0.06);
  border: 1px solid rgba(79,195,247,0.2);
  border-radius: 10px;
  padding: 16px 20px;
  text-align: center;
}
.result-peak-label { font-size: 13px; color: #5a8fab; margin-bottom: 8px; letter-spacing: 1px; }
.result-peak-value {
  font-size: 40px; font-weight: 800;
  color: #4caf50;
  text-shadow: 0 0 20px rgba(76,175,80,0.4);
  line-height: 1.2;
}
.result-unit { font-size: 16px; font-weight: 400; color: #5a8fab; margin-left: 6px; }
.result-meta { display: flex; justify-content: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.sim-chart-box { flex: 1; min-height: 260px; }
</style>
