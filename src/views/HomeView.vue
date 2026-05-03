<template>
  <div class="home">
    <!-- 粒子背景画布 -->
    <canvas ref="canvasRef" class="particle-canvas" />

    <!-- 顶部导航 -->
    <nav class="topnav">
      <div class="topnav-brand">
        <el-icon class="brand-icon"><Cpu /></el-icon>
        <span>DigitalTwin Lab</span>
      </div>
      <div class="topnav-links">
        <a href="#about" class="nav-link">关于平台</a>
        <a href="#tech" class="nav-link">技术方案</a>
        <el-button class="forum-btn" text @click="$router.push('/forum')">
          平台论坛
        </el-button>
        <div v-if="isLoggedIn" class="topnav-auth">
          <span class="topnav-user">
            <el-icon><User /></el-icon> {{ username }}
          </span>
          <el-button class="logout-btn-top" size="small" @click="handleLogout">
            <el-icon><SwitchButton /></el-icon> 退出登录
          </el-button>
        </div>
        <el-button v-else class="login-btn" @click="$router.push('/login')">
          登 录
        </el-button>
      </div>
    </nav>

    <!-- 主体内容 -->
    <main class="hero">
      <div class="hero-content">
        <div class="badge">DIGITAL TWIN · ANIMAL ALTERNATIVE</div>
        <h1 class="hero-title">
          动物替代实验<br />
          <span class="gradient-text">数字孪生原型系统</span>
        </h1>
        <p class="hero-sub">数据驱动 &nbsp;·&nbsp; 模型仿真 &nbsp;·&nbsp; 活体替代</p>
        <div class="hero-actions">
          <el-button class="enter-btn" size="large" @click="handleEnter">
            <el-icon><VideoPlay /></el-icon>
            进入系统
          </el-button>
        </div>
      </div>

      <!-- 装饰性浮动卡片 -->
      <div class="float-cards">
        <div class="float-card" v-for="c in floatCards" :key="c.label" :style="c.style">
          <el-icon :style="{ color: c.color, fontSize: '22px' }">
            <component :is="c.icon" />
          </el-icon>
          <div>
            <div class="fc-value" :style="{ color: c.color }">{{ c.value }}</div>
            <div class="fc-label">{{ c.label }}</div>
          </div>
        </div>
      </div>
    </main>

    <!-- 特性区块 -->
    <section id="about" class="features">
      <div class="feat-grid">
        <div class="feat-card" v-for="f in features" :key="f.title">
          <el-icon class="feat-icon" :style="{ color: f.color }">
            <component :is="f.icon" />
          </el-icon>
          <h3>{{ f.title }}</h3>
          <p>{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- 技术方案区块 -->
    <section id="tech" class="tech-section">
      <h2 class="section-title">技术方案</h2>
      <div class="tech-stack">
        <div class="tech-item" v-for="t in techStack" :key="t">{{ t }}</div>
      </div>
    </section>

    <section class="forum-preview">
      <div class="section-head">
        <div>
          <h2 class="section-title">平台论坛 · 公开讨论弹幕</h2>
          <p class="section-desc">聚焦已审核公开评论，以轻量滚动信息流展示平台上的最新学术交流。</p>
        </div>
        <div class="section-head-actions">
          <el-button class="outline-btn" @click="$router.push('/forum')">进入论坛</el-button>
        </div>
      </div>

      <div v-loading="recentLoading" class="forum-preview-body">
        <div v-if="bulletComments.length" class="bullet-board">
          <article
            v-for="item in bulletComments"
            :key="item.id"
            class="bullet-item"
            :style="{
              top: item.top,
              '--bullet-duration': `${item.duration}s`,
              '--bullet-delay': `${item.delay}s`
            }"
            :title="`${item.nickname || '匿名用户'}：${item.content}`"
          >
            <span class="bullet-author">{{ item.nickname || '匿名用户' }}</span>
            <span class="bullet-separator">：</span>
            <span class="bullet-content">{{ item.preview }}</span>
          </article>
        </div>

        <el-empty
          v-else
          description="暂无公开讨论，欢迎成为首位分享实验见解的研究者"
          :image-size="90"
        />
      </div>
    </section>

    <footer class="footer">© 2026 DigitalTwin Lab · 动物替代实验研究平台</footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, VideoPlay, DataBoard, Operation, TrendCharts, Monitor, Connection, User, SwitchButton } from '@element-plus/icons-vue'
