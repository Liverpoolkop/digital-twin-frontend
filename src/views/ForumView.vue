<template>
  <div class="forum-page">
    <header class="forum-header">
      <div>
        <div class="forum-badge">PLATFORM FORUM</div>
        <h1>平台论坛</h1>
        <p>围绕实验方案、替代思路与仿真结果开展学术讨论。公开内容需管理员审核后展示。</p>
      </div>
      <div class="forum-header-actions">
        <el-button class="ghost-btn" @click="goHome">
          <el-icon><House /></el-icon>
          返回主页
        </el-button>
        <el-button v-if="isLoggedIn" type="primary" @click="goWorkbench">
          <el-icon><Monitor /></el-icon>
          进入工作台
        </el-button>
        <el-button v-else type="primary" @click="goLogin">
          <el-icon><User /></el-icon>
          登录参与讨论
        </el-button>
      </div>
    </header>

    <main class="forum-main">
      <section class="forum-side card">
        <div class="side-block">
          <div class="side-title">讨论说明</div>
          <ul class="guide-list">
            <li>游客可浏览公开评论，不能点赞或发布。</li>
            <li>登录用户可发表评论、回复与点赞。</li>
            <li>新评论默认进入审核队列，通过后对外公开。</li>
            <li>用户自己的待审核/驳回评论会在列表顶部显示。</li>
          </ul>
        </div>
      </section>

      <section class="forum-content">
        <div class="card composer-card">
          <div class="composer-head">
            <div>
              <div class="card-title">发表讨论</div>
              <p class="card-desc">欢迎分享实验设计思路、替代方法与结果分析。发布后将进入审核流程。</p>
            </div>
            <el-tag v-if="isLoggedIn" type="success" effect="dark" round>已登录</el-tag>
            <el-tag v-else type="info" effect="dark" round>游客只读</el-tag>
          </div>

          <el-alert
            v-if="isLoggedIn"
            type="info"
            :closable="false"
            show-icon
            title="内容提交后需管理员审核，通过后公开展示"
            class="composer-alert"
          />
          <el-alert
            v-else
            type="warning"
            :closable="false"
            show-icon
            title="请先登录后再发布评论、回复或点赞"
            class="composer-alert"
          />

          <el-form label-position="top">
            <el-form-item label="关联实验 ID（可选）">
              <el-input-number
                v-model="composer.experimentId"
                :min="1"
                :step="1"
                controls-position="right"
                placeholder="如与某实验相关，可填写实验编号"
                style="width: 220px"
                :disabled="!isLoggedIn || submitting"
              />
            </el-form-item>
            <el-form-item label="讨论内容">
              <el-input
                v-model="composer.content"
                type="textarea"
                :rows="5"
                maxlength="1000"
                show-word-limit
                resize="none"
                placeholder="请输入你的实验见解、方案比较或仿真观察结果..."
                :disabled="!isLoggedIn || submitting"
              />
            </el-form-item>
            <div class="composer-actions">
              <el-button type="primary" :loading="submitting" :disabled="!isLoggedIn" @click="submitComment">
                发布评论
              </el-button>
              <el-button :disabled="submitting" @click="resetComposer">清空</el-button>
            </div>
          </el-form>
        </div>

        <div class="card list-card">
          <div class="list-head">
            <div>
              <div class="card-title">讨论列表</div>
              <p class="card-desc">公开评论面向所有访问者展示；你自己的待审核或驳回内容也会在此处可见。</p>
            </div>
            <div class="list-actions">
              <el-button :icon="Refresh" @click="loadComments">刷新</el-button>
            </div>
          </div>

          <div v-loading="loading">
            <el-empty
              v-if="!comments.length"
              description="当前暂无评论，欢迎发表第一条学术讨论"
              :image-size="88"
            />

            <div v-else class="comment-tree">
              <CommentTree
                v-for="comment in comments"
                :key="comment.id"
                :comment="comment"
                :is-logged-in="isLoggedIn"
                :reply-draft="replyDraft"
                :replying-id="replyingId"
                @toggle-like="toggleLike"
                @open-reply="openReply"
                @update-reply-content="updateReplyContent"
                @cancel-reply="cancelReply"
                @submit-reply="submitReply"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElIcon, ElInput, ElMessage, ElTag } from 'element-plus'
