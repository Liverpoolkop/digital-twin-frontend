<template>
  <div class="organ-heatmap">
    <div class="organs-container">
      <!-- 心脏 -->
      <div v-if="selectedOrgans.includes('Heart')" class="organ-item">
        <img
          src="@/assets/organs/heart.png"
          alt="心脏"
          class="organ-img"
          :class="{ 'organ-pulse': shouldAnimate('Heart') }"
          :style="{
            ...getOrganStyle('Heart'),
            animationDuration: getAnimationDuration('Heart', damageScores.Heart)
          }"
          @mouseenter="showTooltip('Heart', $event)"
          @mouseleave="hideTooltip"
        />
        <div class="organ-label">心脏</div>
      </div>

      <!-- 肝脏 -->
      <div v-if="selectedOrgans.includes('Liver')" class="organ-item">
        <img
          src="@/assets/organs/liver.png"
          alt="肝脏"
          class="organ-img"
          :class="{ 'organ-pulse': shouldAnimate('Liver') }"
          :style="{
            ...getOrganStyle('Liver'),
            animationDuration: getAnimationDuration('Liver', damageScores.Liver)
          }"
          @mouseenter="showTooltip('Liver', $event)"
          @mouseleave="hideTooltip"
        />
        <div class="organ-label">肝脏</div>
      </div>

      <!-- 肺部 -->
      <div v-if="selectedOrgans.includes('Lung')" class="organ-item">
        <img
          src="@/assets/organs/lung.png"
          alt="肺部"
          class="organ-img"
          :class="{ 'organ-pulse': shouldAnimate('Lung') }"
          :style="{
            ...getOrganStyle('Lung'),
            animationDuration: getAnimationDuration('Lung', damageScores.Lung)
          }"
          @mouseenter="showTooltip('Lung', $event)"
          @mouseleave="hideTooltip"
        />
        <div class="organ-label">肺部</div>
      </div>
    </div>

    <!-- 颜色图例 -->
    <div class="legend">
      <div class="legend-item"><span class="color-box" style="background: hsl(120, 70%, 50%)"></span>低风险 (0-30)</div>
      <div class="legend-item"><span class="color-box" style="background: hsl(60, 70%, 50%)"></span>中风险 (30-70)</div>
      <div class="legend-item"><span class="color-box" style="background: hsl(0, 70%, 50%)"></span>高风险 (70-100)</div>
    </div>

    <!-- 悬浮提示 -->
    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tooltip-title">{{ tooltip.organ }}</div>
      <div>受损评分: {{ tooltip.score.toFixed(1) }}</div>
      <div>风险等级: {{ tooltip.level }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  damageScores: {
    type: Object,
    default: () => ({})
  }
})

const tooltip = ref({ visible: false, organ: '', score: 0, level: '', x: 0, y: 0 })

// 获取实际存在的器官列表
const selectedOrgans = computed(() => {
  return Object.keys(props.damageScores || {})
})

// 计算器官的滤镜样式
const getOrganStyle = (organ) => {
  const score = props.damageScores[organ] || 0
  const brightness = 1 - (score / 250)
  const saturate = 1 + (score / 40)
  const hueRotate = score * 0.4

  return {
    filter: `brightness(${brightness}) saturate(${saturate}) hue-rotate(${hueRotate}deg)`
  }
}

// 计算动画速度
const getAnimationDuration = (organ, score) => {
  if (score > 80) return '0.3s'
  if (score > 40) return '0.8s'
  return '1.5s'
}

// 判断是否需要跳动动画
const shouldAnimate = (organ) => {
  const score = props.damageScores[organ] || 0
  return score > 40
}

const showTooltip = (organ, event) => {
  const score = props.damageScores[organ] || 0
  let level = '低风险'
  if (score > 70) level = '高风险'
  else if (score > 30) level = '中风险'

  tooltip.value = {
    visible: true,
    organ: organ === 'Heart' ? '心脏' : organ === 'Liver' ? '肝脏' : '肺部',
    score,
    level,
    x: event.clientX + 10,
    y: event.clientY + 10
  }
}

const hideTooltip = () => {
  tooltip.value.visible = false
}
</script>

<style scoped>
.organ-heatmap {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.organs-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 40px;
  padding: 20px;
  min-height: 300px;
}

.organ-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.organ-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  cursor: pointer;
  transition: filter 0.8s ease, transform 0.3s ease;
}

.organ-img:hover {
  transform: scale(1.1);
}

/* 跳动动画 */
.organ-pulse {
  animation: pulse-beat infinite ease-in-out;
}

@keyframes pulse-beat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.organ-label {
  color: #4a7fa5;
  font-size: 14px;
  font-weight: 500;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4a7fa5;
  font-size: 12px;
}

.color-box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.tooltip {
  position: fixed;
  background: rgba(10, 24, 40, 0.95);
  border: 1px solid #4a7fa5;
  border-radius: 4px;
  padding: 8px 12px;
  color: #c8dff0;
  font-size: 12px;
  pointer-events: none;
  z-index: 9999;
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 4px;
  color: #4fc3f7;
}
</style>