import { commentApi } from '../api/experiment.js'

const BULLET_CONTENT_LIMIT = 48
const BULLET_LAYER_POSITIONS = ['10%', '24%', '38%', '52%', '66%', '80%']
const BULLET_DURATIONS = [18, 21, 24, 27, 30]
const BULLET_DELAYS = [0, 2.4, 5.2, 8.1, 11.3, 14.5]

const router = useRouter()
const canvasRef = ref(null)
let animId = null

const isLoggedIn = ref(false)
const username = ref('')
const recentLoading = ref(false)
const recentComments = ref([])

const syncAuthFromStorage = () => {
  isLoggedIn.value = !!localStorage.getItem('dt_token')
  username.value = localStorage.getItem('dt_username') || ''
}

const formatTime = value => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')
const formatBulletContent = value => {
  const content = String(value || '').replace(/\s+/g, ' ').trim()
  if (!content) return '暂无内容'
  return content.length > BULLET_CONTENT_LIMIT ? `${content.slice(0, BULLET_CONTENT_LIMIT)}...` : content
}

const bulletComments = computed(() => {
  const usedLayers = []
  return recentComments.value.map((comment, index) => {
    const availableLayers = BULLET_LAYER_POSITIONS.filter(layer => layer !== usedLayers[usedLayers.length - 1])
    const top = availableLayers[index % availableLayers.length] || BULLET_LAYER_POSITIONS[index % BULLET_LAYER_POSITIONS.length]
    usedLayers.push(top)

    return {
      ...comment,
      preview: formatBulletContent(comment.content),
      top,
      duration: BULLET_DURATIONS[index % BULLET_DURATIONS.length],
      delay: BULLET_DELAYS[index % BULLET_DELAYS.length]
    }
  })
})

const loadRecentComments = async () => {
  recentLoading.value = true
  try {
    const res = await commentApi.listRecent({ limit: 10 })
    if (res.code === 200) {
      recentComments.value = Array.isArray(res.data) ? res.data : []
    } else {
      recentComments.value = []
      ElMessage.error(res.message || '加载最新评论失败')
    }
  } catch {
    recentComments.value = []
    ElMessage.error('加载最新评论失败')
  } finally {
    recentLoading.value = false
  }
}

const handleEnter = () => {
  const token = localStorage.getItem('dt_token')
  router.push(token ? '/admin' : '/login')
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  localStorage.removeItem('dt_token')
  localStorage.removeItem('dt_username')
  localStorage.removeItem('dt_userId')
  localStorage.removeItem('dt_role')
  syncAuthFromStorage()
  ElMessage.success('已退出登录')
}

const floatCards = [
  { label: '模拟实验', value: '128+', color: '#4fc3f7', icon: 'DataBoard', style: { top: '20%', right: '8%', animationDelay: '0s' } },
  { label: '成功率',   value: '94.6%', color: '#81c784', icon: 'TrendCharts', style: { top: '40%', right: '3%', animationDelay: '0.8s' } },
  { label: '替代方案', value: '37 种', color: '#ffb74d', icon: 'Operation', style: { top: '60%', right: '10%', animationDelay: '1.4s' } }
]

const features = [
  { icon: 'Operation', color: '#4fc3f7', title: '参数录入',   desc: '支持多维度实验参数录入，涵盖药物剂量、暴露时间、目标组织等关键变量。' },
  { icon: 'TrendCharts', color: '#81c784', title: '数据仿真', desc: '内置生理模型引擎，基于输入参数实时计算并返回模拟的生理指标时序数据。' },
  { icon: 'Monitor',  color: '#ffb74d', title: '大屏可视',   desc: '前端 ECharts 图表将仿真结果转化为直观的折线走势，辅助科研决策。' },
  { icon: 'Connection', color: '#ce93d8', title: '开放接口',  desc: '前后端完全分离，RESTful API 标准设计，支持与第三方实验平台对接。' }
]

const techStack = ['Spring Boot 3', 'MyBatis', 'MySQL', 'Vue 3', 'Vite', 'Element Plus', 'ECharts', 'Axios']

