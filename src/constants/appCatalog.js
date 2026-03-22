export const APP_SECURITY_LEVEL_OPTIONS = [
  {value: 'PUBLIC', label: '公开'},
  {value: 'INTERNAL', label: '内部'},
  {value: 'CONFIDENTIAL', label: '受限'}
]

export const APP_ENCRYPTION_MODE_OPTIONS = [
  {value: 'NONE', label: '无额外加密'},
  {value: 'FIELD', label: '字段加密'},
  {value: 'END_TO_END', label: '端到端加密'}
]

export const APP_ICON_TYPE_OPTIONS = [
  {value: 'PRESET', label: '预设图标'},
  {value: 'UPLOAD', label: '本地上传'},
  {value: 'URL', label: '图片地址'},
  {value: 'TEXT', label: '文本图标'}
]

export const APP_STATUS_OPTIONS = [
  {value: 'ENABLED', label: '启用'},
  {value: 'DISABLED', label: '停用'}
]

export const APP_DATA_SOURCE_OPTIONS = [
  {value: 'REAL', label: '真实数据'},
  {value: 'DEMO', label: '演示数据'}
]

export const USER_APP_DEFINITIONS = [
  {
    key: 'calculator',
    name: '计算器',
    featureCode: 'APP_CALCULATOR',
    route: '/calculator',
    category: '效率工具',
    dataSourceMode: 'REAL',
    securityLevel: 'PUBLIC',
    encryptionMode: 'NONE',
    description: '日常数值计算与公式换算。'
  },
  {
    key: 'work-log',
    name: '工作日志',
    featureCode: 'APP_WORK_LOG',
    route: '/work-log',
    category: '办公协同',
    dataSourceMode: 'REAL',
    securityLevel: 'INTERNAL',
    encryptionMode: 'FIELD',
    description: '记录工作日报、项目投入与工时信息。'
  },
  {
    key: 'password-vault',
    name: '密码备忘录',
    featureCode: 'APP_PASSWORD_MEMO',
    route: '/password-memo',
    category: '安全工具',
    dataSourceMode: 'REAL',
    securityLevel: 'CONFIDENTIAL',
    encryptionMode: 'END_TO_END',
    description: '管理账号密码、校验访问口令并控制明文查看。'
  },
  {
    key: 'todo-list',
    name: '待办列表',
    featureCode: 'APP_TODO_LIST',
    route: '/todo-list',
    category: '效率工具',
    dataSourceMode: 'REAL',
    securityLevel: 'INTERNAL',
    encryptionMode: 'NONE',
    description: '安排任务清单、提醒与子任务进度。'
  },
  {
    key: 'fuel-stats',
    name: '油耗统计',
    featureCode: 'APP_FUEL_STATS',
    route: '/fuel-stats',
    category: '个人生活',
    dataSourceMode: 'REAL',
    securityLevel: 'PUBLIC',
    encryptionMode: 'NONE',
    description: '追踪车辆油耗、里程与加油成本。'
  },
  {
    key: 'wow-character',
    name: 'WoW角色统计',
    featureCode: 'APP_WOW_CHARACTER',
    route: '/wow-character-stats',
    category: '个人兴趣',
    dataSourceMode: 'REAL',
    securityLevel: 'PUBLIC',
    encryptionMode: 'NONE',
    description: '维护角色信息、评分与副本表现。'
  },
  {
    key: 'personal-bills',
    name: '个人账单',
    featureCode: 'APP_PERSONAL_BILLS',
    route: '/personal-bills',
    category: '财务管理',
    dataSourceMode: 'REAL',
    securityLevel: 'CONFIDENTIAL',
    encryptionMode: 'FIELD',
    description: '查看收入支出、预算和资金分布。'
  },
  {
    key: 'knowledge-base',
    name: '经验库',
    featureCode: 'APP_KNOWLEDGE_BASE',
    route: '/knowledge-base',
    category: '知识沉淀',
    dataSourceMode: 'REAL',
    securityLevel: 'INTERNAL',
    encryptionMode: 'NONE',
    description: '沉淀经验文档、流程规范和可复用方案。'
  },
  {
    key: 'software-repo',
    name: '软件仓库',
    featureCode: 'APP_SOFTWARE_REPO',
    route: '/software-repo',
    category: '资产管理',
    dataSourceMode: 'REAL',
    securityLevel: 'INTERNAL',
    encryptionMode: 'NONE',
    description: '管理软件资产、来源与版本信息。'
  },
  {
    key: 'health-record',
    name: '健康',
    featureCode: 'APP_HEALTH_RECORD',
    route: '/health',
    category: '个人生活',
    dataSourceMode: 'REAL',
    securityLevel: 'CONFIDENTIAL',
    encryptionMode: 'FIELD',
    description: '记录体征、指标和健康趋势。'
  }
]

export const RESERVED_SYSTEM_CAPABILITIES = [
  {
    key: 'app-management',
    name: '应用管理',
    status: '前端已接入',
    description: '当前可维护应用名称、图标、数据来源、密级、加密方式、排序与上下线状态。'
  },
  {
    key: 'permission-log',
    name: '系统日志',
    status: '预留',
    description: '后续接入授权变更、访问审计、异常告警与操作留痕。'
  }
]