import { ChatLineRound, House, Monitor, Refresh, User, Pointer, Promotion } from '@element-plus/icons-vue'
import { commentApi } from '../api/experiment.js'

const router = useRouter()
const token = localStorage.getItem('dt_token')
const isLoggedIn = computed(() => Boolean(token))

const loading = ref(false)
const submitting = ref(false)
const comments = ref([])
const replyingId = ref(null)
const replyDraft = reactive({})

const composer = reactive({
  experimentId: null,
  content: ''
})

const formatTime = value => (value ? String(value).replace('T', ' ').slice(0, 16) : '-')
const commentStatusType = status => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}
const commentStatusLabel = status => {
  if (status === 'APPROVED') return '公开中'
  if (status === 'REJECTED') return '未通过'
  return '审核中'
}

const goHome = () => router.push('/')
const goLogin = () => router.push({ path: '/login', query: { redirect: '/forum' } })
const goWorkbench = () => router.push('/admin')

const loadComments = async () => {
  loading.value = true
  try {
    const api = isLoggedIn.value ? commentApi.listVisible : commentApi.listPublic
    const res = await api({})
    if (res.code === 200) {
      comments.value = Array.isArray(res.data) ? res.data : []
    } else {
      comments.value = []
      ElMessage.error(res.message || '加载评论失败')
    }
  } catch {
    comments.value = []
    ElMessage.error('加载评论失败')
  } finally {
    loading.value = false
  }
}

const resetComposer = () => {
  composer.experimentId = null
  composer.content = ''
}

const submitComment = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再发布评论')
    return
  }
  const content = composer.content.trim()
  if (!content) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    const res = await commentApi.create({
      experimentId: composer.experimentId || null,
      parentId: null,
      content
    })
    if (res.code === 200) {
      ElMessage.success('内容已提交审核，通过后公开展示')
      resetComposer()
      await loadComments()
    } else {
      ElMessage.error(res.message || '发布评论失败')
    }
  } catch {
    ElMessage.error('发布评论失败')
  } finally {
    submitting.value = false
  }
}

const openReply = comment => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再回复评论')
    return
  }
  replyingId.value = comment.id
  replyDraft[comment.id] = replyDraft[comment.id] || `回复 @${comment.nickname || '用户'}：`
}

const updateReplyContent = (id, value) => {
  replyDraft[id] = value
}

const cancelReply = id => {
  if (replyingId.value === id) {
    replyingId.value = null
  }
  replyDraft[id] = ''
}

const submitReply = async comment => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再回复评论')
    return
  }
  const content = (replyDraft[comment.id] || '').trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }

  try {
    const res = await commentApi.create({
      experimentId: comment.experimentId || null,
      parentId: comment.id,
      content
    })
    if (res.code === 200) {
      ElMessage.success('回复已提交审核，通过后公开展示')
      replyDraft[comment.id] = ''
      replyingId.value = null
      await loadComments()
    } else {
      ElMessage.error(res.message || '回复失败')
    }
  } catch {
    ElMessage.error('回复失败')
  }
}

const toggleLike = async comment => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  try {
    const res = comment.likedByCurrentUser
      ? await commentApi.unlike(comment.id)
      : await commentApi.like(comment.id)

    if (res.code === 200) {
      const nextLiked = !comment.likedByCurrentUser
      comment.likedByCurrentUser = nextLiked
      comment.likeCount = Math.max(0, Number(comment.likeCount || 0) + (nextLiked ? 1 : -1))
    } else {
      ElMessage.error(res.message || '点赞操作失败')
    }
  } catch {
    ElMessage.error('点赞操作失败')
  }
}