// 粒子背景
const initParticles = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
  resize()
  window.addEventListener('resize', resize)

  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.5 + 0.5,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.5 + 0.1
  }))

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = canvas.width
      if (p.x > canvas.width) p.x = 0
      if (p.y < 0) p.y = canvas.height
      if (p.y > canvas.height) p.y = 0
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(79,195,247,${p.alpha})`
      ctx.fill()
    })
    // 连线
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(79,195,247,${0.12 * (1 - dist / 100)})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
    }
    animId = requestAnimationFrame(draw)
  }
  draw()
}

onMounted(() => {
  syncAuthFromStorage()
  initParticles()
  loadRecentComments()
  window.addEventListener('focus', syncAuthFromStorage)
})
onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('focus', syncAuthFromStorage)
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(135deg, #020d1a 0%, #061525 50%, #020d1a 100%);
  color: #c8dff0;
  overflow-x: hidden;
}

.particle-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* ─── 导航 ─── */
.topnav {
  position: fixed;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 60px;
  height: 64px;
  background: rgba(2, 13, 26, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(79,195,247,0.1);
  z-index: 100;
}

.topnav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 700;
  color: #4fc3f7;
}
.brand-icon { font-size: 22px; }

.topnav-links { display: flex; align-items: center; gap: 32px; }

.nav-link {
  color: #7ab3d0;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}
.nav-link:hover { color: #4fc3f7; }

.forum-btn {
  color: #7ab3d0 !important;
  padding: 0 !important;
}
.forum-btn:hover {
  color: #4fc3f7 !important;
  background: transparent !important;
}

.login-btn {
  background: transparent !important;
  border: 1px solid #4fc3f7 !important;
  color: #4fc3f7 !important;
  border-radius: 20px !important;
  padding: 0 24px !important;
}
.login-btn:hover {
  background: rgba(79,195,247,0.1) !important;
}

.topnav-auth {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topnav-user {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #4fc3f7;
}

.logout-btn-top {
  background: transparent !important;
  border: 1px solid rgba(255, 100, 100, 0.35) !important;
  color: #ff8a8a !important;
  border-radius: 18px !important;
  padding: 0 14px !important;
}
.logout-btn-top:hover {
  background: rgba(255, 100, 100, 0.1) !important;
}

/* ─── Hero ─── */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 80px 60px 0;
  z-index: 1;
}

.hero-content { max-width: 680px; }

.badge {
  display: inline-block;
  padding: 5px 16px;
  border: 1px solid rgba(79,195,247,0.4);
  border-radius: 20px;
  font-size: 12px;
  color: #4fc3f7;
  letter-spacing: 1.5px;
  margin-bottom: 28px;
  background: rgba(79,195,247,0.06);
}

.hero-title {
  font-size: clamp(32px, 5vw, 60px);
  font-weight: 800;
  line-height: 1.25;
  color: #e0f3ff;
  margin-bottom: 20px;
  letter-spacing: 1px;
}

.gradient-text {
  background: linear-gradient(90deg, #4fc3f7, #81c784, #4fc3f7);
  background-size: 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 4s linear infinite;
}
@keyframes shimmer { 0% { background-position: 0% } 100% { background-position: 200% } }

.hero-sub {
  font-size: 18px;
  color: #5a8fab;
  margin-bottom: 40px;
  letter-spacing: 2px;
}

.hero-actions { display: flex; gap: 16px; }

.enter-btn {
  background: linear-gradient(90deg, #1565a8, #4fc3f7) !important;
  border: none !important;
  color: #fff !important;
  font-size: 15px !important;
  padding: 0 36px !important;
  height: 48px !important;
  border-radius: 24px !important;
  box-shadow: 0 4px 24px rgba(79,195,247,0.3) !important;
  transition: box-shadow 0.2s !important;
}
.enter-btn:hover { box-shadow: 0 6px 32px rgba(79,195,247,0.55) !important; }

.outline-btn {
  background: transparent !important;
  border: 1px solid rgba(79,195,247,0.4) !important;
  color: #4fc3f7 !important;
  height: 48px !important;
  border-radius: 24px !important;
  padding: 0 32px !important;
}
.outline-btn:hover { border-color: #4fc3f7 !important; background: rgba(79,195,247,0.06) !important; }

/* ─── 浮动卡片 ─── */
.float-cards { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }

.float-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(13, 33, 53, 0.7);
  border: 1px solid rgba(79,195,247,0.18);
  border-radius: 12px;
  padding: 16px 22px;
  margin: 12px 0;
  backdrop-filter: blur(12px);
  position: relative;
  animation: floatY 3s ease-in-out infinite alternate;
  min-width: 180px;
}
@keyframes floatY {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-10px); }
}

.fc-value { font-size: 20px; font-weight: 700; }
.fc-label { font-size: 12px; color: #5a8fab; margin-top: 2px; }

/* ─── 特性区 ─── */
.features {
  position: relative;
  z-index: 1;
  padding: 80px 60px;
  background: rgba(0,0,0,0.2);
}

.feat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.feat-card {
  background: rgba(13, 33, 53, 0.6);
  border: 1px solid rgba(79,195,247,0.1);
  border-radius: 14px;
  padding: 28px 22px;
  transition: border-color 0.2s, transform 0.2s;
}
.feat-card:hover {
  border-color: rgba(79,195,247,0.4);
  transform: translateY(-4px);
}
.feat-icon { font-size: 32px; margin-bottom: 14px; }
.feat-card h3 { font-size: 16px; color: #c8dff0; margin-bottom: 10px; }
.feat-card p  { font-size: 13px; color: #5a8fab; line-height: 1.7; }

/* ─── 技术方案 ─── */
.tech-section {
  position: relative;
  z-index: 1;
  padding: 64px 60px;
  text-align: center;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #e0f3ff;
  margin-bottom: 36px;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  max-width: 700px;
  margin: 0 auto;
}
.tech-item {
  padding: 8px 22px;
  border: 1px solid rgba(79,195,247,0.3);
  border-radius: 20px;
  font-size: 14px;
  color: #4fc3f7;
  background: rgba(79,195,247,0.06);
}

.forum-preview {
  position: relative;
  z-index: 1;
  padding: 20px 60px 80px;
}

.section-head {
  max-width: 1100px;
  margin: 0 auto 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.section-desc {
  margin-top: 10px;
  color: #6e98b8;
  font-size: 14px;
  line-height: 1.7;
}

.section-head-actions {
  display: flex;
  align-items: center;
}

.forum-preview-body {
  max-width: 1100px;
  margin: 0 auto;
}

.bullet-board {
  position: relative;
  overflow: hidden;
  min-height: 280px;
  border-radius: 20px;
  border: 1px solid rgba(79,195,247,0.14);
  background: linear-gradient(180deg, rgba(7, 20, 35, 0.42), rgba(8, 27, 46, 0.28));
  backdrop-filter: blur(10px);
}

.bullet-board::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(2,13,26,0.82) 0%, rgba(2,13,26,0) 10%, rgba(2,13,26,0) 90%, rgba(2,13,26,0.82) 100%);
  pointer-events: none;
  z-index: 2;
}

.bullet-item {
  position: absolute;
  left: 100%;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  max-width: 420px;
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(10, 31, 48, 0.72);
  border: 1px solid rgba(79,195,247,0.16);
  color: #c8dff0;
  box-shadow: 0 8px 24px rgba(2, 13, 26, 0.18);
  white-space: nowrap;
  animation: bulletFloat var(--bullet-duration, 24s) linear infinite;
  animation-delay: var(--bullet-delay, 0s);
  animation-fill-mode: both;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, transform 0.2s;
}

.bullet-item:hover {
  animation-play-state: paused;
  border-color: rgba(79,195,247,0.34);
  background: rgba(13, 33, 53, 0.9);
  box-shadow: 0 10px 28px rgba(79,195,247,0.16);
  transform: scale(1.02);
}

.bullet-author {
  color: #4fc3f7;
  font-weight: 700;
  flex: 0 0 auto;
}

.bullet-separator {
  color: #7ab3d0;
  flex: 0 0 auto;
}

.bullet-content {
  min-width: 0;
  color: #c8dff0;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes bulletFloat {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100vw - 520px));
  }
}

/* ─── 页脚 ─── */
.footer {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 24px;
  font-size: 13px;
  color: #2a4d6a;
  border-top: 1px solid rgba(79,195,247,0.08);
}
</style>
