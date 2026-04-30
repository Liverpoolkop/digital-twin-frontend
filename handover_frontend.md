# Handover - Digital Twin Animal Replacement Prototype (Frontend)

## 当前目标：我们正在解决什么问题？
- 提供一个美观的「数字孪生实验控制台」前端，支持用户在登录后进行：
  - 实验方案台账 CRUD（列表、创建、编辑、删除）
  - 仿真沙盒运行：配置物种/化学物质/指标/温度区间/算法/剂量，调用后端 `POST /api/simulation/run`
  - 仿真结果展示：显示预测值，并用 ECharts 绘制 12 小时指数衰减曲线（可视化示意）
- 主页与登录页提供科技风格 UI，并完成基础登录态展示与导航跳转。

## 技术架构：目前代码的关键结构和依赖
- Vue 3 + Composition API（`<script setup>`）
- Vite
- Element Plus（UI 组件）
- Vue Router（路由与守卫）
- Axios（请求封装）
- ECharts（可视化）

## 已完成的工作：最近修复的 Bug 或实现的 Feature
- 登录态体验
  - `HomeView.vue`：主页顶部悬浮栏未登录显示“登录”，登录后显示用户名并提供“退出登录”按钮。
  - `AdminView.vue`：侧边栏底部增加“返回主页”按钮，退出登录后返回首页继续浏览。
- 登录页 UI 与验证码
  - `LoginView.vue`：按参考 `sign.html` 的风格改为双面板滑动布局（登录/注册切换）。
  - `LoginView.vue`：使用 canvas 生成图形验证码，并支持点击刷新。
- 仿真沙盒与结果展示
  - `AdminView.vue`：仿真请求携带 `indicatorName`；仿真成功后图表能立即渲染。
  - ECharts：Y 轴 `name` 使用具体 `indicatorName`，不再使用抽象文案。
  - 图表生命周期：`echarts` 实例 dispose + `resize` 调整，避免重复初始化。
- 实验列表排序与分页
  - `AdminView.vue`：实验列表工具栏增加排序下拉（ID/创建时间，升/降）。
  - `AdminView.vue`：增加 `el-pagination`，调用后端分页排序接口。

## 未竟的事项：下一步需要立即执行的任务是什么？
- 验证码安全性
  - 当前验证码为前端校验（canvas 显示 + 输入比对）。若要抗脚本/防刷，需要后端验证码校验或引入签名/nonce。
- 鉴权收尾一致性
  - 前端基于 `dt_token` 做路由守卫；后端需确保敏感接口真正基于 JWT 校验。
- 文案语义与科研准确性
  - 当前 ECharts 12 小时曲线由前端用指数衰减公式从峰值生成，属于可视化示意，需要在 UI 文案标注“示意/仿真曲线”以避免误解。

## 核心逻辑说明：有哪些复杂的逻辑是新对话框可能理解错的？
1. **图表不是后端逐时序预测**
   - 后端返回的是 `predictedValue`（标量）。
   - 前端生成曲线使用：`y(t) = peak * exp(-λ * t)`（当前 λ=0.12，模拟 12 小时，采样步长 0.5）。
2. **indicatorName 必须贯穿所有环节**
   - 实验表（experiment）记录 indicatorName；
   - 仿真请求（SimulationRequest）传 indicatorName；
   - 后端训练集筛选（dataset_raw）也按 indicatorName 精确过滤；
   - 前端图表 Y 轴文案使用 indicatorName。
3. **仿真入口的 experimentId 关联**
   - 从实验表点击“发起仿真”时会把 `experimentId` 带入仿真沙盒；
   - `simLaunchFromTable` 用于避免切换菜单时意外清空 experimentId。
4. **排序下拉与后端参数对齐**
   - `listSort` 值为 `id|asc` / `createdTime|desc`，拆分后作为 `sortBy` 与 `order` 请求后端。
   - 后端映射白名单保证不会把任意字段名直接拼 SQL。

