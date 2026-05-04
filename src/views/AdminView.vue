<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <el-icon class="logo-icon"><Cpu /></el-icon>
        <span>数字孪生平台</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :default-openeds="[]"
        class="side-menu"
        background-color="transparent"
        text-color="#a0b4cc"
        active-text-color="#4fc3f7"
        @select="onMenuSelect"
      >
        <el-menu-item index="experiment">
          <el-icon><Operation /></el-icon>
          <span>{{ isAdmin ? '实验审批与管理' : '我的实验' }}</span>
        </el-menu-item>

        <el-menu-item index="simulation" :disabled="!canOpenSimulationMenu">
          <el-icon><MagicStick /></el-icon>
          <span>仿真沙盒</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin" index="dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>监控统计</span>
        </el-menu-item>

        <el-menu-item v-if="isAdmin" index="comment">
          <el-icon><ChatLineRound /></el-icon>
          <span>评论管理</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <el-button class="home-btn" size="small" @click="goHome">
          <el-icon><House /></el-icon> 返回主页
        </el-button>
        <el-button class="logout-btn" size="small" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon> 退出登录
        </el-button>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="topbar">
        <div class="topbar-title">
          <el-icon><Monitor /></el-icon>
          动物替代实验 · 数字孪生原型系统
        </div>
        <div class="topbar-info">
          <span class="topbar-user">
            <el-icon><User /></el-icon> {{ username }}
          </span>
          <el-tag :type="isAdmin ? 'warning' : 'success'" effect="dark" round>
            {{ roleDisplay }}
          </el-tag>
          <el-tag type="success" effect="dark" round>系统运行中</el-tag>
          <span class="topbar-time">{{ currentTime }}</span>
        </div>
      </header>

      <main class="content">
        <section class="card" v-if="activeMenu === 'experiment'">
          <div class="card-header card-header-wrap">
            <div>
              <span class="card-title">
                <el-icon><List /></el-icon>
                {{ isAdmin ? '实验审批与管理' : '我的实验申请' }}
              </span>
              <p class="card-subtitle">
                {{ isAdmin
                  ? '管理员可查看全部实验，并对待审批实验执行通过或驳回。'
                  : '普通用户只能对草稿/驳回实验编辑或提交审批，只有审批通过后才能发起仿真。' }}
              </p>
            </div>
            <div class="card-actions">
              <el-input
                v-model="searchName"
                placeholder="按名称搜索..."
                style="width: 200px"
                clearable
                :prefix-icon="Search"
                @clear="onSearch"
                @keyup.enter="onSearch"
              />
              <el-select
                v-model="statusFilter"
                placeholder="状态筛选"
                clearable
                style="width: 160px"
                @change="onStatusFilterChange"
              >
                <el-option
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-select
                v-model="listSort"
                placeholder="排序方式"
                style="width: 168px"
                @change="onSortChange"
              >
                <el-option
                  v-for="opt in SORT_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
              <el-button type="primary" :icon="Plus" @click="openCreate">新增实验</el-button>
            </div>
          </div>

          <el-table
            :data="experiments"
            v-loading="loading"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: '#0d1f35', color: '#7ab3d0' }"
            :row-style="{ background: '#0a1828' }"
            :cell-style="{ color: '#c8dff0', borderColor: '#1e3a54' }"
          >
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="name" label="实验名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" effect="dark" round>
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="实验动物" width="100">
              <template #default="{ row }">{{ animalLabel(row.animalType) }}</template>
            </el-table-column>
            <el-table-column prop="chemicalName" label="化学物质" width="130" show-overflow-tooltip />
            <el-table-column label="观测指标" width="150" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.simulationMode === 'MULTI_ORGAN' ? '多器官' : row.indicatorName }}
              </template>
            </el-table-column>
            <el-table-column prop="reviewComment" label="审批意见" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ row.reviewComment || '-' }}</template>
            </el-table-column>
            <el-table-column label="时间" width="160"> 
              <template #default="{ row }">
                <div class="time-cell" style="font-size: 11px; line-height: 1.2;">
                  <div style="color: #7ab3d0">创建: {{ formatTime(row.createdTime).slice(5,16) }}</div>
                  <div style="color: #5a8fab">更新: {{ formatTime(row.updatedTime).slice(5,16) }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-group">
                  <el-button
                    v-if="canLaunchSimulation(row)"
                    size="small"
                    type="success"
                    text
                    @click="launchSimFromExp(row)"
                  >
                    <el-icon><MagicStick /></el-icon> 发起仿真
                  </el-button>

                  <el-button
                    v-if="canEditRow(row)"
                    size="small"
                    type="primary"
                    text
                    @click="openEdit(row)"
                  >
                    <el-icon><Edit /></el-icon> 编辑
                  </el-button>

                  <el-button
                    v-if="canDeleteRow(row)"
                    size="small"
                    type="danger"
                    text
                    @click="handleDelete(row)"
                  >
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>

                  <el-button
                    v-if="canSubmitRow(row)"
                    size="small"
                    type="warning"
                    text
                    @click="submitExperiment(row)"
                  >
                    <el-icon><Upload /></el-icon> 提交审批
                  </el-button>

                  <el-button
                    v-if="canApproveRow(row)"
                    size="small"
                    type="success"
                    text
                    @click="approveExperiment(row)"
                  >
                    <el-icon><Select /></el-icon> 通过
                  </el-button>

                  <el-button
                    v-if="canRejectRow(row)"
                    size="small"
                    type="warning"
                    text
                    @click="rejectExperiment(row)"
                  >
                    <el-icon><CloseBold /></el-icon> 驳回
                  </el-button>

                  <span v-if="!hasAnyAction(row)" class="action-placeholder">当前状态无可用操作</span>
                </div>
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

        <section v-if="activeMenu === 'simulation'" class="sim-section">
          <el-row :gutter="20" style="height: 100%">
            <el-col :span="9">
              <el-card class="sim-card" shadow="never">
                <template #header>
                  <div class="sim-card-header">
                    <el-icon class="sim-card-icon"><MagicStick /></el-icon>
                    <span>孪生实验参数设置</span>
                  </div>
                </template>

                <el-alert
                  v-if="!isAdmin"
                  class="sim-alert"
                  type="info"
                  :closable="false"
                  show-icon
                  :title="simulationAlertTitle"
                  :description="simulationAlertDescription"
                />

                <el-form
                  ref="simFormRef"
                  :model="simForm"
                  :rules="simRules"
                  label-position="top"
                  class="sim-form"
                >
                  <el-form-item label="关联实验">
                    <el-input :model-value="linkedExperimentLabel" disabled />
                  </el-form-item>

                  <el-form-item label="仿真模式">
                    <el-radio-group v-model="simMode">
                      <el-radio value="single">单指标仿真</el-radio>
                      <el-radio value="multi-organ">多器官协同仿真</el-radio>
                    </el-radio-group>
                  </el-form-item>

                  <el-form-item v-if="simMode === 'multi-organ'" label="目标器官" prop="organs">
                    <el-checkbox-group v-model="simForm.organs">
                      <el-checkbox label="Heart">心脏</el-checkbox>
                      <el-checkbox label="Liver">肝脏</el-checkbox>
                      <el-checkbox label="Lung">肺</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>

                  <el-form-item label="目标物种" prop="animalType">
                    <el-select v-model="simForm.animalType" placeholder="选择物种" style="width: 100%">
                      <el-option label="🐭 小白鼠（MOUSE）" value="MOUSE" />
                      <el-option label="🐰 兔子（RABBIT）" value="RABBIT" />
                      <el-option label="🐸 青蛙（FROG）" value="FROG" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="化学物质名称" prop="chemicalName">
                    <el-select v-model="simForm.chemicalName" placeholder="选择化学物质" style="width: 100%" filterable>
                      <el-option v-for="c in CHEMICAL_OPTIONS" :key="c" :label="c" :value="c" />
                    </el-select>
                  </el-form-item>

                  <el-form-item v-if="simMode === 'single'" label="观测指标" prop="indicatorName">
                    <el-select v-model="simForm.indicatorName" placeholder="选择指标名称" style="width: 100%">
                      <el-option v-for="ind in INDICATOR_OPTIONS" :key="ind" :label="ind" :value="ind" />
                    </el-select>
                  </el-form-item>

                  <el-form-item v-if="simMode === 'single'" label="环境温度筛选范围（℃）" prop="tempRange">
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

                  <el-form-item label="仿真算法模型" prop="algorithmModel">
                    <el-select v-model="simForm.algorithmModel" placeholder="选择算法" style="width: 100%">
                      <el-option label="📈 简单线性回归（LINEAR）" value="LINEAR" />
                      <el-option label="📉 二次多项式回归（POLYNOMIAL）" value="POLYNOMIAL" />
                      <el-option label="🔬 受体饱和对数回归（LOGARITHMIC）" value="LOGARITHMIC" />
                      <el-option label="🤖 AI智能预测（对比模式）" value="AI" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="目标预测剂量（mg/kg）" prop="targetDosage">
                    <el-input-number
                      v-model="simForm.targetDosage"
                      :min="0.001"
                      :precision="3"
                      :step="0.5"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>

                  <el-button
                    class="sim-run-btn"
                    type="primary"
                    :loading="simLoading"
                    :disabled="!canRunCurrentSimulation"
                    @click="simMode === 'single' ? runSimulation() : runMultiOrganSimulation()"
                  >
                    <el-icon v-if="!simLoading"><VideoPlay /></el-icon>
                    {{ simLoading ? '仿真计算中...' : (simMode === 'single' ? '启动数字孪生计算' : '启动多器官协同仿真') }}
                  </el-button>
                </el-form>
              </el-card>
            </el-col>

            <el-col :span="15">
              <el-card class="sim-card" shadow="never" style="height: 100%">
                <template #header>
                  <div class="sim-card-header">
                    <el-icon class="sim-card-icon"><TrendCharts /></el-icon>
                    <span>仿真结果分析</span>
                  </div>
                </template>

                <div v-if="!simResult && !simLoading" class="sim-empty">
                  <el-icon class="sim-empty-icon"><MagicStick /></el-icon>
                  <p v-if="isAdmin">请在左侧配置参数后点击「启动数字孪生计算」</p>
                  <template v-else>
                    <p>请先从已审批通过的实验中进入仿真</p>
                    <p>草稿、待审批、已驳回实验均不可直接仿真</p>
                  </template>
                </div>

                <div v-if="simLoading" class="sim-loading">
                  <div class="loading-rings">
                    <div class="ring ring-1" />
                    <div class="ring ring-2" />
                    <div class="ring ring-3" />
                  </div>
                  <p class="loading-text">数字孪生引擎计算中...</p>
                </div>
                <div v-if="(simResult || multiIndicatorAiResult) && !simLoading" class="sim-result">
                  <div v-if="simMode === 'single'" class="result-peak">
                    <div class="result-peak-label">
                      预测指标：{{ simResult.indicatorName || simForm.indicatorName || '生理指标' }}
                    </div>
                    <div class="result-peak-value">
                      {{ simResult.predictedValue }}
                      <span class="result-unit">{{ simResult.indicatorName || '' }}</span>
                    </div>
                    <div class="result-meta">
                      <el-tag size="small" type="success" effect="dark">{{ animalLabel(simResult.targetAnimal) }}</el-tag>
                      <el-tag size="small" type="info" effect="dark">{{ simResult.targetChemical }}</el-tag>
                      <el-tag size="small" type="warning" effect="dark">{{ simResult.selectedModel }}</el-tag>
                    </div>
                  </div>
                  <div v-else class="result-peak">
                    <div class="result-peak-label">多器官协同仿真结果</div>
                    <div class="result-meta">
                      <el-tag size="small" type="success" effect="dark">{{ animalLabel(simResult.targetAnimal) }}</el-tag>
                      <el-tag size="small" type="info" effect="dark">{{ simResult.targetChemical }}</el-tag>
                      <el-tag size="small" type="warning" effect="dark">{{ simResult.selectedModel }}</el-tag>
                      <el-tag size="small" type="primary" effect="dark">剂量: {{ simResult.targetDosage }} mg/kg</el-tag>
                    </div>
                  </div>

                  <!-- 器官受损评估热力图 -->
                  <div v-if="simMode === 'multi-organ' && simForm.algorithmModel !== 'AI' && simResult?.organDamageScores">
                    <div class="heatmap-title">
                      <el-icon><TrendCharts /></el-icon>
                      器官受损评估热力图
                    </div>
                    <OrganHeatmap :damage-scores="simResult.organDamageScores" />
                  </div>

                  <!-- AI模式器官受损评估热力图 -->
                  <div v-if="multiIndicatorAiResult?.organDamageScores" class="heatmap-section">
                    <div class="heatmap-title">
                      <el-icon><TrendCharts /></el-icon>
                      器官受损评估热力图
                    </div>
                    <OrganHeatmap :damage-scores="multiIndicatorAiResult.organDamageScores" />
                  </div>

                  <!-- 多指标AI对比模式：显示Tab切换 -->
                  <el-tabs v-if="multiIndicatorAiResult" v-model="activeIndicatorTab" type="card">
                    <el-tab-pane
                      v-for="(indicator, index) in multiIndicatorAiResult.indicators"
                      :key="index"
                      :label="indicator.indicatorName"
                      :name="String(index)"
                    >
                      <div :id="`indicator-chart-${index}`" class="sim-chart-box" />
                    </el-tab-pane>
                  </el-tabs>

                  <!-- 单指标模式：显示单个图表 -->
                  <div v-else ref="simChartRef" class="sim-chart-box" />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </section>

        <section v-if="activeMenu === 'dashboard' && isAdmin" class="card">
          <div class="card-header card-header-wrap">
            <div>
              <span class="card-title">
                <el-icon><DataAnalysis /></el-icon> 监控统计
              </span>
              <p class="card-subtitle">管理员可查看平台用户、仿真与审批核心指标。</p>
            </div>
            <div class="card-actions">
              <el-button :icon="Refresh" @click="fetchDashboardSummary">刷新</el-button>
            </div>
          </div>

          <div v-loading="dashboardLoading" class="summary-grid">
            <div class="summary-card">
              <div class="summary-label">用户总数</div>
              <div class="summary-value">{{ dashboardSummary.totalUsers ?? 0 }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">累计仿真次数</div>
              <div class="summary-value">{{ dashboardSummary.totalSimulations ?? 0 }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">近一周仿真</div>
              <div class="summary-value">{{ dashboardSummary.weeklySimulations ?? 0 }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">待审批实验</div>
              <div class="summary-value">{{ dashboardSummary.pendingExperimentApprovals ?? 0 }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">已通过实验</div>
              <div class="summary-value">{{ dashboardSummary.approvedExperiments ?? 0 }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">替代率</div>
              <div class="summary-value">{{ formatPercent(dashboardSummary.replacementRate) }}</div>
            </div>
          </div>
        </section>

        <section v-if="activeMenu === 'dataset' && isAdmin" class="card">
          <div class="card-header card-header-wrap">
            <div>
              <span class="card-title">
                <el-icon><Files /></el-icon> 训练数据集维护
              </span>
              <p class="card-subtitle">管理员可维护算法训练语料数据。</p>
            </div>
            <div class="card-actions">
              <el-select v-model="datasetFilters.animalType" clearable placeholder="物种" style="width: 140px" @change="onDatasetFilterChange">
                <el-option label="小白鼠" value="MOUSE" />
                <el-option label="兔子" value="RABBIT" />
                <el-option label="青蛙" value="FROG" />
              </el-select>
              <el-input
                v-model="datasetFilters.chemicalName"
                clearable
                placeholder="化学物质"
                style="width: 180px"
                @clear="onDatasetFilterChange"
                @keyup.enter="onDatasetFilterChange"
              />
              <el-input
                v-model="datasetFilters.indicatorName"
                clearable
                placeholder="观测指标"
                style="width: 180px"
                @clear="onDatasetFilterChange"
                @keyup.enter="onDatasetFilterChange"
              />
              <el-button :icon="Refresh" @click="fetchDatasetList">刷新</el-button>
              <el-button type="primary" :icon="Plus" @click="openDatasetCreate">新增数据</el-button>
            </div>
          </div>

          <el-table
            :data="datasets"
            v-loading="datasetLoading"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: '#0d1f35', color: '#7ab3d0' }"
            :row-style="{ background: '#0a1828' }"
            :cell-style="{ color: '#c8dff0', borderColor: '#1e3a54' }"
          >
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="物种" width="110">
              <template #default="{ row }">{{ animalLabel(row.animalType) }}</template>
            </el-table-column>
            <el-table-column prop="chemicalName" label="化学物质" min-width="140" show-overflow-tooltip />
            <el-table-column prop="indicatorName" label="观测指标" min-width="150" show-overflow-tooltip />
            <el-table-column prop="dosage" label="剂量(mg/kg)" width="120" />
            <el-table-column prop="indicatorValue" label="指标值" width="120" />
            <el-table-column prop="temperature" label="温度(℃)" width="100" />
            <el-table-column label="入库时间" width="175">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" text @click="openDatasetEdit(row)">
                  <el-icon><Edit /></el-icon> 编辑
                </el-button>
                <el-button size="small" type="danger" text @click="handleDatasetDelete(row)">
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="datasetPageNum"
              v-model:page-size="datasetPageSize"
              :total="datasetTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="onDatasetPageSizeChange"
              @current-change="fetchDatasetList"
            />
          </div>
        </section>

        <section v-if="activeMenu === 'comment' && isAdmin" class="card">
          <div class="card-header card-header-wrap">
            <div>
              <span class="card-title">
                <el-icon><ChatLineRound /></el-icon> 评论审核管理
              </span>
              <p class="card-subtitle">管理员可查看待审核评论，执行通过或驳回，并填写审核意见。</p>
            </div>
            <div class="card-actions">
              <el-input
                v-model="commentKeyword"
                placeholder="按内容关键词搜索"
                style="width: 220px"
                clearable
                :prefix-icon="Search"
                @clear="onCommentSearch"
                @keyup.enter="onCommentSearch"
              />
              <el-input-number
                v-model="commentExperimentId"
                :min="1"
                :step="1"
                controls-position="right"
                placeholder="实验ID"
                style="width: 160px"
              />
              <el-button type="primary" @click="onCommentSearch">查询</el-button>
              <el-button :icon="Refresh" @click="fetchCommentList">刷新</el-button>
            </div>
          </div>

          <el-table
            :data="commentRecords"
            v-loading="commentLoading"
            stripe
            style="width: 100%"
            :header-cell-style="{ background: '#0d1f35', color: '#7ab3d0' }"
            :row-style="{ background: '#0a1828' }"
            :cell-style="{ color: '#c8dff0', borderColor: '#1e3a54' }"
          >
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="nickname" label="发布用户" width="120">
              <template #default="{ row }">{{ row.nickname || '-' }}</template>
            </el-table-column>
            <el-table-column label="关联实验" width="100">
              <template #default="{ row }">{{ row.experimentId ? `#${row.experimentId}` : '-' }}</template>
            </el-table-column>
            <el-table-column label="回复对象" width="130">
              <template #default="{ row }">{{ row.replyToNickname ? `@${row.replyToNickname}` : '主评论' }}</template>
            </el-table-column>
            <el-table-column prop="content" label="评论内容" min-width="320" show-overflow-tooltip />
            <el-table-column label="时间" width="170">
              <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="success" text @click="approveComment(row)">
                  <el-icon><Select /></el-icon> 通过
                </el-button>
                <el-button size="small" type="warning" text @click="rejectComment(row)">
                  <el-icon><CloseBold /></el-icon> 驳回
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="table-pagination">
            <el-pagination
              v-model:current-page="commentPageNum"
              v-model:page-size="commentPageSize"
              :total="commentTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="onCommentPageSizeChange"
              @current-change="fetchCommentList"
            />
          </div>
        </section>
      </main>
    </div>

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
          <el-select v-model="form.animalType" placeholder="选择实验动物" style="width: 100%">
            <el-option label="小白鼠" value="MOUSE" />
            <el-option label="兔子" value="RABBIT" />
            <el-option label="青蛙" value="FROG" />
          </el-select>
        </el-form-item>
        <el-form-item label="化学物质" prop="chemicalName">
          <el-select v-model="form.chemicalName" placeholder="选择化学物质" style="width: 100%">
            <el-option v-for="c in CHEMICAL_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="仿真模式" prop="simulationMode">
          <el-radio-group v-model="form.simulationMode">
            <el-radio value="SINGLE">单指标仿真</el-radio>
            <el-radio value="MULTI_ORGAN">多器官协同仿真</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.simulationMode === 'SINGLE'" label="观测指标" prop="indicatorName">
          <el-select v-model="form.indicatorName" placeholder="选择观测指标" style="width: 100%">
            <el-option v-for="ind in INDICATOR_OPTIONS" :key="ind" :label="ind" :value="ind" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.simulationMode === 'MULTI_ORGAN'" label="目标器官" prop="targetOrgans">
          <el-checkbox-group v-model="form.targetOrgans">
            <el-checkbox label="Heart">心脏</el-checkbox>
            <el-checkbox label="Liver">肝脏</el-checkbox>
            <el-checkbox label="Lung">肺</el-checkbox>
          </el-checkbox-group>
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

    <el-dialog
      v-model="datasetDialogVisible"
      :title="datasetIsEdit ? '编辑数据集' : '新增数据集'"
      width="560px"
      :close-on-click-modal="false"
      class="dark-dialog"
    >
      <el-form
        ref="datasetFormRef"
        :model="datasetForm"
        :rules="datasetRules"
        label-width="110px"
        label-position="left"
      >
        <el-form-item label="实验物种" prop="animalType">
          <el-select v-model="datasetForm.animalType" placeholder="选择实验物种" style="width: 100%">
            <el-option label="小白鼠" value="MOUSE" />
            <el-option label="兔子" value="RABBIT" />
            <el-option label="青蛙" value="FROG" />
          </el-select>
        </el-form-item>
        <el-form-item label="化学物质" prop="chemicalName">
          <el-select v-model="datasetForm.chemicalName" placeholder="选择化学物质" style="width: 100%" filterable>
            <el-option v-for="c in CHEMICAL_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="给药剂量" prop="dosage">
          <el-input-number v-model="datasetForm.dosage" :min="0" :precision="3" :step="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="观测指标" prop="indicatorName">
          <el-select v-model="datasetForm.indicatorName" placeholder="选择观测指标" style="width: 100%">
            <el-option v-for="ind in INDICATOR_OPTIONS" :key="ind" :label="ind" :value="ind" />
          </el-select>
        </el-form-item>
        <el-form-item label="指标值" prop="indicatorValue">
          <el-input-number v-model="datasetForm.indicatorValue" :precision="4" :step="0.1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="环境温度" prop="temperature">
          <el-input-number v-model="datasetForm.temperature" :min="-50" :precision="2" :step="0.5" style="width: 100%" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="datasetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="datasetSubmitting" @click="submitDatasetForm">
          {{ datasetIsEdit ? '保存修改' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import OrganHeatmap from '../components/OrganHeatmap.vue'
import {
  Plus,
  Edit,
  Delete,
  Refresh,
  Search,
  VideoPlay,
  Cpu,
  Operation,
  TrendCharts,
  Monitor,
  List,
  SwitchButton,
  User,
  MagicStick,
  House,
  Upload,
  Select,
  CloseBold,
  DataAnalysis,
  Files,
  ChatLineRound
} from '@element-plus/icons-vue'
import {
  adminCommentApi,
  adminDashboardApi,
  adminDatasetApi,
  adminExperimentApi,
  experimentApi,
  simulationApi
} from '../api/experiment.js'

const router = useRouter()
const username = localStorage.getItem('dt_username') || '未命名用户'
const currentUserId = Number(localStorage.getItem('dt_userId') || 0)
const currentRole = (localStorage.getItem('dt_role') || 'USER').toUpperCase()
const isAdmin = computed(() => currentRole === 'ADMIN')
const roleDisplay = computed(() => (isAdmin.value ? '管理员' : '普通用户'))

const CHEMICAL_OPTIONS = ['乙醇', '丙酮', '十二烷基硫酸钠', '二甲苯']
const INDICATOR_OPTIONS = ['血清ALT(U/L)', '角膜刺激评分', '皮肤反应指数', '体重变化率(%)']
const STATUS_OPTIONS = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待审批', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const animalLabel = type => {
  if (type === 'MOUSE') return '小白鼠'
  if (type === 'RABBIT') return '兔子'
  if (type === 'FROG') return '青蛙'
  return type || '-'
}

const statusLabel = status => {
  if (status === 'DRAFT') return '草稿'
  if (status === 'PENDING') return '待审批'
  if (status === 'APPROVED') return '已通过'
  if (status === 'REJECTED') return '已驳回'
  return status || '-'
}

const statusTagType = status => {
  if (status === 'DRAFT') return 'info'
  if (status === 'PENDING') return 'warning'
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'info'
}

const isEditableStatus = status => status === 'DRAFT' || status === 'REJECTED'
const isApprovedExperiment = row => row?.status === 'APPROVED'
const isPendingExperiment = row => row?.status === 'PENDING'
const isOwner = row => Boolean(row?.submittedBy) && row.submittedBy === currentUserId

const goHome = () => {
  router.push('/')
}

const handleLogout = async () => {
  await ElMessageBox.confirm('确定退出登录吗？', '提示', {
    confirmButtonText: '退出',
    cancelButtonText: '取消',
    type: 'warning'
  })
  localStorage.removeItem('dt_token')
  localStorage.removeItem('dt_username')
  localStorage.removeItem('dt_userId')
  localStorage.removeItem('dt_role')
  ElMessage.success('已退出登录')
  router.push('/login')
}

const currentTime = ref('')
let clockTimer = null
const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false })
}
updateTime()
clockTimer = setInterval(updateTime, 1000)

const activeMenu = ref('experiment')
const linkedSimulationExperiment = ref(null)

const canOpenSimulationMenu = computed(() => true)

const canRunCurrentSimulation = computed(() => {
  if (isAdmin.value) return true
  return isApprovedExperiment(linkedSimulationExperiment.value)
})

const linkedExperimentLabel = computed(() => {
  if (!linkedSimulationExperiment.value) {
    return isAdmin.value ? '管理员模式：可直接配置仿真参数' : '当前未关联审批通过实验，可先浏览仿真沙盒'
  }
  return `${linkedSimulationExperiment.value.name}（${statusLabel(linkedSimulationExperiment.value.status)}）`
})

const simulationAlertTitle = computed(() => {
  if (isApprovedExperiment(linkedSimulationExperiment.value)) {
    return '当前已关联审批通过的实验，可继续配置算法与剂量。'
  }
  return '普通用户可进入仿真沙盒，但仍只能提交已审批通过的实验。'
})

const simulationAlertDescription = computed(() => {
  if (isApprovedExperiment(linkedSimulationExperiment.value)) {
    return '已自动带入实验动物、化学物质和观测指标。'
  }
  return '你可以先查看和填写仿真参数；真正提交仿真前，仍需先在“我的实验”中选择状态为“已通过”的实验。'
})

const onMenuSelect = async index => {
  activeMenu.value = index
  if (index === 'dashboard' && isAdmin.value) {
    await fetchDashboardSummary()
  }
  if (index === 'dataset' && isAdmin.value) {
    await fetchDatasetList()
  }
  if (index === 'comment' && isAdmin.value) {
    await fetchCommentList()
  }
}

const experiments = ref([])
const loading = ref(false)
const searchName = ref('')
const statusFilter = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
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
    if (statusFilter.value) params.status = statusFilter.value

    const res = await experimentApi.list(params)
    if (res.code === 200 && res.data) {
      experiments.value = res.data.records ?? []
      total.value = Number(res.data.total) || 0
    } else {
      experiments.value = []
      total.value = 0
      ElMessage.error(res.message || '加载实验列表失败')
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

const onStatusFilterChange = () => {
  pageNum.value = 1
  fetchList()
}

const onPageSizeChange = () => {
  pageNum.value = 1
  fetchList()
}

const formatTime = t => (t ? String(t).replace('T', ' ').slice(0, 19) : '-')
const formatPercent = value => (value == null ? '0%' : `${value}%`)

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const editId = ref(null)

const form = reactive({
  name: '',
  animalType: '',
  chemicalName: '',
  simulationMode: 'SINGLE',
  indicatorName: '',
  targetOrgans: [],
  description: '',
  simulationMode: 'SINGLE' // 【新增这一行】赋予默认值
})

watch(() => form.simulationMode, (newMode) => {
  if (newMode === 'MULTI_ORGAN') {
    form.indicatorName = '血清ALT(U/L)'
  }
})

const rules = {
  name: [{ required: true, message: '请输入实验名称', trigger: 'blur' }],
  animalType: [{ required: true, message: '请选择实验动物', trigger: 'change' }],
  chemicalName: [{ required: true, message: '请选择化学物质', trigger: 'change' }],
  simulationMode: [{ required: true, message: '请选择仿真模式', trigger: 'change' }],
  indicatorName: [{ required: true, message: '请选择观测指标', trigger: 'change' }]
}

const resetForm = () => {
  Object.assign(form, {
    name: '',
    animalType: '',
    chemicalName: '',
    simulationMode: 'SINGLE',
    indicatorName: '',
    targetOrgans: [],
    description: '',
    simulationMode: 'SINGLE' // 【新增这一行】清空表单时也恢复默认值
  })
  editId.value = null
}

const openCreate = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const canEditRow = row => isOwner(row) && isEditableStatus(row.status)
const canDeleteRow = row => isOwner(row) && isEditableStatus(row.status)
const canSubmitRow = row => isOwner(row) && isEditableStatus(row.status)
const canApproveRow = row => isAdmin.value && isPendingExperiment(row)
const canRejectRow = row => isAdmin.value && isPendingExperiment(row)
const canLaunchSimulation = row => (isAdmin.value ? true : isApprovedExperiment(row))
const hasAnyAction = row => [
  canLaunchSimulation(row),
  canEditRow(row),
  canDeleteRow(row),
  canSubmitRow(row),
  canApproveRow(row),
  canRejectRow(row)
].some(Boolean)

const openEdit = row => {
  if (!canEditRow(row)) {
    ElMessage.warning('当前实验状态不可编辑')
    return
  }
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, {
    name: row.name,
    animalType: row.animalType,
    chemicalName: row.chemicalName,
    simulationMode: row.simulationMode || 'SINGLE',
    indicatorName: row.indicatorName || '',
    targetOrgans: row.targetOrgans ? row.targetOrgans.split(',') : [],
    description: row.description || '',
    simulationMode: row.simulationMode || 'SINGLE' // 【新增这一行】
  })
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()

  // 手动验证模式相关字段
  if (form.simulationMode === 'SINGLE' && !form.indicatorName) {
    ElMessage.error('单指标模式必须选择观测指标')
    return
  }
  if (form.simulationMode === 'MULTI_ORGAN' && (!form.targetOrgans || form.targetOrgans.length === 0)) {
    ElMessage.error('多器官模式必须至少选择一个器官')
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: form.name,
      animalType: form.animalType,
      chemicalName: form.chemicalName,
      simulationMode: form.simulationMode,
      indicatorName: form.indicatorName,
      targetOrgans: form.simulationMode === 'MULTI_ORGAN' ? form.targetOrgans.join(',') : null,
      description: form.description
    }
    const res = isEdit.value
      ? await experimentApi.update(editId.value, payload)
      : await experimentApi.create(payload)

    if (res.code === 200) {
      ElMessage.success(isEdit.value ? '实验信息已更新' : '实验创建成功，当前状态为草稿')
      dialogVisible.value = false
      await fetchList()
    } else {
      ElMessage.error(res.message || '操作失败，请稍后重试')
    }
  } catch (err) {
    console.error('提交失败:', err)
    ElMessage.error('操作失败，请检查控制台查看详细错误')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async row => {
  if (!canDeleteRow(row)) {
    ElMessage.warning('当前实验状态不可删除')
    return
  }
  await ElMessageBox.confirm(
    `确定要删除实验「${row.name}」吗？此操作不可撤销。`,
    '二次确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
  try {
    const res = await experimentApi.remove(row.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      await fetchList()
      if (experiments.value.length === 0 && pageNum.value > 1) {
        pageNum.value -= 1
        await fetchList()
      }
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

const submitExperiment = async row => {
  if (!canSubmitRow(row)) {
    ElMessage.warning('只有草稿或已驳回实验可提交审批')
    return
  }
  try {
    const res = await experimentApi.submit(row.id)
    if (res.code === 200) {
      ElMessage.success('实验已提交审批')
      await fetchList()
    } else {
      ElMessage.error(res.message || '提交审批失败')
    }
  } catch {
    ElMessage.error('提交审批失败')
  }
}

const approveExperiment = async row => {
  try {
    const { value } = await ElMessageBox.prompt('可选填写审批意见', `通过实验「${row.name}」`, {
      confirmButtonText: '通过',
      cancelButtonText: '取消',
      inputPlaceholder: '如：方案完整，可以进入仿真阶段',
      inputValue: row.reviewComment || ''
    })
    const res = await adminExperimentApi.approve(row.id, value || '')
    if (res.code === 200) {
      ElMessage.success('已审批通过')
      await fetchList()
    } else {
      ElMessage.error(res.message || '审批失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error('审批失败')
    }
  }
}

const rejectExperiment = async row => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', `驳回实验「${row.name}」`, {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '如：缺少实验说明或参数不完整',
      inputValidator: val => (val && val.trim() ? true : '请填写驳回原因')
    })
    const res = await adminExperimentApi.reject(row.id, value.trim())
    if (res.code === 200) {
      ElMessage.success('已驳回实验')
      await fetchList()
    } else {
      ElMessage.error(res.message || '驳回失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error('驳回失败')
    }
  }
}

const simFormRef = ref(null)
const simChartRef = ref(null)
const simLoading = ref(false)
const simResult = ref(null)
let simChartInstance = null
let multiIndicatorChartInstances = [] // 多指标AI对比图表实例数组
const resizeChart = () => simChartInstance?.resize()

const simMode = ref('single')

// 器官到指标的映射关系
const organToIndicators = {
  'Heart': ['Heart_Rate'],
  'Liver': ['ALT', 'AST'],
  'Lung': ['Respiratory_Rate']
}

// 多指标AI对比结果
const multiIndicatorAiResult = ref(null)
const activeIndicatorTab = ref('0')
const renderedChartTabs = new Set() // 跟踪已渲染的图表

const simForm = reactive({
  experimentId: null,
  animalType: '',
  chemicalName: '',
  indicatorName: '',
  tempRange: [15, 35],
  algorithmModel: '',
  targetDosage: 1.0,
  organs: []
})

const tempMarks = { 0: '0℃', 15: '15', 25: '25', 35: '35', 50: '50℃' }

const simRules = {
  animalType: [{ required: true, message: '请选择目标物种', trigger: 'change' }],
  chemicalName: [{ required: true, message: '请选择化学物质', trigger: 'change' }],
  indicatorName: [{ required: true, message: '请选择观测指标', trigger: 'change' }],
  algorithmModel: [{ required: true, message: '请选择仿真算法模型', trigger: 'change' }],
  targetDosage: [{ required: true, message: '请输入目标预测剂量', trigger: 'change' }]
}

const resetSimulationForm = () => {
  simForm.experimentId = null
  simForm.animalType = ''
  simForm.chemicalName = ''
  simForm.indicatorName = ''
  simForm.tempRange = [15, 35]
  simForm.algorithmModel = ''
  simForm.targetDosage = 1.0
  simForm.organs = []
  simMode.value = 'single'
  linkedSimulationExperiment.value = null
  simResult.value = null
}

const runSimulation = async () => {
  if (!canRunCurrentSimulation.value) {
    ElMessage.warning('普通用户只能对审批通过的实验发起仿真')
    return
  }

  await simFormRef.value.validate()
  simLoading.value = true
  simResult.value = null

  try {
    const payload = {
      experimentId: simForm.experimentId ?? undefined,
      animalType: simForm.animalType,
      chemicalName: simForm.chemicalName,
      indicatorName: simForm.indicatorName,
      minTemp: simForm.tempRange[0],
      maxTemp: simForm.tempRange[1],
      algorithmModel: simForm.algorithmModel,
      targetDosage: simForm.targetDosage
    }

    // AI模式：调用AI对比接口
    if (simForm.algorithmModel === 'AI') {
      const res = await simulationApi.runAiComparison(payload)
      if (res.code === 200) {
        simResult.value = res.data
        ElMessage.success('AI对比模式仿真完成！')
        await nextTick()
        requestAnimationFrame(() => {
          renderAiComparisonChart(res.data, simForm.indicatorName)
        })
      } else {
        ElMessage.error(res.message || 'AI对比模式返回异常')
      }
    } else {
      // 传统模式：调用原有接口
      const res = await simulationApi.run(payload)
      if (res.code === 200) {
        simResult.value = res.data
        ElMessage.success('仿真计算完成！')
        await nextTick()
        requestAnimationFrame(() => {
          renderSimChart(Number(res.data.predictedValue), res.data.indicatorName || simForm.indicatorName)
        })
      } else {
        ElMessage.error(res.message || '仿真引擎返回异常')
      }
    }
  } catch {
    ElMessage.error('请求失败，请检查后端服务是否已启动')
  } finally {
    simLoading.value = false
  }
}

const runMultiOrganSimulation = async () => {
  if (!canRunCurrentSimulation.value) {
    ElMessage.warning('普通用户只能对审批通过的实验发起仿真')
    return
  }

  if (!simForm.organs || simForm.organs.length === 0) {
    ElMessage.warning('请至少选择一个目标器官')
    return
  }

  await simFormRef.value.validate()
  simLoading.value = true
  simResult.value = null
  multiIndicatorAiResult.value = null

  try {
    // AI模式：调用多指标AI对比接口
    if (simForm.algorithmModel === 'AI') {
      // 将器官转换为指标列表
      const indicatorNames = []
      simForm.organs.forEach(organ => {
        const indicators = organToIndicators[organ] || []
        indicatorNames.push(...indicators)
      })

      const res = await simulationApi.runMultiIndicatorAiComparison({
        animalType: simForm.animalType,
        chemicalName: simForm.chemicalName,
        indicatorNames: indicatorNames,
        targetDosage: simForm.targetDosage,
        minTemp: simForm.tempRange[0],
        maxTemp: simForm.tempRange[1]
      })

      if (res.code === 200) {//2222222222
        simResult.value = res.data; // 💡 必须赋值，用于开启外层 v-if 和显示头部标签
        multiIndicatorAiResult.value = res.data;
        activeIndicatorTab.value = '0'; // 💡 强制重置到第一个 Tab
        
        ElMessage.success('多指标AI对比完成！');
        await nextTick();
        // 3. 【关键】调用全量重置函数，清空之前的 Set 缓存
        requestAnimationFrame(() => {
          renderMultiIndicatorAiTabs(res.data);
        });
        // 延迟渲染，确保 DOM 已经根据数据生成
        setTimeout(() => {
          renderSingleIndicatorChart(0);
        }, 200);
      } else {
        ElMessage.error(res.message || '多指标AI对比返回异常')
      }
    } else {
      // 传统模式：调用原有多器官接口
      const res = await simulationApi.runMultiOrgan({
        experimentId: simForm.experimentId ?? undefined,
        targetAnimal: simForm.animalType,
        targetChemical: simForm.chemicalName,
        organs: simForm.organs,
        targetDosage: simForm.targetDosage,
        selectedModel: simForm.algorithmModel
      })

      if (res.code === 200) {
        simResult.value = res.data
        ElMessage.success('多器官仿真计算完成！')
        await nextTick()
        requestAnimationFrame(() => {
          renderMultiOrganCharts(res.data)
        })
      } else {
        ElMessage.error(res.message || '多器官仿真引擎返回异常')
      }
    }
  } catch {
    ElMessage.error('请求失败，请检查后端服务是否已启动')
  } finally {
    simLoading.value = false
  }
}

const renderSimChart = (peak, indicatorName) => {
  if (!simChartRef.value) return
  simChartInstance?.dispose()
  simChartInstance = echarts.init(simChartRef.value, 'dark')

  const LAMBDA = 0.12
  const HOURS = 12
  const STEP = 0.5
  const xData = []
  const yData = []

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
      formatter: params => {
        const p = params[0]
        return `时间：${p.name}<br/>指标值：<b style="color:#4fc3f7">${p.value}</b>`
      }
    },
    grid: { left: '4%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#1e3a54' } },
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
}

const renderAiComparisonChart = (data, indicatorName) => {
  if (!simChartRef.value) return
  simChartInstance?.dispose()
  simChartInstance = echarts.init(simChartRef.value, 'dark')

  // 提取x轴数据（时间点）
  const xData = []
  for (let t = 0; t <= 12; t += 0.5) {
    xData.push(`${t.toFixed(1)}h`)
  }

  // 构建series数组
  const seriesData = []

  // AI预测曲线（如果存在）
  if (data.aiCurve && data.aiCurve.length > 0) {
    seriesData.push({
      name: 'AI预测',
      type: 'line',
      data: data.aiCurve.map(p => p.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#ff6b6b', width: 2.5 },
      itemStyle: { color: '#ff6b6b' }
    })
  }

  // 线性拟合曲线
  if (data.linearCurve && data.linearCurve.length > 0) {
    seriesData.push({
      name: '线性拟合',
      type: 'line',
      data: data.linearCurve.map(p => p.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#4ecdc4', width: 2 },
      itemStyle: { color: '#4ecdc4' }
    })
  }

  // 多项式拟合曲线
  if (data.polynomialCurve && data.polynomialCurve.length > 0) {
    seriesData.push({
      name: '多项式拟合',
      type: 'line',
      data: data.polynomialCurve.map(p => p.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#45b7d1', width: 2 },
      itemStyle: { color: '#45b7d1' }
    })
  }

  // 对数拟合曲线
  if (data.logarithmicCurve && data.logarithmicCurve.length > 0) {
    seriesData.push({
      name: '对数拟合',
      type: 'line',
      data: data.logarithmicCurve.map(p => p.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#96ceb4', width: 2 },
      itemStyle: { color: '#96ceb4' }
    })
  }

  simChartInstance.setOption({
    backgroundColor: 'transparent',
    title: {
      text: data.predictionSource === 'AI_SUCCESS' ? 'AI对比模式（4条曲线）' : 'AI预测失败，仅显示数学拟合',
      left: 'center',
      top: 10,
      textStyle: { color: '#4a7fa5', fontSize: 13 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d2135',
      borderColor: '#1e4a6e',
      textStyle: { color: '#c8dff0' }
    },
    legend: {
      data: seriesData.map(s => s.name),
      top: 35,
      textStyle: { color: '#4a7fa5' }
    },
    grid: { left: '4%', right: '4%', bottom: '12%', top: '70px', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#1e3a54' } },
      axisLabel: { color: '#4a7fa5', fontSize: 11, interval: 3 }
    },
    yAxis: {
      type: 'value',
      name: indicatorName || '生理指标值',
      nameTextStyle: { color: '#4a7fa5', fontSize: 11 },
      splitLine: { lineStyle: { color: '#0f2d45', type: 'dashed' } },
      axisLabel: { color: '#4a7fa5' }
    },
    series: seriesData
  })
}

const renderMultiOrganCharts = (data) => {
  if (!simChartRef.value) return
  simChartInstance?.dispose()
  simChartInstance = echarts.init(simChartRef.value, 'dark')

  const organResults = data.organResults || {}
  const LAMBDA = 0.12
  const HOURS = 12
  const STEP = 0.5
  const xData = []

  for (let t = 0; t <= HOURS; t += STEP) {
    xData.push(`${t.toFixed(1)}h`)
  }

  const seriesData = []
  const legendData = []
  const colors = ['#4fc3f7', '#81c784', '#ffb74d', '#e57373', '#ba68c8', '#4db6ac']
  let colorIndex = 0

  Object.entries(organResults).forEach(([organ, indicators]) => {
    indicators.forEach(ind => {
      const seriesName = `${organ}-${ind.indicatorName}`
      legendData.push(seriesName)

      const yData = []
      const peak = ind.predictedValue
      for (let t = 0; t <= HOURS; t += STEP) {
        yData.push(+(peak * Math.exp(-LAMBDA * t)).toFixed(4))
      }

      const color = colors[colorIndex % colors.length]
      colorIndex++

      seriesData.push({
        name: seriesName,
        type: 'line',
        data: yData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color, width: 2 },
        itemStyle: { color }
      })
    })
  })

  simChartInstance.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d2135',
      borderColor: '#1e4a6e',
      textStyle: { color: '#c8dff0' }
    },
    legend: {
      data: legendData,
      textStyle: { color: '#4a7fa5', fontSize: 11 },
      top: 10,
      type: 'scroll'
    },
    grid: { left: '4%', right: '4%', bottom: '12%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#1e3a54' } },
      axisLabel: { color: '#4a7fa5', fontSize: 11, interval: 3 }
    },
    yAxis: {
      type: 'value',
      name: '指标值',
      nameTextStyle: { color: '#4a7fa5', fontSize: 11 },
      splitLine: { lineStyle: { color: '#0f2d45', type: 'dashed' } },
      axisLabel: { color: '#4a7fa5' }
    },
    series: seriesData
  })
}

const renderMultiIndicatorAiTabs = (data) => {
  multiIndicatorChartInstances.forEach(instance => instance?.dispose())
  multiIndicatorChartInstances = []
  renderedChartTabs.clear()
  if (!data || !data.indicators || data.indicators.length === 0) return

  activeIndicatorTab.value = '0'

  nextTick(() => {
    renderSingleIndicatorChart(0)
  })
}

const renderSingleIndicatorChart = (index) => {
  if (!multiIndicatorAiResult.value?.indicators) return
  if (renderedChartTabs.has(index)) return

  const indicator = multiIndicatorAiResult.value.indicators[index]
  if (!indicator) return

  nextTick(() => {
    const chartRef = document.getElementById(`indicator-chart-${index}`)
    if (!chartRef) {
      console.warn(`Chart container not found for index ${index}`)
      return
    }

    const chartInstance = echarts.init(chartRef, 'dark')
    multiIndicatorChartInstances[index] = chartInstance
    renderedChartTabs.add(index)

    const xData = []
    for (let t = 0; t <= 12; t += 0.5) xData.push(`${t.toFixed(1)}h`)

    const seriesData = []
    if (indicator.aiCurve?.length > 0) {
      seriesData.push({ name: 'AI预测', type: 'line', data: indicator.aiCurve.map(p => p.value), smooth: true, lineStyle: { color: '#ff6b6b', width: 2.5 } })
    }
    if (indicator.linearCurve?.length > 0) {
      seriesData.push({ name: '线性', type: 'line', data: indicator.linearCurve.map(p => p.value), smooth: true, lineStyle: { color: '#4ecdc4', width: 2 } })
    }
    if (indicator.polynomialCurve?.length > 0) {
      seriesData.push({ name: '多项式', type: 'line', data: indicator.polynomialCurve.map(p => p.value), smooth: true, lineStyle: { color: '#45b7d1', width: 2 } })
    }
    if (indicator.logarithmicCurve?.length > 0) {
      seriesData.push({ name: '对数', type: 'line', data: indicator.logarithmicCurve.map(p => p.value), smooth: true, lineStyle: { color: '#96ceb4', width: 2 } })
    }

    chartInstance.setOption({
      backgroundColor: 'transparent',
      title: { text: indicator.indicatorName, left: 'center', textStyle: { color: '#4a7fa5', fontSize: 13 } },
      tooltip: { trigger: 'axis' },
      legend: { data: seriesData.map(s => s.name), top: 30, textStyle: { color: '#4a7fa5' } },
      grid: { left: '10%', right: '10%', top: '20%', bottom: '15%' },
      xAxis: { type: 'category', data: xData, axisLabel: { color: '#4a7fa5' } },
      yAxis: { type: 'value', axisLabel: { color: '#4a7fa5' } },
      series: seriesData
    })
  })
}

watch(activeMenu, async val => {
  if (val === 'simulation' && simResult.value) {
    await nextTick()
    requestAnimationFrame(() => {
      if (simMode.value === 'multi-organ') {
        renderMultiOrganCharts(simResult.value)
      } else {
        renderSimChart(
          Number(simResult.value.predictedValue),
          simResult.value.indicatorName || simForm.indicatorName
        )
      }
    })
  }
})
//33333333
watch(activeIndicatorTab, (newTab) => {
  if (multiIndicatorAiResult.value) {
    nextTick(() => {
      renderSingleIndicatorChart(Number(newTab));
      // 💡 关键：延迟执行 resize，解决 ECharts 在隐藏容器中宽度为 0 的问题
      setTimeout(() => {
        const instance = multiIndicatorChartInstances[Number(newTab)];
        if (instance) instance.resize();
      }, 100);
    });
  }
}, { immediate: true }); // 💡 加上这个，确保第一次赋值也能画图

const launchSimFromExp = row => {
  if (!canLaunchSimulation(row)) {
    ElMessage.warning('只有审批通过的实验才能发起仿真')
    return
  }
  linkedSimulationExperiment.value = row
  simForm.experimentId = row.id
  simForm.animalType = row.animalType
  simForm.chemicalName = row.chemicalName
  simForm.algorithmModel = ''
  simForm.tempRange = [15, 35]
  simForm.targetDosage = 1.0
  simResult.value = null

  // 根据实验模式设置仿真模式和相关字段
  if (row.simulationMode === 'MULTI_ORGAN') {
    simMode.value = 'multi-organ'
    simForm.organs = row.targetOrgans ? row.targetOrgans.split(',') : []
    simForm.indicatorName = ''
  } else {
    simMode.value = 'single'
    simForm.indicatorName = row.indicatorName || ''
    simForm.organs = []
  }

  activeMenu.value = 'simulation'
  ElMessage.info(`已关联方案「${row.name}」，请设置算法与剂量后启动仿真`)
}

const dashboardLoading = ref(false)
const dashboardSummary = reactive({
  totalUsers: 0,
  totalSimulations: 0,
  weeklySimulations: 0,
  pendingExperimentApprovals: 0,
  approvedExperiments: 0,
  replacementRate: 0
})

const fetchDashboardSummary = async () => {
  if (!isAdmin.value) return
  dashboardLoading.value = true
  try {
    const res = await adminDashboardApi.summary()
    if (res.code === 200 && res.data) {
      Object.assign(dashboardSummary, res.data)
    } else {
      ElMessage.error(res.message || '加载统计摘要失败')
    }
  } catch {
    ElMessage.error('加载统计摘要失败')
  } finally {
    dashboardLoading.value = false
  }
}

const datasets = ref([])
const datasetLoading = ref(false)
const datasetPageNum = ref(1)
const datasetPageSize = ref(10)
const datasetTotal = ref(0)
const datasetFilters = reactive({
  animalType: '',
  chemicalName: '',
  indicatorName: ''
})

const fetchDatasetList = async () => {
  if (!isAdmin.value) return
  datasetLoading.value = true
  try {
    const params = {
      pageNum: datasetPageNum.value,
      pageSize: datasetPageSize.value
    }
    if (datasetFilters.animalType) params.animalType = datasetFilters.animalType
    if (datasetFilters.chemicalName?.trim()) params.chemicalName = datasetFilters.chemicalName.trim()
    if (datasetFilters.indicatorName?.trim()) params.indicatorName = datasetFilters.indicatorName.trim()

    const res = await adminDatasetApi.list(params)
    if (res.code === 200 && res.data) {
      datasets.value = res.data.records ?? []
      datasetTotal.value = Number(res.data.total) || 0
    } else {
      ElMessage.error(res.message || '加载数据集失败')
    }
  } catch {
    ElMessage.error('加载数据集失败')
  } finally {
    datasetLoading.value = false
  }
}

const onDatasetFilterChange = () => {
  datasetPageNum.value = 1
  fetchDatasetList()
}

const onDatasetPageSizeChange = () => {
  datasetPageNum.value = 1
  fetchDatasetList()
}

const commentLoading = ref(false)
const commentRecords = ref([])
const commentKeyword = ref('')
const commentExperimentId = ref(null)
const commentPageNum = ref(1)
const commentPageSize = ref(10)
const commentTotal = ref(0)

const fetchCommentList = async () => {
  if (!isAdmin.value) return
  commentLoading.value = true
  try {
    const params = {
      pageNum: commentPageNum.value,
      pageSize: commentPageSize.value
    }
    if (commentKeyword.value?.trim()) params.keyword = commentKeyword.value.trim()
    if (commentExperimentId.value) params.experimentId = commentExperimentId.value

    const res = await adminCommentApi.list(params)
    if (res.code === 200 && res.data) {
      commentRecords.value = res.data.records ?? []
      commentTotal.value = Number(res.data.total) || 0
    } else {
      commentRecords.value = []
      commentTotal.value = 0
      ElMessage.error(res.message || '加载待审核评论失败')
    }
  } catch {
    commentRecords.value = []
    commentTotal.value = 0
    ElMessage.error('加载待审核评论失败')
  } finally {
    commentLoading.value = false
  }
}

const onCommentSearch = () => {
  commentPageNum.value = 1
  fetchCommentList()
}

const onCommentPageSizeChange = () => {
  commentPageNum.value = 1
  fetchCommentList()
}

const approveComment = async row => {
  try {
    const { value } = await ElMessageBox.prompt('可选填写审核意见', `通过评论 #${row.id}`, {
      confirmButtonText: '通过',
      cancelButtonText: '取消',
      inputPlaceholder: '如：观点清晰，允许公开展示',
      inputValue: ''
    })
    const res = await adminCommentApi.audit(row.id, 'APPROVED', value || '')
    if (res.code === 200) {
      ElMessage.success('评论已审核通过')
      await fetchCommentList()
    } else {
      ElMessage.error(res.message || '审核失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error('审核失败')
    }
  }
}

const rejectComment = async row => {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', `驳回评论 #${row.id}`, {
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
      inputPlaceholder: '如：内容不符合平台规范或表述不完整',
      inputValidator: val => (val && val.trim() ? true : '请填写驳回原因')
    })
    const res = await adminCommentApi.audit(row.id, 'REJECTED', value.trim())
    if (res.code === 200) {
      ElMessage.success('评论已驳回')
      await fetchCommentList()
    } else {
      ElMessage.error(res.message || '驳回失败')
    }
  } catch (err) {
    if (err !== 'cancel' && err !== 'close') {
      ElMessage.error('驳回失败')
    }
  }
}

const datasetDialogVisible = ref(false)
const datasetIsEdit = ref(false)
const datasetSubmitting = ref(false)
const datasetEditId = ref(null)
const datasetFormRef = ref(null)
const datasetForm = reactive({
  animalType: '',
  chemicalName: '',
  dosage: 0,
  indicatorName: '',
  indicatorValue: 0,
  temperature: 25
})

const datasetRules = {
  animalType: [{ required: true, message: '请选择实验物种', trigger: 'change' }],
  chemicalName: [{ required: true, message: '请输入化学物质', trigger: 'blur' }],
  dosage: [{ required: true, message: '请输入给药剂量', trigger: 'change' }],
  indicatorName: [{ required: true, message: '请输入观测指标', trigger: 'blur' }],
  indicatorValue: [{ required: true, message: '请输入指标值', trigger: 'change' }],
  temperature: [{ required: true, message: '请输入环境温度', trigger: 'change' }]
}

const resetDatasetForm = () => {
  Object.assign(datasetForm, {
    animalType: '',
    chemicalName: '',
    dosage: 0,
    indicatorName: '',
    indicatorValue: 0,
    temperature: 25
  })
  datasetEditId.value = null
}

const openDatasetCreate = () => {
  datasetIsEdit.value = false
  resetDatasetForm()
  datasetDialogVisible.value = true
}

const openDatasetEdit = row => {
  datasetIsEdit.value = true
  datasetEditId.value = row.id
  Object.assign(datasetForm, {
    animalType: row.animalType,
    chemicalName: row.chemicalName,
    dosage: Number(row.dosage),
    indicatorName: row.indicatorName,
    indicatorValue: Number(row.indicatorValue),
    temperature: Number(row.temperature)
  })
  datasetDialogVisible.value = true
}

const submitDatasetForm = async () => {
  await datasetFormRef.value.validate()
  datasetSubmitting.value = true
  try {
    const payload = { ...datasetForm }
    const res = datasetIsEdit.value
      ? await adminDatasetApi.update(datasetEditId.value, payload)
      : await adminDatasetApi.create(payload)

    if (res.code === 200) {
      ElMessage.success(datasetIsEdit.value ? '数据集已更新' : '数据集已新增')
      datasetDialogVisible.value = false
      await fetchDatasetList()
    } else {
      ElMessage.error(res.message || '保存数据集失败')
    }
  } catch {
    ElMessage.error('保存数据集失败')
  } finally {
    datasetSubmitting.value = false
  }
}

const handleDatasetDelete = async row => {
  await ElMessageBox.confirm(
    `确定要删除数据集记录 #${row.id} 吗？`,
    '二次确认',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
  try {
    const res = await adminDatasetApi.remove(row.id)
    if (res.code === 200) {
      ElMessage.success('数据集已删除')
      await fetchDatasetList()
    } else {
      ElMessage.error(res.message || '删除数据集失败')
    }
  } catch {
    ElMessage.error('删除数据集失败')
  }
}

onMounted(async () => {
  await fetchList()
  if (isAdmin.value) {
    await fetchDashboardSummary()
    await fetchCommentList()
  }
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  simChartInstance?.dispose()
  window.removeEventListener('resize', resizeChart)
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #061525;
  color: #c8dff0;
  font-family: 'Segoe UI', 'PingFang SC', sans-serif;
}

.layout { display: flex; height: 100vh; overflow: hidden; }
.sidebar {
  width: 220px;
  min-width: 220px;
  background: linear-gradient(180deg, #0a1f38 0%, #071525 100%);
  border-right: 1px solid #1e3a54;
  display: flex;
  flex-direction: column;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px;
  font-size: 15px;
  font-weight: 700;
  color: #4fc3f7;
  border-bottom: 1px solid #1e3a54;
  letter-spacing: 0.5px;
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

.main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar {
  height: 58px;
  background: linear-gradient(90deg, #0a1f38, #0d2a47);
  border-bottom: 1px solid #1e3a54;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  flex-shrink: 0;
}
.topbar-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; color: #e0f3ff; letter-spacing: 1px; }
.topbar-info { display: flex; align-items: center; gap: 16px; }
.topbar-user { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #4fc3f7; }
.topbar-time { font-size: 13px; color: #5a8fab; font-variant-numeric: tabular-nums; }
.content { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.card {
  background: linear-gradient(135deg, #0d2135 0%, #091a2e 100%);
  border: 1px solid #1e3a54;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-header-wrap { gap: 16px; flex-wrap: wrap; }
.card-title { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; color: #a0c8e8; }
.card-subtitle { margin-top: 8px; color: #6e98b8; font-size: 13px; line-height: 1.6; }
.card-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }

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

.el-table { background: transparent !important; border-radius: 8px; overflow: hidden; }
.el-table tr { background: transparent !important; }
.el-table--striped .el-table__body tr.el-table__row--striped td { background: rgba(255,255,255,0.025) !important; }
.el-table__border-left-patch,.el-table__inner-wrapper::before,.el-table__inner-wrapper::after { display: none !important; }
.el-table td, .el-table th { border-bottom: 1px solid #1a3550 !important; }

.action-group { display: flex; flex-wrap: wrap; gap: 4px 8px; }
.action-placeholder { color: #5a8fab; font-size: 12px; }

.dark-dialog .el-dialog { background: #0d2135 !important; border: 1px solid #1e3a54; border-radius: 12px; }
.dark-dialog .el-dialog__title { color: #c8dff0; }
.dark-dialog .el-dialog__headerbtn .el-dialog__close { color: #5a8fab; }
.dark-dialog .el-form-item__label { color: #7ab3d0; }
.dark-dialog .el-input__wrapper,
.dark-dialog .el-textarea__inner,
.dark-dialog .el-select .el-input__wrapper,
.dark-dialog .el-input-number .el-input__wrapper { background: #061525 !important; box-shadow: 0 0 0 1px #1e3a54 inset !important; }
.dark-dialog .el-input__inner,.dark-dialog .el-textarea__inner { color: #c8dff0 !important; }
.dark-dialog .el-dialog__footer { border-top: 1px solid #1e3a54; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #07192b; }
::-webkit-scrollbar-thumb { background: #1e3a54; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2e5a7e; }
.el-button--primary { background-color: #1976a8 !important; border-color: #1976a8 !important; }
.el-button--primary:hover { background-color: #4fc3f7 !important; border-color: #4fc3f7 !important; color: #061525 !important; }

.sim-section { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.sim-section .el-row { flex: 1; }
.sim-section .el-col { display: flex; flex-direction: column; }
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
.sim-card-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: #a0c8e8; }
.sim-card-icon { font-size: 18px; color: #4fc3f7; }
.sim-alert { margin-bottom: 16px; }
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
.slider-wrap { padding: 0 4px; }
.sim-form :deep(.el-slider__runway) { background: #1e3a54 !important; }
.sim-form :deep(.el-slider__bar) { background: linear-gradient(90deg, #1565a8, #4fc3f7) !important; }
.sim-form :deep(.el-slider__button) { border-color: #4fc3f7 !important; }
.temp-range-label { text-align: center; font-size: 12px; color: #4fc3f7; margin-top: 8px; }
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
}
.sim-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  color: #2a4d6a;
  font-size: 14px;
  text-align: center;
}
.sim-empty-icon { font-size: 52px; color: #1e3a54; }
.sim-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 24px;
}
.loading-rings { position: relative; width: 80px; height: 80px; }
.ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #4fc3f7;
  animation: spin 1.4s linear infinite;
}
.ring-1 { inset: 0; animation-duration: 1.4s; }
.ring-2 { inset: 10px; animation-duration: 1.8s; border-top-color: #81c784; }
.ring-3 { inset: 20px; animation-duration: 2.2s; border-top-color: #ffb74d; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: #4fc3f7; font-size: 14px; letter-spacing: 2px; }
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
  font-size: 40px;
  font-weight: 800;
  color: #4caf50;
  text-shadow: 0 0 20px rgba(76,175,80,0.4);
  line-height: 1.2;
}
.result-unit { font-size: 16px; font-weight: 400; color: #5a8fab; margin-left: 6px; }
.result-meta { display: flex; justify-content: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.sim-chart-box { flex: 1; min-height: 260px; }

.heatmap-section {
  background: rgba(79,195,247,0.06);
  border: 1px solid rgba(79,195,247,0.2);
  border-radius: 10px;
  padding: 20px;
  margin-top: 16px;
}

.heatmap-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #4fc3f7;
  margin-bottom: 16px;
  letter-spacing: 1px;
}


.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.summary-card {
  padding: 18px;
  border-radius: 12px;
  background: rgba(79,195,247,0.06);
  border: 1px solid rgba(79,195,247,0.18);
}
.summary-label { color: #7ab3d0; font-size: 13px; margin-bottom: 10px; }
.summary-value { color: #e0f3ff; font-size: 28px; font-weight: 700; }
</style>
