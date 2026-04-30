<template>
  <div class="login-page">
    <canvas ref="canvasRef" class="bg-canvas" />

    <div class="back-home" @click="$router.push('/')">
      <el-icon><ArrowLeft /></el-icon> 返回主页
    </div>

    <div class="login-brand">
      <el-icon class="brand-icon"><Cpu /></el-icon>
      <span>动物替代实验数字孪生平台</span>
    </div>

    <!-- 小屏：无 overlay 时用顶部切换 -->
    <div class="mobile-auth-switch">
      <button
        type="button"
        :class="{ active: !isRegister }"
        @click="switchMode(false)"
      >
        登录
      </button>
      <button
        type="button"
        :class="{ active: isRegister }"
        @click="switchMode(true)"
      >
        注册
      </button>
    </div>

    <!-- 参考 sign.html：双表单 + 中间滑动拓展栏 -->
    <div class="container" :class="{ 'right-panel-active': isRegister }">
      <!-- 注册 -->
      <div class="container__form container--signup">
        <el-form
          ref="formRefRegister"
          :model="formReg"
          :rules="rulesRegister"
          label-position="top"
          class="inner-form"
          @submit.prevent
        >
          <h2 class="form__title">注册</h2>
          <el-form-item prop="nickname">
            <el-input v-model="formReg.nickname" placeholder="用户名" size="large" clearable />
          </el-form-item>
          <el-form-item prop="username">
            <el-input v-model="formReg.username" placeholder="账号" size="large" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formReg.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
            />
          </el-form-item>
          <el-form-item prop="confirm">
            <el-input
              v-model="formReg.confirm"
              type="password"
              placeholder="确认密码"
              size="large"
              show-password
            />
          </el-form-item>
          <el-form-item prop="captcha" class="captcha-row">
            <el-input
              v-model="formReg.captcha"
              placeholder="请输入验证码"
              size="large"
              maxlength="4"
              class="captcha-input"
              @keyup.enter="submitRegister"
            />
            <div class="captcha-box" title="点击刷新" @click="refreshCaptcha">
              <canvas ref="captchaCanvasRef" width="120" height="40" />
            </div>
          </el-form-item>
          <el-button
            class="btn btn-primary"
            :loading="loading"
            native-type="button"
            @click="submitRegister"
          >
            确认验证码并注册
          </el-button>
        </el-form>
      </div>

      <!-- 登录 -->
      <div class="container__form container--signin">
        <el-form
          ref="formRefLogin"
          :model="formLogin"
          :rules="rulesLogin"
          label-position="top"
          class="inner-form"
          @submit.prevent
        >
          <h2 class="form__title">登录</h2>
          <el-form-item prop="username">
            <el-input v-model="formLogin.username" placeholder="账号" size="large" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="formLogin.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
              @keyup.enter="submitLogin"
            />
          </el-form-item>
          <el-form-item prop="captcha" class="captcha-row">
            <el-input
              v-model="formLogin.captcha"
              placeholder="请输入验证码"
              size="large"
              maxlength="4"
              class="captcha-input"
              @keyup.enter="submitLogin"
            />
            <div class="captcha-box" title="点击刷新" @click="refreshCaptcha">
              <canvas ref="captchaCanvasRefLogin" width="120" height="40" />
            </div>
          </el-form-item>
          <el-button
            class="btn btn-primary"
            :loading="loading"
            native-type="button"
            @click="submitLogin"
          >
            登录
          </el-button>
          <p class="hint">
            演示账号：<span class="code">admin</span> / 密码：<span class="code">admin123</span>
          </p>
        </el-form>
      </div>

      <!-- 拓展栏（滑动） -->
      <div class="container__overlay">
        <div class="overlay">
          <div class="overlay__panel overlay--left">
            <h2 class="overlay__title">欢迎回来</h2>
            <p class="overlay__text">已有账号？登录以进入数字孪生实验后台</p>
            <button type="button" class="btn btn-ghost" @click="switchMode(false)">
              已有账号，立刻登录
            </button>
          </div>
          <div class="overlay__panel overlay--right">
            <h2 class="overlay__title">加入我们</h2>
            <p class="overlay__text">还没有账号？注册后即可使用仿真与实验管理功能</p>
            <button type="button" class="btn btn-ghost" @click="switchMode(true)">
              没有账号，前往注册
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Cpu, ArrowLeft } from '@element-plus/icons-vue'
import { authApi } from '../api/experiment.js'

const router = useRouter()
const route = useRoute()

const canvasRef = ref(null)
const captchaCanvasRef = ref(null)
const captchaCanvasRefLogin = ref(null)
let animId = null

/** 当前验证码正确答案（仅前端校验，防脚本枚举需后端配合） */
const captchaAnswer = ref('')