const CommentTree = defineComponent({
  name: 'CommentTree',
  props: {
    comment: { type: Object, required: true },
    isLoggedIn: { type: Boolean, required: true },
    replyDraft: { type: Object, required: true },
    replyingId: { type: [Number, String, null], default: null }
  },
  emits: ['toggle-like', 'open-reply', 'update-reply-content', 'cancel-reply', 'submit-reply'],
  setup(props, { emit }) {
    return () => {
      const c = props.comment
      const children = Array.isArray(c.children) ? c.children : []
      const isReplying = props.replyingId === c.id
      const statusTag = c.status && c.status !== 'APPROVED'
        ? h(ElTag, { size: 'small', effect: 'dark', type: commentStatusType(c.status), round: true }, () => commentStatusLabel(c.status))
        : null

      return h('article', { class: ['forum-comment', c.ownedByCurrentUser ? 'is-owned' : ''] }, [
        h('div', { class: 'comment-main' }, [
          h('div', { class: 'comment-main-header' }, [
            h('div', { class: 'comment-author-group' }, [
              h('div', { class: 'comment-author-line' }, [
                h('span', { class: 'comment-name' }, c.nickname || '匿名用户'),
                c.replyToNickname ? h('span', { class: 'comment-replyto' }, `回复 @${c.replyToNickname}`) : null,
                statusTag
              ]),
              h('div', { class: 'comment-meta-line' }, [
                c.experimentId ? h('span', { class: 'comment-meta-chip' }, `实验 #${c.experimentId}`) : null,
                h('span', { class: 'comment-meta-time' }, formatTime(c.createTime))
              ])
            ])
          ]),
          h('div', { class: 'comment-body' }, c.content || ''),
          c.status === 'REJECTED' && c.rejectReason
            ? h('div', { class: 'comment-reject-reason' }, `未通过原因：${c.rejectReason}`)
            : null,
          h('div', { class: 'comment-actions' }, [
            h(ElButton, {
              text: true,
              type: c.likedByCurrentUser ? 'danger' : 'primary',
              onClick: () => emit('toggle-like', c)
            }, {
              default: () => [h(ElIcon, null, () => h(Pointer)), ` 点赞 ${c.likeCount || 0}`]
            }),
            h(ElButton, {
              text: true,
              type: 'primary',
              onClick: () => emit('open-reply', c)
            }, {
              default: () => [h(ElIcon, null, () => h(ChatLineRound)), ' 回复']
            })
          ]),
          isReplying
            ? h('div', { class: 'reply-box' }, [
                h(ElInput, {
                  type: 'textarea',
                  rows: 3,
                  maxlength: 1000,
                  showWordLimit: true,
                  resize: 'none',
                  modelValue: props.replyDraft[c.id] || '',
                  'onUpdate:modelValue': value => emit('update-reply-content', c.id, value),
                  placeholder: '输入回复内容'
                }),
                h('div', { class: 'reply-actions' }, [
                  h(ElButton, { type: 'primary', onClick: () => emit('submit-reply', c) }, {
                    default: () => [h(ElIcon, null, () => h(Promotion)), ' 提交回复']
                  }),
                  h(ElButton, { onClick: () => emit('cancel-reply', c.id) }, '取消')
                ])
              ])
            : null
        ]),
        children.length
          ? h('div', { class: 'comment-children' }, children.map(child =>
              h(CommentTree, {
                key: child.id,
                comment: child,
                isLoggedIn: props.isLoggedIn,
                replyDraft: props.replyDraft,
                replyingId: props.replyingId,
                onToggleLike: value => emit('toggle-like', value),
                onOpenReply: value => emit('open-reply', value),
                onUpdateReplyContent: (id, value) => emit('update-reply-content', id, value),
                onCancelReply: id => emit('cancel-reply', id),
                onSubmitReply: value => emit('submit-reply', value)
              })
            ))
          : null
      ])
    }
  }
})

