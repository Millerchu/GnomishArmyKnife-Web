<template>
  <div class="user-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBackHome">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">用户管理</h1>
        <p class="page-subtitle">系统管理 / 用户管理（默认列表）</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">共 {{ pagination.total }} 条</span>
        <span v-if="usingMockData" class="hero-tag">本地演示数据</span>
      </div>
    </div>

    <section class="panel filter-panel">
      <div class="filter-grid">
        <label class="field-item">
          <span>关键字</span>
          <input
            v-model.trim="filters.keyword"
            placeholder="用户名 / 昵称 / 手机号 / 邮箱"
            :disabled="loading"
            @keyup.enter="searchUsers"
          />
        </label>
        <label class="field-item">
          <span>状态</span>
          <select v-model="filters.status" :disabled="loading">
            <option value="">全部</option>
            <option value="ENABLED">启用</option>
            <option value="DISABLED">禁用</option>
          </select>
        </label>
        <label class="field-item">
          <span>角色</span>
          <select v-model="filters.roleCode" :disabled="loading">
            <option value="">全部</option>
            <option value="ADMIN">系统管理员</option>
            <option value="DEV">开发人员</option>
            <option value="USER">普通用户</option>
          </select>
        </label>
      </div>
      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="searchUsers">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetFilters">重置</button>
      </div>
    </section>

    <section class="panel table-panel">
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增用户</button>
          <button
            class="ghost-btn"
            :disabled="!selectedIds.length || loading || submitting"
            @click="batchUpdateStatus('ENABLED')"
          >
            批量启用
          </button>
          <button
            class="ghost-btn"
            :disabled="!selectedIds.length || loading || submitting"
            @click="batchUpdateStatus('DISABLED')"
          >
            批量禁用
          </button>
          <button
            class="danger-btn"
            :disabled="!selectedIds.length || loading || submitting"
            @click="batchDelete"
          >
            批量删除
          </button>
        </div>
        <div class="toolbar-right">
          <span>共 {{ pagination.total }} 条</span>
          <span v-if="usingMockData" class="mock-tip">当前为演示数据（后端未联通）</span>
        </div>
      </div>

      <div class="table-wrap desktop-table-wrap">
        <table class="user-table">
          <thead>
          <tr>
            <th class="check-col">
              <input
                type="checkbox"
                :checked="allChecked"
                :disabled="!users.length || loading || submitting"
                @change="toggleAll($event.target.checked)"
              />
            </th>
            <th>用户名</th>
            <th>昵称</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>状态</th>
            <th>最近登录</th>
            <th>创建时间</th>
            <th class="action-col">操作</th>
          </tr>
          </thead>
          <tbody>
          <tr v-if="loading">
            <td colspan="10" class="empty-cell">加载中...</td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="10" class="empty-cell">暂无用户数据</td>
          </tr>
          <tr v-for="item in users" v-else :key="item.id">
            <td class="check-col">
              <input
                type="checkbox"
                :checked="selectedIds.includes(item.id)"
                :disabled="submitting"
                @change="toggleOne(item.id, $event.target.checked)"
              />
            </td>
            <td>{{ item.username }}</td>
            <td>{{ item.displayName || '-' }}</td>
            <td>{{ item.phone || '-' }}</td>
            <td>{{ item.email || '-' }}</td>
            <td>{{ formatRoleText(item.roleCode) }}</td>
            <td>
              <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
                {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
              </span>
            </td>
            <td>{{ item.lastLoginTime || '-' }}</td>
            <td>{{ item.createTime || '-' }}</td>
            <td class="action-col">
              <button class="mini-btn" :disabled="submitting" @click="openEditDialog(item)">编辑</button>
              <button class="mini-btn" :disabled="submitting" @click="toggleStatus(item)">
                {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
              </button>
              <button class="mini-btn" :disabled="submitting" @click="openResetPasswordDialog(item)">重置密码</button>
              <button class="mini-btn danger" :disabled="submitting" @click="removeUser(item)">删除</button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <div class="mobile-user-list">
        <div v-if="loading" class="mobile-empty">加载中...</div>
        <div v-else-if="!users.length" class="mobile-empty">暂无用户数据</div>
        <article v-for="item in users" v-else :key="item.id" class="mobile-user-card">
          <div class="mobile-card-head">
            <label class="mobile-check">
              <input
                type="checkbox"
                :checked="selectedIds.includes(item.id)"
                :disabled="submitting"
                @change="toggleOne(item.id, $event.target.checked)"
              />
              <span class="mobile-main-title">{{ item.username }}</span>
            </label>
            <span class="status-tag" :class="item.status === 'ENABLED' ? 'on' : 'off'">
              {{ item.status === 'ENABLED' ? '启用' : '禁用' }}
            </span>
          </div>

          <div class="mobile-card-grid">
            <p><span>昵称</span><strong>{{ item.displayName || '-' }}</strong></p>
            <p><span>角色</span><strong>{{ formatRoleText(item.roleCode) }}</strong></p>
            <p><span>手机号</span><strong>{{ item.phone || '-' }}</strong></p>
            <p><span>邮箱</span><strong>{{ item.email || '-' }}</strong></p>
            <p><span>最近登录</span><strong>{{ item.lastLoginTime || '-' }}</strong></p>
            <p><span>创建时间</span><strong>{{ item.createTime || '-' }}</strong></p>
          </div>

          <div class="mobile-card-actions">
            <button class="mini-btn" :disabled="submitting" @click="openEditDialog(item)">编辑</button>
            <button class="mini-btn" :disabled="submitting" @click="toggleStatus(item)">
              {{ item.status === 'ENABLED' ? '禁用' : '启用' }}
            </button>
            <button class="mini-btn" :disabled="submitting" @click="openResetPasswordDialog(item)">重置密码</button>
            <button class="mini-btn danger" :disabled="submitting" @click="removeUser(item)">删除</button>
          </div>
        </article>
      </div>

      <div class="pager">
        <div class="pager-left">
          <span>第 {{ pagination.pageNo }} / {{ pageCount }} 页</span>
          <select v-model.number="pagination.pageSize" :disabled="loading" @change="changePageSize">
            <option :value="10">10 条/页</option>
            <option :value="20">20 条/页</option>
            <option :value="50">50 条/页</option>
          </select>
        </div>
        <div class="pager-right">
          <button class="ghost-btn" :disabled="loading || pagination.pageNo <= 1" @click="changePage(-1)">上一页</button>
          <button class="ghost-btn" :disabled="loading || pagination.pageNo >= pageCount" @click="changePage(1)">下一页</button>
        </div>
      </div>
    </section>

    <div v-if="showEditDialog" class="dialog-mask" @click.self="closeEditDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ editMode === 'create' ? '新增用户' : '编辑用户' }}</h3>
        <form class="dialog-form" @submit.prevent="submitEditDialog">
          <label class="field-item">
            <span>用户名</span>
            <input
              v-model.trim="editForm.username"
              :disabled="editMode === 'edit' || submitting"
              maxlength="32"
              placeholder="请输入用户名"
              required
            />
          </label>
          <label v-if="editMode === 'create'" class="field-item">
            <span>初始密码</span>
            <input
              v-model="editForm.initialPassword"
              :disabled="submitting"
              maxlength="64"
              minlength="6"
              placeholder="至少 6 位"
              required
            />
          </label>
          <label class="field-item">
            <span>昵称</span>
            <input
              v-model.trim="editForm.displayName"
              :disabled="submitting"
              maxlength="32"
              placeholder="请输入昵称"
            />
          </label>
          <label class="field-item">
            <span>手机号</span>
            <input
              v-model.trim="editForm.phone"
              :disabled="submitting"
              maxlength="20"
              placeholder="请输入手机号"
            />
          </label>
          <label class="field-item">
            <span>邮箱</span>
            <input
              v-model.trim="editForm.email"
              :disabled="submitting"
              maxlength="64"
              placeholder="请输入邮箱"
            />
          </label>
          <label class="field-item">
            <span>角色</span>
            <select v-model="editForm.roleCode" :disabled="submitting">
              <option value="ADMIN">系统管理员</option>
              <option value="DEV">开发人员</option>
              <option value="USER">普通用户</option>
            </select>
          </label>
          <label class="field-item">
            <span>状态</span>
            <select v-model="editForm.status" :disabled="submitting">
              <option value="ENABLED">启用</option>
              <option value="DISABLED">禁用</option>
            </select>
          </label>
          <label class="field-item">
            <span>备注</span>
            <textarea
              v-model.trim="editForm.remark"
              :disabled="submitting"
              rows="2"
              maxlength="120"
              placeholder="可选"
            />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeEditDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '确认' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showResetDialog" class="dialog-mask" @click.self="closeResetDialog">
      <div class="dialog narrow">
        <h3 class="dialog-title">重置密码</h3>
        <form class="dialog-form" @submit.prevent="submitResetPassword">
          <p class="hint-text">用户：{{ resetForm.username }}</p>
          <label class="field-item">
            <span>新密码</span>
            <input
              v-model="resetForm.newPassword"
              :disabled="submitting"
              minlength="6"
              maxlength="64"
              required
            />
          </label>
          <label class="checkbox-item">
            <input v-model="resetForm.forceChange" :disabled="submitting" type="checkbox"/>
            <span>用户下次登录必须修改密码</span>
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="fillRandomPassword">
              随机生成
            </button>
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeResetDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '确认重置' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createSystemUser,
  deleteSystemUser,
  listSystemUsers,
  resetSystemUserPassword,
  updateSystemUser,
  updateSystemUserStatus
} from '@/api/systemUser'

// 演示数据用于后端未联通时预览完整用户管理流程。
const MOCK_USER_LIST = [
  {
    id: 1,
    username: 'admin',
    displayName: '系统管理员',
    phone: '13800138000',
    email: 'admin@example.com',
    roleCode: 'ADMIN',
    status: 'ENABLED',
    lastLoginTime: '2026-03-13 21:02:18',
    createTime: '2024-01-03 09:12:00',
    remark: '平台默认管理员'
  },
  {
    id: 2,
    username: 'zhangsan',
    displayName: '张三',
    phone: '13900139001',
    email: 'zhangsan@example.com',
    roleCode: 'DEV',
    status: 'ENABLED',
    lastLoginTime: '2026-03-12 18:20:56',
    createTime: '2025-02-11 12:35:00',
    remark: ''
  },
  {
    id: 3,
    username: 'lisi',
    displayName: '李四',
    phone: '13900139002',
    email: 'lisi@example.com',
    roleCode: 'USER',
    status: 'DISABLED',
    lastLoginTime: '2026-03-01 10:01:44',
    createTime: '2025-04-18 14:22:00',
    remark: '离职账号待归档'
  },
  {
    id: 4,
    username: 'wangwu',
    displayName: '王五',
    phone: '13900139003',
    email: 'wangwu@example.com',
    roleCode: 'USER',
    status: 'ENABLED',
    lastLoginTime: '2026-03-10 09:33:00',
    createTime: '2025-06-03 09:45:00',
    remark: ''
  },
  {
    id: 5,
    username: 'zhaoliu',
    displayName: '赵六',
    phone: '13900139004',
    email: 'zhaoliu@example.com',
    roleCode: 'DEV',
    status: 'ENABLED',
    lastLoginTime: '2026-03-13 08:12:11',
    createTime: '2025-07-07 08:50:00',
    remark: ''
  },
  {
    id: 6,
    username: 'sunqi',
    displayName: '孙七',
    phone: '13900139005',
    email: 'sunqi@example.com',
    roleCode: 'USER',
    status: 'DISABLED',
    lastLoginTime: '2026-02-26 16:48:16',
    createTime: '2025-08-25 16:20:00',
    remark: '长期未登录'
  },
  {
    id: 7,
    username: 'zhouba',
    displayName: '周八',
    phone: '13900139006',
    email: 'zhouba@example.com',
    roleCode: 'USER',
    status: 'ENABLED',
    lastLoginTime: '2026-03-11 11:12:09',
    createTime: '2025-10-05 11:12:00',
    remark: ''
  },
  {
    id: 8,
    username: 'wujiu',
    displayName: '吴九',
    phone: '13900139007',
    email: 'wujiu@example.com',
    roleCode: 'USER',
    status: 'ENABLED',
    lastLoginTime: '2026-03-08 14:26:43',
    createTime: '2025-11-02 13:05:00',
    remark: ''
  },
  {
    id: 9,
    username: 'zhengshi',
    displayName: '郑十',
    phone: '13900139008',
    email: 'zhengshi@example.com',
    roleCode: 'DEV',
    status: 'ENABLED',
    lastLoginTime: '2026-03-07 09:44:22',
    createTime: '2025-11-20 08:20:00',
    remark: ''
  },
  {
    id: 10,
    username: 'qianyi',
    displayName: '钱一',
    phone: '13900139009',
    email: 'qianyi@example.com',
    roleCode: 'USER',
    status: 'ENABLED',
    lastLoginTime: '2026-03-09 15:45:01',
    createTime: '2025-12-09 15:00:00',
    remark: ''
  },
  {
    id: 11,
    username: 'suner',
    displayName: '孙二',
    phone: '13900139010',
    email: 'suner@example.com',
    roleCode: 'USER',
    status: 'ENABLED',
    lastLoginTime: '2026-03-03 12:06:17',
    createTime: '2026-01-08 11:30:00',
    remark: ''
  },
  {
    id: 12,
    username: 'zhou3',
    displayName: '周三',
    phone: '13900139011',
    email: 'zhou3@example.com',
    roleCode: 'USER',
    status: 'DISABLED',
    lastLoginTime: '2026-02-17 19:08:00',
    createTime: '2026-02-11 10:00:00',
    remark: '冻结测试账号'
  }
]

function extractErrorMessage(error, fallback) {
  const data = error?.response?.data || {}
  return data.message || data.msg || fallback
}

// 兼容不同接口响应包装，页面内部统一只处理真正的数据体。
function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

// 用户字段兼容多套命名，统一后模板和弹窗都走同一份结构。
function normalizeUser(item) {
  const source = item || {}
  const roleCode = source.roleCode || source.role || source.userRole || source.roleName || 'USER'
  const rawStatus = `${source.status ?? source.userStatus ?? ''}`.toUpperCase()
  const statusFromEnabled = typeof source.enabled === 'boolean'
    ? (source.enabled ? 'ENABLED' : 'DISABLED')
    : ''
  const status = statusFromEnabled
    || (['ENABLED', 'ACTIVE', '1', 'NORMAL'].includes(rawStatus) ? 'ENABLED' : '')
    || (['DISABLED', 'INACTIVE', 'LOCKED', '0', 'FORBIDDEN'].includes(rawStatus) ? 'DISABLED' : '')
    || 'ENABLED'

  return {
    id: source.id ?? source.userId ?? source.uid,
    username: source.username || source.userName || '-',
    displayName: source.displayName || source.nickname || source.nickName || '',
    phone: source.phone || source.mobile || '',
    email: source.email || '',
    roleCode: roleCode || 'USER',
    status,
    lastLoginTime: source.lastLoginTime || source.lastLoginAt || '',
    createTime: source.createTime || source.createdAt || '',
    remark: source.remark || ''
  }
}

// 兼容常见分页返回格式，避免后端切换实现时改页面逻辑。
function parseListPayload(payload) {
  if (Array.isArray(payload)) {
    return {
      list: payload,
      total: payload.length
    }
  }

  if (!payload || typeof payload !== 'object') {
    return {
      list: [],
      total: 0
    }
  }

  const list = payload.list
    || payload.records
    || payload.rows
    || payload.items
    || payload.content
    || payload.result
    || []

  const total = Number(
    payload.total
    ?? payload.totalCount
    ?? payload.count
    ?? payload.pageTotal
    ?? (Array.isArray(list) ? list.length : 0)
  )

  return {
    list: Array.isArray(list) ? list : [],
    total: Number.isNaN(total) ? 0 : total
  }
}

function formatCurrentTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  const hour = `${now.getHours()}`.padStart(2, '0')
  const minute = `${now.getMinutes()}`.padStart(2, '0')
  const second = `${now.getSeconds()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$'
  let result = ''
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * chars.length)
    result += chars[index]
  }
  return result
}

export default {
  name: 'UserManagement',
  setup() {
    const router = useRouter()

    // 页面状态覆盖列表、筛选、批量选择和两个弹窗流程。
    const loading = ref(false)
    const submitting = ref(false)
    const usingMockData = ref(false)
    const mockAlertShown = ref(false)

    const users = ref([])
    const selectedIds = ref([])
    const mockUsers = ref(MOCK_USER_LIST.map((item) => ({...item})))

    const filters = reactive({
      keyword: '',
      status: '',
      roleCode: ''
    })

    const pagination = reactive({
      pageNo: 1,
      pageSize: 10,
      total: 0
    })

    const showEditDialog = ref(false)
    const editMode = ref('create')
    const editForm = reactive({
      id: null,
      username: '',
      initialPassword: '',
      displayName: '',
      phone: '',
      email: '',
      roleCode: 'USER',
      status: 'ENABLED',
      remark: ''
    })

    const showResetDialog = ref(false)
    const resetForm = reactive({
      userId: null,
      username: '',
      newPassword: '',
      forceChange: true
    })

    const pageCount = computed(() => {
      const totalPage = Math.ceil((pagination.total || 0) / pagination.pageSize)
      return Math.max(totalPage, 1)
    })

    const allChecked = computed(() => {
      if (!users.value.length) {
        return false
      }
      return users.value.every((item) => selectedIds.value.includes(item.id))
    })

    const filterMockUsers = () => {
      const keyword = filters.keyword.trim().toLowerCase()
      const filtered = mockUsers.value.filter((item) => {
        if (filters.status && item.status !== filters.status) {
          return false
        }
        if (filters.roleCode && item.roleCode !== filters.roleCode) {
          return false
        }
        if (!keyword) {
          return true
        }
        const text = [
          item.username,
          item.displayName,
          item.phone,
          item.email
        ].join('|').toLowerCase()
        return text.includes(keyword)
      })

      pagination.total = filtered.length
      const maxPage = Math.max(Math.ceil(filtered.length / pagination.pageSize), 1)
      if (pagination.pageNo > maxPage) {
        pagination.pageNo = maxPage
      }
      const start = (pagination.pageNo - 1) * pagination.pageSize
      const end = start + pagination.pageSize
      users.value = filtered.slice(start, end).map((item) => ({...item}))
    }

    const applyMockList = () => {
      usingMockData.value = true
      filterMockUsers()
      selectedIds.value = []
    }

    const fetchUsers = async () => {
      loading.value = true
      try {
        const params = {
          pageNo: pagination.pageNo,
          pageSize: pagination.pageSize
        }

        if (filters.keyword) {
          params.keyword = filters.keyword
        }
        if (filters.status) {
          params.status = filters.status
        }
        if (filters.roleCode) {
          params.roleCode = filters.roleCode
        }

        const res = await listSystemUsers(params)
        const payload = unwrapData(res)
        const {list, total} = parseListPayload(payload)

        users.value = list.map((item) => normalizeUser(item)).filter((item) => item.id !== undefined && item.id !== null)
        pagination.total = total
        selectedIds.value = []
        usingMockData.value = false
      } catch (error) {
        console.error(error)
        applyMockList()
        if (!mockAlertShown.value) {
          mockAlertShown.value = true
          alert('用户管理接口未联通，已回退为演示数据模式')
        }
      } finally {
        loading.value = false
      }
    }

    const goBackHome = () => {
      router.push('/home')
    }

    const searchUsers = () => {
      pagination.pageNo = 1
      fetchUsers()
    }

    const resetFilters = () => {
      filters.keyword = ''
      filters.status = ''
      filters.roleCode = ''
      pagination.pageNo = 1
      fetchUsers()
    }

    const changePage = (direction) => {
      const nextPage = pagination.pageNo + direction
      if (nextPage < 1 || nextPage > pageCount.value) {
        return
      }
      pagination.pageNo = nextPage
      fetchUsers()
    }

    const changePageSize = () => {
      pagination.pageNo = 1
      fetchUsers()
    }

    const toggleAll = (checked) => {
      if (checked) {
        selectedIds.value = users.value.map((item) => item.id)
        return
      }
      selectedIds.value = []
    }

    const toggleOne = (id, checked) => {
      const set = new Set(selectedIds.value)
      if (checked) {
        set.add(id)
      } else {
        set.delete(id)
      }
      selectedIds.value = Array.from(set)
    }

    const formatRoleText = (roleCode) => {
      if (roleCode === 'ADMIN') {
        return '系统管理员'
      }
      if (roleCode === 'DEV') {
        return '开发人员'
      }
      return '普通用户'
    }

    const openCreateDialog = () => {
      if (submitting.value) {
        return
      }
      editMode.value = 'create'
      editForm.id = null
      editForm.username = ''
      editForm.initialPassword = generatePassword(10)
      editForm.displayName = ''
      editForm.phone = ''
      editForm.email = ''
      editForm.roleCode = 'USER'
      editForm.status = 'ENABLED'
      editForm.remark = ''
      showEditDialog.value = true
    }

    const openEditDialog = (item) => {
      if (submitting.value) {
        return
      }
      editMode.value = 'edit'
      editForm.id = item.id
      editForm.username = item.username
      editForm.initialPassword = ''
      editForm.displayName = item.displayName
      editForm.phone = item.phone
      editForm.email = item.email
      editForm.roleCode = item.roleCode
      editForm.status = item.status
      editForm.remark = item.remark
      showEditDialog.value = true
    }

    const closeEditDialog = () => {
      if (submitting.value) {
        return
      }
      showEditDialog.value = false
    }

    const openResetPasswordDialog = (item) => {
      if (submitting.value) {
        return
      }
      resetForm.userId = item.id
      resetForm.username = item.username
      resetForm.newPassword = generatePassword(10)
      resetForm.forceChange = true
      showResetDialog.value = true
    }

    const closeResetDialog = () => {
      if (submitting.value) {
        return
      }
      showResetDialog.value = false
    }

    const fillRandomPassword = () => {
      resetForm.newPassword = generatePassword(12)
    }

    const updateMockUser = (id, patch) => {
      const index = mockUsers.value.findIndex((item) => item.id === id)
      if (index < 0) {
        return
      }
      mockUsers.value[index] = {
        ...mockUsers.value[index],
        ...patch
      }
    }

    const submitEditDialog = async () => {
      if (!editForm.username) {
        alert('用户名不能为空')
        return
      }
      if (editMode.value === 'create' && (!editForm.initialPassword || editForm.initialPassword.length < 6)) {
        alert('初始密码至少 6 位')
        return
      }

      const payload = {
        username: editForm.username,
        displayName: editForm.displayName,
        phone: editForm.phone,
        email: editForm.email,
        roleCode: editForm.roleCode,
        status: editForm.status,
        enabled: editForm.status === 'ENABLED',
        remark: editForm.remark
      }
      if (editMode.value === 'create') {
        payload.initialPassword = editForm.initialPassword
      }

      submitting.value = true
      try {
        if (usingMockData.value) {
          if (editMode.value === 'create') {
            const maxId = mockUsers.value.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
            mockUsers.value.unshift({
              id: maxId + 1,
              username: payload.username,
              displayName: payload.displayName,
              phone: payload.phone,
              email: payload.email,
              roleCode: payload.roleCode,
              status: payload.status,
              lastLoginTime: '',
              createTime: formatCurrentTime(),
              remark: payload.remark
            })
          } else {
            updateMockUser(editForm.id, payload)
          }
        } else if (editMode.value === 'create') {
          await createSystemUser(payload)
        } else {
          await updateSystemUser(editForm.id, payload)
        }

        showEditDialog.value = false
        await fetchUsers()
        alert(editMode.value === 'create' ? '用户新增成功' : '用户更新成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '保存失败，请稍后重试'))
      } finally {
        submitting.value = false
      }
    }

    const toggleStatus = async (item) => {
      const nextStatus = item.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'

      submitting.value = true
      try {
        if (usingMockData.value) {
          updateMockUser(item.id, {status: nextStatus})
        } else {
          await updateSystemUserStatus(item.id, {
            status: nextStatus,
            enabled: nextStatus === 'ENABLED'
          })
        }
        await fetchUsers()
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '状态更新失败'))
      } finally {
        submitting.value = false
      }
    }

    const submitResetPassword = async () => {
      if (!resetForm.newPassword || resetForm.newPassword.length < 6) {
        alert('新密码至少 6 位')
        return
      }

      submitting.value = true
      try {
        if (!usingMockData.value) {
          await resetSystemUserPassword(resetForm.userId, {
            newPassword: resetForm.newPassword,
            forceChange: resetForm.forceChange
          })
        }
        showResetDialog.value = false
        alert(usingMockData.value ? `演示模式：密码已重置为 ${resetForm.newPassword}` : '密码重置成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '重置密码失败'))
      } finally {
        submitting.value = false
      }
    }

    const removeUser = async (item) => {
      const confirmed = confirm(`确认删除用户【${item.username}】吗？`)
      if (!confirmed) {
        return
      }

      submitting.value = true
      try {
        if (usingMockData.value) {
          mockUsers.value = mockUsers.value.filter((user) => user.id !== item.id)
        } else {
          await deleteSystemUser(item.id)
        }
        await fetchUsers()
        alert('删除成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '删除失败'))
      } finally {
        submitting.value = false
      }
    }

    const batchUpdateStatus = async (targetStatus) => {
      if (!selectedIds.value.length) {
        alert('请先选择用户')
        return
      }

      const actionText = targetStatus === 'ENABLED' ? '启用' : '禁用'
      const confirmed = confirm(`确认批量${actionText}已选用户吗？`)
      if (!confirmed) {
        return
      }

      submitting.value = true
      try {
        if (usingMockData.value) {
          selectedIds.value.forEach((id) => {
            updateMockUser(id, {status: targetStatus})
          })
        } else {
          await Promise.all(
            selectedIds.value.map((id) => updateSystemUserStatus(id, {
              status: targetStatus,
              enabled: targetStatus === 'ENABLED'
            }))
          )
        }
        await fetchUsers()
        alert(`批量${actionText}成功`)
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, `批量${actionText}失败`))
      } finally {
        submitting.value = false
      }
    }

    const batchDelete = async () => {
      if (!selectedIds.value.length) {
        alert('请先选择用户')
        return
      }
      const confirmed = confirm(`确认删除选中的 ${selectedIds.value.length} 个用户吗？`)
      if (!confirmed) {
        return
      }

      submitting.value = true
      try {
        if (usingMockData.value) {
          const selectedSet = new Set(selectedIds.value)
          mockUsers.value = mockUsers.value.filter((item) => !selectedSet.has(item.id))
        } else {
          await Promise.all(selectedIds.value.map((id) => deleteSystemUser(id)))
        }
        await fetchUsers()
        alert('批量删除成功')
      } catch (error) {
        console.error(error)
        alert(extractErrorMessage(error, '批量删除失败'))
      } finally {
        submitting.value = false
      }
    }

    onMounted(() => {
      fetchUsers()
    })

    return {
      loading,
      submitting,
      usingMockData,
      users,
      selectedIds,
      filters,
      pagination,
      pageCount,
      allChecked,
      showEditDialog,
      editMode,
      editForm,
      showResetDialog,
      resetForm,
      goBackHome,
      searchUsers,
      resetFilters,
      changePage,
      changePageSize,
      toggleAll,
      toggleOne,
      formatRoleText,
      openCreateDialog,
      openEditDialog,
      closeEditDialog,
      submitEditDialog,
      toggleStatus,
      openResetPasswordDialog,
      closeResetDialog,
      fillRandomPassword,
      submitResetPassword,
      removeUser,
      batchUpdateStatus,
      batchDelete
    }
  }
}
</script>

<style scoped>
.user-page {
  width: 100%;
  height: 100%;
  padding: 18px 22px;
  color: #fff;
  overflow: auto;
}

.page-nav {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 12px;
}

.back-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  color: #fff;
  cursor: pointer;
  background: rgba(12, 32, 52, 0.58);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.back-home-btn:hover {
  transform: translateY(-1px);
  background: rgba(16, 40, 64, 0.76);
  border-color: rgba(255, 255, 255, 0.28);
}

.back-home-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.14);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.page-title {
  margin: 0;
  font-size: 26px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.panel {
  border-radius: 14px;
  background: rgba(12, 28, 50, 0.54);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
}

.filter-panel {
  padding: 14px 16px;
  margin-bottom: 12px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.field-item input,
.field-item select,
.field-item textarea {
  width: 100%;
  border: none;
  outline: none;
  border-radius: 8px;
  height: 36px;
  padding: 0 10px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.field-item textarea {
  height: auto;
  min-height: 64px;
  padding: 8px 10px;
  resize: vertical;
}

.field-item input::placeholder,
.field-item textarea::placeholder {
  color: rgba(255, 255, 255, 0.66);
}

.field-item option {
  color: #222;
}

.filter-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.table-panel {
  padding: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mock-tip {
  padding: 4px 8px;
  border-radius: 8px;
  color: #ffecb3;
  background: rgba(255, 184, 0, 0.2);
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

.mobile-user-list {
  display: none;
}

.mobile-user-card {
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
}

.mobile-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.mobile-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mobile-main-title {
  font-size: 15px;
  font-weight: 600;
  word-break: break-all;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mobile-card-grid p {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-card-grid span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}

.mobile-card-grid strong {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  word-break: break-word;
}

.mobile-card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.mobile-empty {
  padding: 24px 12px;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
}

.user-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
}

.user-table th,
.user-table td {
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  text-align: left;
  font-size: 13px;
}

.user-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.check-col {
  width: 48px;
}

.action-col {
  width: 270px;
  white-space: nowrap;
}

.empty-cell {
  text-align: center !important;
  color: rgba(255, 255, 255, 0.7);
  padding: 28px 8px !important;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  height: 24px;
  border-radius: 999px;
  font-size: 12px;
  padding: 0 10px;
}

.status-tag.on {
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.28);
}

.status-tag.off {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.26);
}

.pager {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-left select {
  border: none;
  outline: none;
  border-radius: 8px;
  height: 32px;
  padding: 0 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pager-left option {
  color: #222;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.dialog {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 30px);
  overflow: auto;
  border-radius: 12px;
  background: rgba(13, 31, 56, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 14px 14px 12px;
}

.dialog.narrow {
  max-width: 440px;
}

.dialog-title {
  margin: 2px 0 12px;
  font-size: 18px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.hint-text {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}

.checkbox-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

.dialog-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.ghost-btn,
.action-btn,
.danger-btn,
.mini-btn {
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
}

.ghost-btn,
.action-btn,
.danger-btn {
  height: 34px;
  min-width: 82px;
  padding: 0 12px;
}

.mini-btn {
  height: 28px;
  min-width: 54px;
  padding: 0 8px;
  margin-right: 6px;
  background: rgba(255, 255, 255, 0.18);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.18);
}

.action-btn {
  background: rgba(76, 170, 255, 0.72);
}

.danger-btn,
.mini-btn.danger {
  background: rgba(239, 68, 68, 0.65);
}

.ghost-btn:disabled,
.action-btn:disabled,
.danger-btn:disabled,
.mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .user-page {
    padding: 12px;
  }

  .hero-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .pager,
  .filter-actions {
    align-items: stretch;
  }

  .filter-actions,
  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right {
    width: 100%;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .toolbar-left .danger-btn,
  .pager-right .ghost-btn {
    flex: 1 1 calc(50% - 4px);
  }

  .dialog {
    max-width: none;
    padding: 12px;
  }

  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex: 1 1 calc(50% - 4px);
  }

  .desktop-table-wrap {
    display: none;
  }

  .mobile-user-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .mobile-card-grid {
    grid-template-columns: 1fr;
  }

  .mobile-card-actions .mini-btn {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
    margin-right: 0;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .toolbar-left .danger-btn,
  .pager-right .ghost-btn,
  .dialog-actions .ghost-btn,
  .dialog-actions .action-btn {
    flex-basis: 100%;
  }
}
</style>