const formRefLogin = ref(null)
const formRefRegister = ref(null)
const loading = ref(false)
const isRegister = ref(false)

const formLogin = reactive({
  username: '',
  password: '',
  captcha: ''
})

const formReg = reactive({
  nickname: '',
  username: '',
  password: '',
  confirm: '',
  captcha: ''
})

const validateCaptcha = (_rule, value, callback) => {
  if (!value || !value.trim()) {
    callback(new Error('请输入验证码'))
    return
  }
  if (value.trim().toLowerCase() !== captchaAnswer.value.toLowerCase()) {
    callback(new Error('验证码错误'))
    return
  }
  callback()
}

const rulesLogin = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  captcha: [{ validator: validateCaptcha, trigger: 'blur' }]
}

const rulesRegister = {
  nickname: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_, val, cb) =>
        val === formReg.password ? cb() : cb(new Error('两次密码不一致')),
      trigger: 'blur'
    }
  ],
  captcha: [{ validator: validateCaptcha, trigger: 'blur' }]
}

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCaptchaText() {
  let s = ''
  for (let i = 0; i < 4; i++) {
    s += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  }
  return s
}

function drawCaptchaOnCanvas(canvas, text) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#0a1828'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `rgba(79,195,247,${0.15 + Math.random() * 0.2})`
    ctx.beginPath()
    ctx.moveTo(Math.random() * w, Math.random() * h)
    ctx.lineTo(Math.random() * w, Math.random() * h)
    ctx.stroke()
  }
  const chars = text.split('')
  chars.forEach((ch, i) => {
    ctx.save()
    ctx.font = `bold ${20 + Math.random() * 4}px Consolas, monospace`
    ctx.fillStyle = `hsl(${190 + Math.random() * 40}, 75%, ${65 + Math.random() * 15}%)`
    ctx.translate(18 + i * 24, 26 + (Math.random() * 6 - 3))
    ctx.rotate((Math.random() - 0.5) * 0.35)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(79,195,247,${0.2 + Math.random() * 0.3})`
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.2, 1.2)
  }
}

function refreshCaptcha() {
  captchaAnswer.value = randomCaptchaText()
  formLogin.captcha = ''
  formReg.captcha = ''
  nextTick(() => {
    drawCaptchaOnCanvas(captchaCanvasRef.value, captchaAnswer.value)
    drawCaptchaOnCanvas(captchaCanvasRefLogin.value, captchaAnswer.value)
  })
}

const switchMode = register => {
  isRegister.value = register
  formRefLogin.value?.clearValidate()
  formRefRegister.value?.clearValidate()
  refreshCaptcha()
}

const submitLogin = async () => {
  await formRefLogin.value.validate()
  loading.value = true
  try {
    const res = await authApi.login(formLogin.username, formLogin.password)
    if (res.code === 200) {
      localStorage.setItem('dt_token', res.data.token)
      localStorage.setItem('dt_username', res.data.username)
      localStorage.setItem('dt_role', (res.data.role || 'USER').toUpperCase())
      if (res.data.userId != null) {
        localStorage.setItem('dt_userId', String(res.data.userId))
      } else {
        localStorage.removeItem('dt_userId')
      }
      ElMessage.success('登录成功，正在跳转...')
      const redirect = route.query.redirect || '/admin'
      router.push(redirect)
    } else {
      ElMessage.error(res.message || '登录失败')
      refreshCaptcha()
    }
  } catch {
    ElMessage.error('网络异常，请稍后重试')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

const submitRegister = async () => {
  await formRefRegister.value.validate()
  loading.value = true
  try {
    const res = await authApi.register(
      formReg.username,
      formReg.password,
      formReg.nickname
    )
    if (res.code === 200) {
      ElMessage.success('注册成功！请使用账号密码登录')
      formLogin.username = formReg.username
      formLogin.password = ''
      switchMode(false)
    } else {
      ElMessage.error(res.message || '注册失败')
      refreshCaptcha()
    }
  } catch {
    ElMessage.error('网络异常，请稍后重试')
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

const initBg = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const pts = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.4,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3
  }))

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    pts.forEach(p => {
      p.x = (p.x + p.vx + canvas.width) % canvas.width
      p.y = (p.y + p.vy + canvas.height) % canvas.height
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(79,195,247,0.2)'
      ctx.fill()
    })
    animId = requestAnimationFrame(draw)
  }
  draw()
}

onMounted(() => {
  initBg()
  refreshCaptcha()
})
onUnmounted(() => cancelAnimationFrame(animId))
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #020d1a, #061525, #020d1a);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 80px 16px 40px;
}

.bg-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.back-home {
  position: fixed;
  top: 24px;
  left: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4a7fa5;
  font-size: 14px;
  cursor: pointer;
  z-index: 20;
  transition: color 0.2s;
}
.back-home:hover {
  color: #4fc3f7;
}

.login-brand {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4fc3f7;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 28px;
}
.brand-icon {
  font-size: 24px;
}

/* ========== 滑动容器（参考 sign.html 结构） ========== */
.container {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 880px;
  min-height: 560px;
  background: rgba(10, 27, 46, 0.92);
  border: 1px solid rgba(79, 195, 247, 0.22);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
}

.container__form {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px 40px;
  transition: opacity 0.5s ease, transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(6, 21, 37, 0.95);
}

/* 登录在左半屏 */
.container--signin {
  left: 0;
  z-index: 2;
}

/* 注册在右半屏，默认被右侧拓展层遮住 */
.container--signup {
  left: 50%;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
}

.right-panel-active .container--signin {
  opacity: 0;
  z-index: 1;
  pointer-events: none;
  transform: translateX(-12px);
}

.right-panel-active .container--signup {
  opacity: 1;
  z-index: 3;
  pointer-events: auto;
  transform: translateX(0);
}

.inner-form {
  width: 100%;
  max-width: 320px;
}

.form__title {
  font-size: 22px;
  font-weight: 700;
  color: #e0f3ff;
  margin: 0 0 24px;
  text-align: center;
  letter-spacing: 2px;
}

.captcha-row :deep(.el-form-item__content) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.captcha-input {
  flex: 1;
  min-width: 120px;
}

.captcha-box {
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(79, 195, 247, 0.35);
  line-height: 0;
  transition: border-color 0.2s;
}
.captcha-box:hover {
  border-color: #4fc3f7;
}

.btn {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  font-size: 15px;
  letter-spacing: 1px;
  cursor: pointer;
  border: none;
  transition: background 0.2s, box-shadow 0.2s;
}

.btn-primary {
  margin-top: 8px;
  background: linear-gradient(90deg, #1565a8, #1e88c8);
  color: #fff;
  box-shadow: 0 4px 20px rgba(79, 195, 247, 0.25);
}
.btn-primary:hover {
  background: linear-gradient(90deg, #1976d2, #4fc3f7);
}

.btn-ghost {
  margin-top: 20px;
  max-width: 260px;
  background: transparent;
  color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.85);
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}

.hint {
  margin-top: 18px;
  text-align: center;
  font-size: 12px;
  color: #3a6a8a;
  line-height: 1.6;
}
.code {
  color: #4fc3f7;
  font-family: monospace;
  background: rgba(79, 195, 247, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
}

/* 覆盖层：默认盖住右半屏（显示「前往注册」）；激活时滑到左半屏（显示「立刻登录」） */
.container__overlay {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
  transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.right-panel-active .container__overlay {
  transform: translateX(-100%);
}

.overlay {
  position: relative;
  left: -100%;
  width: 200%;
  height: 100%;
  display: flex;
  background: linear-gradient(135deg, #1565a8 0%, #0d4f8c 40%, #1a237e 100%);
  transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}

.right-panel-active .overlay {
  transform: translateX(50%);
}

.overlay__panel {
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  text-align: center;
  color: #fff;
}

.overlay__title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 12px;
  letter-spacing: 1px;
}

.overlay__text {
  font-size: 14px;
  line-height: 1.7;
  opacity: 0.92;
  max-width: 260px;
  margin: 0;
}

/* 表单 Element Plus */
:deep(.el-form-item__label) {
  color: #7ab3d0 !important;
  font-size: 13px;
}
:deep(.el-input__wrapper) {
  background: rgba(2, 13, 26, 0.75) !important;
  box-shadow: 0 0 0 1px rgba(79, 195, 247, 0.2) inset !important;
}
:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #4fc3f7 inset !important;
}
:deep(.el-input__inner) {
  color: #c8dff0 !important;
}

.mobile-auth-switch {
  display: none;
  position: relative;
  z-index: 2;
  gap: 0;
  margin-bottom: 16px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(79, 195, 247, 0.25);
}
.mobile-auth-switch button {
  flex: 1;
  padding: 10px 24px;
  border: none;
  background: rgba(6, 21, 37, 0.95);
  color: #7ab3d0;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.mobile-auth-switch button.active {
  background: rgba(79, 195, 247, 0.2);
  color: #4fc3f7;
  font-weight: 600;
}

@media (max-width: 768px) {
  .mobile-auth-switch {
    display: flex;
    width: 100%;
    max-width: 880px;
  }
  .container {
    min-height: auto;
  }
  .container__form {
    position: relative;
    left: auto !important;
    width: 100% !important;
    min-height: 420px;
    padding: 24px 20px;
    transform: none !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }
  .container--signup {
    display: none;
  }
  .right-panel-active .container--signin {
    display: none;
  }
  .right-panel-active .container--signup {
    display: flex;
  }
  .container__overlay {
    display: none;
  }
}
</style>