loadComments()
resetComposer()
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #061525 0%, #081b2e 45%, #071423 100%);
  color: #c8dff0;
  padding: 36px 28px 56px;
}

.forum-header {
  max-width: 1280px;
  margin: 0 auto 24px;
  padding: 28px 32px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  background: rgba(13, 33, 53, 0.72);
  border: 1px solid rgba(79,195,247,0.16);
  border-radius: 18px;
  backdrop-filter: blur(10px);
}

.forum-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(79,195,247,0.28);
  color: #4fc3f7;
  font-size: 12px;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.forum-header h1 {
  font-size: 34px;
  color: #e0f3ff;
  margin-bottom: 12px;
}

.forum-header p {
  max-width: 760px;
  line-height: 1.8;
  color: #7ab3d0;
}

.forum-header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.forum-main {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
}

.card {
  background: rgba(13, 33, 53, 0.72);
  border: 1px solid rgba(79,195,247,0.16);
  border-radius: 18px;
  padding: 22px;
  backdrop-filter: blur(10px);
}

.forum-side {
  align-self: start;
  position: sticky;
  top: 24px;
}

.side-block + .side-block {
  margin-top: 22px;
}

.side-title,
.card-title {
  font-size: 17px;
  font-weight: 700;
  color: #e0f3ff;
}

.card-desc {
  margin-top: 8px;
  color: #6e98b8;
  line-height: 1.7;
  font-size: 13px;
}

.guide-list {
  margin: 14px 0 0 18px;
  color: #7ab3d0;
  line-height: 1.9;
  font-size: 13px;
}

.filter-actions,
.composer-actions,
.reply-actions,
.list-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.forum-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.composer-head,
.list-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.composer-alert {
  margin-bottom: 18px;
}

.comment-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.forum-comment) {
  border: 1px solid rgba(79,195,247,0.12);
  border-radius: 14px;
  background: rgba(6, 21, 37, 0.72);
  padding: 16px;
}

:deep(.forum-comment.is-owned) {
  border-color: rgba(129,199,132,0.28);
  box-shadow: inset 0 0 0 1px rgba(129,199,132,0.08);
}

:deep(.comment-main-header) {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

:deep(.comment-author-line) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

:deep(.comment-name) {
  font-size: 15px;
  font-weight: 600;
  color: #e0f3ff;
}

:deep(.comment-replyto) {
  font-size: 12px;
  color: #7ab3d0;
}

:deep(.comment-meta-line) {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  color: #5a8fab;
  font-size: 12px;
}

:deep(.comment-meta-chip) {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(79,195,247,0.08);
  border: 1px solid rgba(79,195,247,0.12);
}

:deep(.comment-body) {
  color: #c8dff0;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.comment-reject-reason) {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.16);
  color: #ffadad;
  font-size: 13px;
}

:deep(.comment-actions) {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

:deep(.reply-box) {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(13, 33, 53, 0.6);
  border: 1px solid rgba(79,195,247,0.12);
}

:deep(.reply-actions) {
  margin-top: 12px;
}

:deep(.comment-children) {
  margin-top: 14px;
  margin-left: 22px;
  padding-left: 14px;
  border-left: 2px solid rgba(79,195,247,0.14);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ghost-btn {
  background: transparent !important;
  border: 1px solid rgba(79,195,247,0.28) !important;
  color: #7ab3d0 !important;
}

.ghost-btn:hover {
  background: rgba(79,195,247,0.08) !important;
  color: #4fc3f7 !important;
}

@media (max-width: 960px) {
  .forum-main {
    grid-template-columns: 1fr;
  }

  .forum-side {
    position: static;
  }

  .forum-header {
    flex-direction: column;
  }
}
</style>
