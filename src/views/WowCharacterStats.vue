<template>
  <div class="wow-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">WoW角色统计</h1>
        <p class="page-subtitle">记录魔兽世界正式服角色信息，优先展示装等最高的 2 个常用角色，并按职业色呈现角色数据。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">已接真实接口</span>
        <span class="hero-tag">角色总数 {{ overview.totalCharacters }}</span>
        <span class="hero-tag">最高装等 {{ overview.highestItemLevel || 0 }}</span>
      </div>
    </div>

    <section class="spotlight-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">主角色名片</h2>
          <p class="panel-tip">按装等排序展示最常用的 2 个主角色，卡面信息参考 Battle.net 风格并融入阵营水印。</p>
        </div>
      </div>

      <div class="spotlight-grid">
        <article
          v-for="item in featuredCharacters"
          :key="item.id"
          class="character-card"
          :style="buildCardStyle(item)"
        >
          <div class="character-card-inner">
            <div class="character-watermark">{{ item.faction === 'HORDE' ? 'H' : 'A' }}</div>

            <div class="card-top">
              <div class="avatar-badge" :style="buildAvatarStyle(item)">
                <span>{{ buildAvatarText(item.characterName) }}</span>
              </div>
              <div class="card-title-wrap">
                <div class="title-line">
                  <strong class="character-name">{{ item.characterName }}</strong>
                  <span class="spec-chip">{{ formatSpecText(item.specName) || item.className }}</span>
                </div>
                <p class="card-subtitle">
                  {{ formatRaceText(item.raceName) }} · {{ item.className }} · {{ formatFactionText(item.faction) }} · {{ item.realmName }}
                </p>
              </div>
            </div>

            <div class="card-stats">
              <div class="card-stat">
                <span>装等</span>
                <strong>{{ item.itemLevel || 0 }}</strong>
              </div>
              <div class="card-stat">
                <span>M+ 评分</span>
                <strong>{{ item.mythicScore || 0 }}</strong>
              </div>
              <div class="card-stat">
                <span>钥石副本</span>
                <strong>{{ formatMythicDungeonText(item) }}</strong>
              </div>
            </div>

            <div class="card-meta">
              <span>等级 {{ item.level }}</span>
              <span>{{ formatProfessionText(item) }}</span>
              <span>{{ classMetaMap[item.className]?.label || item.className }}</span>
            </div>
          </div>
        </article>

        <article
          v-for="placeholder in Math.max(0, 2 - featuredCharacters.length)"
          :key="`placeholder-${placeholder}`"
          class="character-card empty-card"
        >
          <div class="empty-card-content">
            <strong>暂无更多主角色</strong>
            <span>新增角色后会按装等自动进入主角色展示位</span>
          </div>
        </article>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="field">
          <span>关键词</span>
          <input
            v-model.trim="query.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索角色名、服务器、种族、专业"
            @keyup.enter="handleSearch"
          />
        </label>

        <label class="field">
          <span>阵营</span>
          <select v-model="query.faction" class="input">
            <option value="">全部阵营</option>
            <option v-for="item in factionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <label class="field">
          <span>职业</span>
          <select v-model="query.className" class="input">
            <option value="">全部职业</option>
            <option v-for="item in classOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="handleSearch">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetQuery">重置</button>
      </div>
    </section>

    <div class="content-layout">
      <section class="list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">角色列表</h2>
            <p class="panel-tip">主列表保留正式服角色核心信息，颜色按 13 职业色和联盟 / 部落色区分。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增角色</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadCharacters">刷新列表</button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
          </div>
        </div>

        <div v-if="loading && !pagedRecords.length" class="empty-state">加载中...</div>

        <template v-else>
          <div v-if="pagedRecords.length" class="table-wrap desktop-table">
            <table class="character-table">
              <thead>
              <tr>
                <th>角色名</th>
                <th>职业 / 专精</th>
                <th>种族</th>
                <th>服务器</th>
                <th>阵营</th>
                <th>等级</th>
                <th>装等</th>
                <th>大秘境副本</th>
                <th>大秘境评分</th>
                <th>专业</th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="item in pagedRecords" :key="item.id">
                <td>
                  <span
                    class="name-badge"
                    :style="buildNameBadgeStyle(item)"
                  >
                    {{ item.characterName }}
                  </span>
                </td>
                <td>
                  <div class="class-cell">
                    <span class="class-dot" :style="{background: getClassMeta(item.className).color}"></span>
                    <span>{{ item.className }}</span>
                    <span class="cell-muted">{{ formatSpecText(item.specName) || '-' }}</span>
                  </div>
                </td>
                <td>{{ formatRaceText(item.raceName) }}</td>
                <td>{{ item.realmName || '-' }}</td>
                <td>
                  <span class="faction-chip" :class="item.faction === 'HORDE' ? 'horde' : 'alliance'">
                    {{ formatFactionText(item.faction) }}
                  </span>
                </td>
                <td>{{ item.level || 0 }}</td>
                <td>{{ item.itemLevel || 0 }}</td>
                <td>{{ formatMythicDungeonText(item) }}</td>
                <td>{{ item.mythicScore || 0 }}</td>
                <td>{{ formatProfessionText(item) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                    <button class="mini-btn danger" @click="removeCharacter(item)">删除</button>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pagedRecords.length" class="mobile-list">
            <article
              v-for="item in pagedRecords"
              :key="item.id"
              class="mobile-card"
              :style="buildMobileCardStyle(item)"
            >
              <div class="mobile-card-head">
                <div>
                  <h3 class="mobile-card-title">{{ item.characterName }}</h3>
                  <p class="mobile-card-subtitle">{{ item.className }} · {{ formatSpecText(item.specName) || '-' }} · {{ item.realmName }}</p>
                </div>
                <span class="faction-chip" :class="item.faction === 'HORDE' ? 'horde' : 'alliance'">
                  {{ formatFactionText(item.faction) }}
                </span>
              </div>

              <div class="mobile-card-grid">
                <p><span>装等</span><strong>{{ item.itemLevel || 0 }}</strong></p>
                <p><span>评分</span><strong>{{ item.mythicScore || 0 }}</strong></p>
                <p><span>副本</span><strong>{{ formatMythicDungeonText(item) }}</strong></p>
                <p><span>等级</span><strong>{{ item.level || 0 }}</strong></p>
                <p><span>种族</span><strong>{{ formatRaceText(item.raceName) }}</strong></p>
                <p class="wide"><span>专业</span><strong>{{ formatProfessionText(item) }}</strong></p>
              </div>

              <div class="mobile-card-actions">
                <button class="mini-btn" @click="openEditDialog(item)">编辑</button>
                <button class="mini-btn danger" @click="removeCharacter(item)">删除</button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">暂无角色记录</div>
        </template>

        <div class="pager">
          <div class="pager-left">
            <span>第 {{ query.pageNo }} / {{ totalPages }} 页</span>
            <select v-model.number="query.pageSize" class="pager-select" :disabled="loading" @change="handlePageSizeChange">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} 条/页</option>
            </select>
          </div>
          <div class="pager-right">
            <button class="ghost-btn" :disabled="query.pageNo <= 1 || loading" @click="changePage(-1)">上一页</button>
            <button class="ghost-btn" :disabled="query.pageNo >= totalPages || loading" @click="changePage(1)">下一页</button>
          </div>
        </div>
      </section>

      <aside class="insight-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">角色概览</h2>
            <p class="panel-tip">快速查看当前账号的角色规模、阵营分布、职业分布和活跃服务器。</p>
          </div>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>总角色数</span>
            <strong>{{ overview.totalCharacters }}</strong>
          </article>
          <article class="summary-card">
            <span>平均装等</span>
            <strong>{{ overview.averageItemLevel }}</strong>
          </article>
          <article class="summary-card">
            <span>最高大秘境评分</span>
            <strong>{{ overview.highestMythicScore }}</strong>
          </article>
          <article class="summary-card">
            <span>服务器数量</span>
            <strong>{{ overview.totalRealms }}</strong>
          </article>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">阵营分布</h3>
            <span>{{ factionStats.length }} 类</span>
          </div>
          <div class="stats-list">
            <div v-for="item in factionStats" :key="item.label" class="stats-row">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }} 个角色</span>
              </div>
              <b>{{ item.ratio }}</b>
            </div>
          </div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">职业分布</h3>
            <span>{{ classStats.length }} 职业</span>
          </div>
          <div class="class-stat-list">
            <div
              v-for="item in classStats"
              :key="item.className"
              class="class-stat-item"
              :style="buildClassStatStyle(item.className)"
            >
              <strong>{{ item.className }}</strong>
              <span>{{ item.count }} 个角色 · 平均装等 {{ item.averageItemLevel }}</span>
            </div>
          </div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">活跃服务器</h3>
            <span>{{ realmStats.length }} 个</span>
          </div>
          <div class="stats-list">
            <div v-for="item in realmStats" :key="item.realmName" class="stats-row">
              <div>
                <strong>{{ item.realmName }}</strong>
                <span>{{ item.count }} 个角色</span>
              </div>
              <b>最高 {{ item.highestItemLevel }}</b>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="showDialog" class="dialog-mask" @click.self="closeDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ dialogMode === 'create' ? '新增角色信息' : '编辑角色信息' }}</h3>
        <form class="dialog-form" @submit.prevent="submitDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>角色名</span>
              <input v-model.trim="form.characterName" class="input" maxlength="32" placeholder="例如：风渐渐" required />
            </label>
            <label class="form-field">
              <span>职业</span>
              <select v-model="form.className" class="input" required>
                <option v-for="item in classOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>专精</span>
              <select v-model="form.specName" class="input" required>
                <option value="">请选择专精</option>
                <option v-for="item in availableSpecOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label class="form-field">
              <span>种族</span>
              <select v-model="form.raceName" class="input" required>
                <option value="">请选择种族</option>
                <option v-for="item in availableRaceOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>服务器</span>
              <input v-model.trim="form.realmName" class="input" maxlength="32" placeholder="例如：影之哀伤" required />
            </label>
            <label class="form-field">
              <span>阵营</span>
              <select v-model="form.faction" class="input" required>
                <option v-for="item in formFactionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>等级</span>
              <input v-model.number="form.level" class="input" type="number" min="1" max="90" required />
            </label>
            <label class="form-field">
              <span>装等</span>
              <input v-model.number="form.itemLevel" class="input" type="number" min="0" max="999" required />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>钥石层数</span>
              <input v-model.number="form.mythicBestLevel" class="input" type="number" min="0" max="40" placeholder="例如：12" />
            </label>
            <label class="form-field">
              <span>大秘境副本</span>
              <select v-model="form.mythicDungeonName" class="input">
                <option value="">未设置</option>
                <option v-for="item in mythicDungeonOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>大秘境评分</span>
              <input v-model.number="form.mythicScore" class="input" type="number" min="0" max="9999" placeholder="例如：3125" />
            </label>
            <label class="form-field">
              <span>&nbsp;</span>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>专业 1</span>
              <select v-model="form.professionPrimary" class="input">
                <option value="">未设置</option>
                <option v-for="item in availablePrimaryProfessionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label class="form-field">
              <span>专业 2</span>
              <select v-model="form.professionSecondary" class="input">
                <option value="">未设置</option>
                <option v-for="item in availableSecondaryProfessionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.note" class="input textarea" rows="3" maxlength="160" placeholder="补充记录当前版本定位、账号用途等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存角色' : '更新角色') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import {listDataDictionaryOptionsByUsage} from '@/api/dataDictionary'
import {
  WOW_CLASS_RULES,
  getAllowedFactionsByRaceCode,
  getAllowedRaceCodesByClassCode,
  getAllowedSpecCodesByClassCode
} from '@/constants/wowCharacterRules'
import {
  createWowCharacter,
  deleteWowCharacter,
  getWowCharacterOverview,
  listWowCharacters,
  updateWowCharacter
} from '@/api/wowCharacter'

const PAGE_SIZE_OPTIONS = [8, 12, 20]
const WOW_APP_CODE = 'APP_WOW_CHARACTER'
const WOW_MODULE_CODE = 'WOW_CHARACTER'
const FACTION_FIELD_CODE = 'faction'
const CLASS_NAME_FIELD_CODE = 'className'
const RACE_NAME_FIELD_CODE = 'raceName'
const SPEC_NAME_FIELD_CODE = 'specName'
const MYTHIC_DUNGEON_FIELD_CODE = 'mythicDungeonName'
const PROFESSION_PRIMARY_FIELD_CODE = 'professionPrimary'
const DEFAULT_FACTION_VALUE = 'ALLIANCE'

function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

function classColorToRgba(hex, alpha) {
  const value = hex.replace('#', '')
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function getClassMetaByName(classMetaMap, className) {
  return classMetaMap[className] || {
    value: className || '未知职业',
    label: className || '未知职业',
    color: '#64748b',
    textColor: '#ffffff'
  }
}

function normalizeDictionaryOptions(payload, extrasResolver) {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload
    .map((item) => {
      const option = {
        itemCode: item?.itemCode || item?.code || '',
        label: item?.itemLabel || item?.label || item?.itemValue || item?.value || '',
        value: item?.itemValue || item?.value || item?.itemCode || item?.code || '',
        isDefault: Boolean(item?.isDefault)
      }
      return {
        ...option,
        ...(extrasResolver ? extrasResolver(option, item) : {})
      }
    })
    .filter((item) => item.value)
}

function findOptionByAny(options, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null
  }
  return options.find((item) => item.value === rawValue || item.itemCode === rawValue || item.label === rawValue) || null
}

function normalizeSelectedValue(options, rawValue, fallback = '') {
  return findOptionByAny(options, rawValue)?.value || fallback
}

function getOptionLabel(options, rawValue, fallback = '-') {
  return findOptionByAny(options, rawValue)?.label || fallback
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function toNumber(value, defaultValue = 0) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : defaultValue
}

function normalizeStatList(list, mapper) {
  return Array.isArray(list) ? list.map((item) => mapper(item || {})) : []
}

function normalizeCharacter(item = {}) {
  return {
    id: item.id ?? item.characterId ?? '',
    characterName: item.characterName || item.name || '',
    className: item.className || item.characterClass || '',
    specName: item.specName || item.specialization || '',
    raceName: item.raceName || item.race || '',
    realmName: item.realmName || item.realm || '',
    faction: item.faction || DEFAULT_FACTION_VALUE,
    level: toNumber(item.level, 90),
    itemLevel: toNumber(item.itemLevel ?? item.gearLevel, 0),
    mythicDungeonName: item.mythicDungeonName || item.mythicDungeon || item.bestDungeonName || item.keystoneName || '',
    mythicBestLevel: toNumber(item.mythicBestLevel ?? item.mythicLevel, 0),
    mythicScore: toNumber(item.mythicScore ?? item.mythicRating, 0),
    professionPrimary: item.professionPrimary || item.profession1 || '',
    professionSecondary: item.professionSecondary || item.profession2 || '',
    note: item.note || item.remark || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function sortCharacters(list = []) {
  return [...list].sort((prev, next) => (
    Number(next.itemLevel || 0) - Number(prev.itemLevel || 0)
    || Number(next.mythicScore || 0) - Number(prev.mythicScore || 0)
    || `${prev.characterName}`.localeCompare(`${next.characterName}`)
  ))
}

function normalizeOverview(payload = {}) {
  return {
    totalCharacters: toNumber(payload.totalCharacters, 0),
    totalRealms: toNumber(payload.totalRealms, 0),
    highestItemLevel: toNumber(payload.highestItemLevel, 0),
    highestMythicScore: toNumber(payload.highestMythicScore, 0),
    averageItemLevel: toNumber(payload.averageItemLevel, 0),
    featuredCharacters: normalizeStatList(payload.featuredCharacters, normalizeCharacter),
    factionStats: normalizeStatList(payload.factionStats, (item) => ({
      label: item.label || item.name || '-',
      count: toNumber(item.count, 0),
      ratio: item.ratio || '0%'
    })),
    classStats: normalizeStatList(payload.classStats, (item) => ({
      className: item.className || '-',
      count: toNumber(item.count, 0),
      averageItemLevel: toNumber(item.averageItemLevel, 0)
    })),
    realmStats: normalizeStatList(payload.realmStats, (item) => ({
      realmName: item.realmName || '-',
      count: toNumber(item.count, 0),
      highestItemLevel: toNumber(item.highestItemLevel, 0)
    }))
  }
}

export default {
  name: 'WowCharacterStats',
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const featuredCharacters = ref([])
    const factionStats = ref([])
    const classStats = ref([])
    const realmStats = ref([])
    const showDialog = ref(false)
    const dialogMode = ref('create')
    const editingId = ref('')
    const factionOptions = ref([])
    const classOptions = ref([])
    const raceOptions = ref([])
    const specOptions = ref([])
    const professionOptions = ref([])
    const mythicDungeonOptions = ref([])

    const query = reactive({
      keyword: '',
      faction: '',
      className: '',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const form = reactive({
      characterName: '',
      className: '',
      specName: '',
      raceName: '',
      realmName: '',
      faction: DEFAULT_FACTION_VALUE,
      level: 90,
      itemLevel: 0,
      mythicDungeonName: '',
      mythicBestLevel: 0,
      mythicScore: 0,
      professionPrimary: '',
      professionSecondary: '',
      note: ''
    })

    const overview = reactive({
      totalCharacters: 0,
      totalRealms: 0,
      highestItemLevel: 0,
      highestMythicScore: 0,
      averageItemLevel: 0
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const classMetaMap = computed(() => classOptions.value.reduce((result, item) => {
      const style = WOW_CLASS_RULES[item.itemCode]?.style || {color: '#64748b', textColor: '#ffffff'}
      const meta = {
        value: item.value,
        label: item.label,
        color: style.color,
        textColor: style.textColor
      }
      result[item.value] = meta
      result[item.label] = meta
      result[item.itemCode] = meta
      return result
    }, {}))
    const formFactionOptions = computed(() => {
      const raceOption = findOptionByAny(raceOptions.value, form.raceName)
      if (!raceOption) {
        return factionOptions.value
      }
      const allowedFactions = new Set(getAllowedFactionsByRaceCode(raceOption.itemCode))
      return factionOptions.value.filter((item) => allowedFactions.has(item.value))
    })
    const availableRaceOptions = computed(() => {
      const classOption = findOptionByAny(classOptions.value, form.className)
      const allowedRaceCodes = classOption ? new Set(getAllowedRaceCodesByClassCode(classOption.itemCode)) : null
      return raceOptions.value.filter((item) => {
        const matchesClass = !allowedRaceCodes || allowedRaceCodes.has(item.itemCode)
        const matchesFaction = !form.faction || getAllowedFactionsByRaceCode(item.itemCode).includes(form.faction)
        return matchesClass && matchesFaction
      })
    })
    const availableSpecOptions = computed(() => {
      const classOption = findOptionByAny(classOptions.value, form.className)
      if (!classOption) {
        return []
      }
      const allowedSpecCodes = new Set(getAllowedSpecCodesByClassCode(classOption.itemCode))
      return specOptions.value.filter((item) => allowedSpecCodes.has(item.itemCode))
    })
    const availablePrimaryProfessionOptions = computed(() => professionOptions.value.filter((item) => item.value !== form.professionSecondary))
    const availableSecondaryProfessionOptions = computed(() => professionOptions.value.filter((item) => item.value !== form.professionPrimary))

    const getDefaultFactionValue = () => {
      const matched = factionOptions.value.find((item) => item.value === DEFAULT_FACTION_VALUE)
      return matched?.value || factionOptions.value[0]?.value || DEFAULT_FACTION_VALUE
    }

    const getDefaultClassValue = () => classOptions.value.find((item) => item.isDefault)?.value || classOptions.value[0]?.value || ''

    const normalizeFormSelections = () => {
      form.className = normalizeSelectedValue(classOptions.value, form.className, getDefaultClassValue())
      form.faction = normalizeSelectedValue(factionOptions.value, form.faction, getDefaultFactionValue())
      form.raceName = normalizeSelectedValue(raceOptions.value, form.raceName, '')
      form.specName = normalizeSelectedValue(specOptions.value, form.specName, '')
      form.professionPrimary = normalizeSelectedValue(professionOptions.value, form.professionPrimary, '')
      form.professionSecondary = normalizeSelectedValue(professionOptions.value, form.professionSecondary, '')
      if (!formFactionOptions.value.some((item) => item.value === form.faction)) {
        form.faction = formFactionOptions.value[0]?.value || getDefaultFactionValue()
      }
      if (form.raceName && !availableRaceOptions.value.some((item) => item.value === form.raceName)) {
        form.raceName = ''
      }
      if (form.specName && !availableSpecOptions.value.some((item) => item.value === form.specName)) {
        form.specName = ''
      }
      if (query.faction) {
        query.faction = normalizeSelectedValue(factionOptions.value, query.faction, '')
      }
      if (query.className) {
        query.className = normalizeSelectedValue(classOptions.value, query.className, '')
      }
    }

    const loadDictionaryOptions = async () => {
      try {
        const [factionRes, classRes, raceRes, specRes, professionRes, mythicDungeonRes] = await Promise.all([
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: FACTION_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: CLASS_NAME_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: RACE_NAME_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: SPEC_NAME_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: PROFESSION_PRIMARY_FIELD_CODE
          }),
          listDataDictionaryOptionsByUsage({
            appCode: WOW_APP_CODE,
            moduleCode: WOW_MODULE_CODE,
            bizFieldCode: MYTHIC_DUNGEON_FIELD_CODE
          })
        ])
        factionOptions.value = normalizeDictionaryOptions(unwrapData(factionRes))
        classOptions.value = normalizeDictionaryOptions(unwrapData(classRes))
        raceOptions.value = normalizeDictionaryOptions(unwrapData(raceRes))
        specOptions.value = normalizeDictionaryOptions(unwrapData(specRes))
        professionOptions.value = normalizeDictionaryOptions(unwrapData(professionRes))
        mythicDungeonOptions.value = normalizeDictionaryOptions(unwrapData(mythicDungeonRes))
        normalizeFormSelections()
      } catch (error) {
        factionOptions.value = []
        classOptions.value = []
        raceOptions.value = []
        specOptions.value = []
        professionOptions.value = []
        mythicDungeonOptions.value = []
        alert(getErrorMessage(error, 'WoW角色字典选项加载失败'))
      }
    }

    const resetOverview = () => {
      overview.totalCharacters = 0
      overview.totalRealms = 0
      overview.highestItemLevel = 0
      overview.highestMythicScore = 0
      overview.averageItemLevel = 0
      featuredCharacters.value = []
      factionStats.value = []
      classStats.value = []
      realmStats.value = []
    }

    const applyOverview = (payload = {}) => {
      const nextOverview = normalizeOverview(payload)
      overview.totalCharacters = nextOverview.totalCharacters
      overview.totalRealms = nextOverview.totalRealms
      overview.highestItemLevel = nextOverview.highestItemLevel
      overview.highestMythicScore = nextOverview.highestMythicScore
      overview.averageItemLevel = nextOverview.averageItemLevel
      featuredCharacters.value = nextOverview.featuredCharacters
      factionStats.value = nextOverview.factionStats
      classStats.value = nextOverview.classStats
      realmStats.value = nextOverview.realmStats
    }

    const loadOverview = async () => {
      try {
        const overviewRes = await getWowCharacterOverview()
        applyOverview(unwrapData(overviewRes) || {})
      } catch (error) {
        resetOverview()
        alert(getErrorMessage(error, 'WoW角色概览加载失败'))
      }
    }

    const loadCharacters = async () => {
      loading.value = true
      try {
        const listRes = await listWowCharacters({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined,
          faction: query.faction || undefined,
          className: query.className || undefined
        })
        const payload = unwrapData(listRes) || {}
        const rawList = Array.isArray(payload)
          ? payload
          : (payload.list || payload.records || payload.rows || [])
        const normalizedList = sortCharacters(rawList.map((item) => normalizeCharacter(item)))
        pagedRecords.value = normalizedList
        total.value = toNumber(payload.total ?? payload.count, normalizedList.length)
      } catch (error) {
        pagedRecords.value = []
        total.value = 0
        alert(getErrorMessage(error, 'WoW角色数据加载失败'))
        loading.value = false
        return
      } finally {
        loading.value = false
      }
    }

    const loadPageData = async () => {
      await loadCharacters()
      await loadOverview()
    }

    const resetForm = () => {
      form.characterName = ''
      form.className = getDefaultClassValue()
      form.specName = ''
      form.raceName = ''
      form.realmName = ''
      form.faction = getDefaultFactionValue()
      form.level = 90
      form.itemLevel = 0
      form.mythicDungeonName = ''
      form.mythicBestLevel = 0
      form.mythicScore = 0
      form.professionPrimary = ''
      form.professionSecondary = ''
      form.note = ''
    }

    const fillForm = (record) => {
      form.characterName = record.characterName || ''
      form.className = normalizeSelectedValue(classOptions.value, record.className, getDefaultClassValue())
      form.specName = normalizeSelectedValue(specOptions.value, record.specName, '')
      form.raceName = normalizeSelectedValue(raceOptions.value, record.raceName, '')
      form.realmName = record.realmName || ''
      form.faction = normalizeSelectedValue(factionOptions.value, record.faction, getDefaultFactionValue())
      form.level = Number(record.level || 90)
      form.itemLevel = Number(record.itemLevel || 0)
      form.mythicDungeonName = normalizeSelectedValue(mythicDungeonOptions.value, record.mythicDungeonName, '')
      form.mythicBestLevel = Number(record.mythicBestLevel || 0)
      form.mythicScore = Number(record.mythicScore || 0)
      form.professionPrimary = normalizeSelectedValue(professionOptions.value, record.professionPrimary, '')
      form.professionSecondary = normalizeSelectedValue(professionOptions.value, record.professionSecondary, '')
      form.note = record.note || ''
      normalizeFormSelections()
    }

    const openCreateDialog = () => {
      dialogMode.value = 'create'
      editingId.value = ''
      resetForm()
      showDialog.value = true
    }

    const openEditDialog = (item) => {
      dialogMode.value = 'edit'
      editingId.value = item.id
      fillForm(item)
      showDialog.value = true
    }

    const closeDialog = () => {
      if (submitting.value) {
        return
      }
      showDialog.value = false
      resetForm()
    }

    const buildFormPayload = () => ({
      characterName: form.characterName,
      className: form.className,
      specName: form.specName || null,
      raceName: form.raceName,
      realmName: form.realmName,
      faction: form.faction,
      level: Number(form.level || 0),
      itemLevel: Number(form.itemLevel || 0),
      mythicDungeonName: form.mythicDungeonName || null,
      mythicDungeon: form.mythicDungeonName || null,
      bestDungeonName: form.mythicDungeonName || null,
      mythicBestLevel: Number(form.mythicBestLevel || 0),
      mythicScore: Number(form.mythicScore || 0),
      professionPrimary: form.professionPrimary || null,
      professionSecondary: form.professionSecondary || null,
      note: form.note
    })

    const submitDialog = async () => {
      const classOption = findOptionByAny(classOptions.value, form.className)
      const raceOption = findOptionByAny(raceOptions.value, form.raceName)
      const specOption = findOptionByAny(specOptions.value, form.specName)
      if (!classOption) {
        alert('职业字典未加载完成')
        return
      }
      if (!specOption) {
        alert('请选择专精')
        return
      }
      if (!raceOption) {
        alert('请选择种族')
        return
      }
      if (!form.faction) {
        alert('阵营字典未加载完成')
        return
      }
      if (!form.characterName) {
        alert('请输入角色名')
        return
      }
      if (!form.realmName) {
        alert('请输入服务器')
        return
      }
      if (!getAllowedRaceCodesByClassCode(classOption.itemCode).includes(raceOption.itemCode)) {
        alert('当前职业不能选择这个种族')
        return
      }
      if (!getAllowedSpecCodesByClassCode(classOption.itemCode).includes(specOption.itemCode)) {
        alert('当前职业不能选择这个专精')
        return
      }
      if (!getAllowedFactionsByRaceCode(raceOption.itemCode).includes(form.faction)) {
        alert('当前种族不能选择这个阵营')
        return
      }
      if (form.professionPrimary && form.professionPrimary === form.professionSecondary) {
        alert('两个专业不能相同')
        return
      }
      if (form.mythicBestLevel > 0 && !form.mythicDungeonName) {
        alert('请输入大秘境副本')
        return
      }
      if (!form.mythicBestLevel && form.mythicDungeonName) {
        alert('请输入钥石层数')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildFormPayload()
      submitting.value = true
      try {
        if (dialogMode.value === 'create') {
          await createWowCharacter(payload)
        } else {
          await updateWowCharacter(editingId.value, payload)
        }
        showDialog.value = false
        resetForm()
        await loadPageData()
      } catch (error) {
        alert(getErrorMessage(error, dialogMode.value === 'create' ? '新增角色失败' : '更新角色失败'))
      } finally {
        submitting.value = false
      }
    }

    const removeCharacter = async (item) => {
      if (!window.confirm(`确认删除角色【${item.characterName}】吗？`)) {
        return
      }
      try {
        await deleteWowCharacter(item.id)
        await loadPageData()
      } catch (error) {
        alert(getErrorMessage(error, '删除角色失败'))
      }
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadCharacters()
    }

    const resetQuery = () => {
      query.keyword = ''
      query.faction = ''
      query.className = ''
      query.pageNo = 1
      query.pageSize = PAGE_SIZE_OPTIONS[0]
      loadCharacters()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadCharacters()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadCharacters()
    }

    const goBack = () => {
      router.push('/home')
    }

    const formatFactionText = (value) => getOptionLabel(factionOptions.value, value, value || '-')
    const formatSpecText = (value) => value ? getOptionLabel(specOptions.value, value, value) : ''
    const formatRaceText = (value) => value ? getOptionLabel(raceOptions.value, value, value) : '-'
    const formatProfessionValue = (value) => value ? getOptionLabel(professionOptions.value, value, value) : ''
    const formatMythicDungeonText = (item) => {
      const dungeonName = getOptionLabel(mythicDungeonOptions.value, item?.mythicDungeonName, item?.mythicDungeonName || '')
      const bestLevel = Number(item?.mythicBestLevel || 0)
      if (dungeonName && bestLevel > 0) {
        return `+${bestLevel} ${dungeonName}`
      }
      if (dungeonName) {
        return dungeonName
      }
      return bestLevel > 0 ? `+${bestLevel}` : '-'
    }
    const formatProfessionText = (item) => [formatProfessionValue(item.professionPrimary), formatProfessionValue(item.professionSecondary)].filter(Boolean).join(' / ') || '-'
    const buildAvatarText = (name) => `${name || '角'}`.slice(0, 2)
    const getClassMeta = (className) => getClassMetaByName(classMetaMap.value, className)

    const buildCardStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      return {
        '--card-accent': classMeta.color,
        '--card-accent-soft': classColorToRgba(classMeta.color, 0.24)
      }
    }

    const buildAvatarStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      return {
        background: `linear-gradient(135deg, ${classMeta.color}, rgba(12, 24, 40, 0.92))`,
        color: classMeta.textColor
      }
    }

    const buildNameBadgeStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      return {
        background: classMeta.color,
        color: classMeta.textColor
      }
    }

    const buildClassStatStyle = (className) => {
      const classMeta = getClassMeta(className)
      return {
        borderColor: classColorToRgba(classMeta.color, 0.42),
        background: classColorToRgba(classMeta.color, 0.16)
      }
    }

    const buildMobileCardStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      return {
        borderColor: classColorToRgba(classMeta.color, 0.36),
        boxShadow: `inset 0 1px 0 ${classColorToRgba(classMeta.color, 0.18)}`
      }
    }

    watch(() => form.className, () => {
      const normalized = normalizeSelectedValue(classOptions.value, form.className, getDefaultClassValue())
      if (normalized !== form.className) {
        form.className = normalized
        return
      }
      if (form.specName && !availableSpecOptions.value.some((item) => item.value === form.specName)) {
        form.specName = ''
      }
      if (form.raceName && !availableRaceOptions.value.some((item) => item.value === form.raceName)) {
        form.raceName = ''
      }
    })

    watch(() => form.faction, () => {
      const normalized = normalizeSelectedValue(factionOptions.value, form.faction, getDefaultFactionValue())
      if (normalized !== form.faction) {
        form.faction = normalized
        return
      }
      if (!formFactionOptions.value.some((item) => item.value === form.faction)) {
        form.faction = formFactionOptions.value[0]?.value || getDefaultFactionValue()
        return
      }
      if (form.raceName && !availableRaceOptions.value.some((item) => item.value === form.raceName)) {
        form.raceName = ''
      }
    })

    watch(() => form.raceName, () => {
      const normalized = normalizeSelectedValue(raceOptions.value, form.raceName, '')
      if (normalized !== form.raceName) {
        form.raceName = normalized
        return
      }
      const raceOption = findOptionByAny(raceOptions.value, form.raceName)
      if (!raceOption) {
        return
      }
      const allowedFactions = getAllowedFactionsByRaceCode(raceOption.itemCode)
      if (!allowedFactions.includes(form.faction)) {
        form.faction = formFactionOptions.value[0]?.value || allowedFactions[0] || getDefaultFactionValue()
      }
    })

    watch(() => form.specName, () => {
      const normalized = normalizeSelectedValue(specOptions.value, form.specName, '')
      if (normalized !== form.specName) {
        form.specName = normalized
      }
    })

    watch(() => form.professionPrimary, () => {
      const normalized = normalizeSelectedValue(professionOptions.value, form.professionPrimary, '')
      if (normalized !== form.professionPrimary) {
        form.professionPrimary = normalized
        return
      }
      if (form.professionPrimary && form.professionPrimary === form.professionSecondary) {
        form.professionSecondary = ''
      }
    })

    watch(() => form.professionSecondary, () => {
      const normalized = normalizeSelectedValue(professionOptions.value, form.professionSecondary, '')
      if (normalized !== form.professionSecondary) {
        form.professionSecondary = normalized
        return
      }
      if (form.professionSecondary && form.professionSecondary === form.professionPrimary) {
        form.professionPrimary = ''
      }
    })

    onMounted(async () => {
      await loadDictionaryOptions()
      await loadPageData()
    })

    return {
      loading,
      submitting,
      total,
      pagedRecords,
      featuredCharacters,
      factionStats,
      classStats,
      realmStats,
      query,
      form,
      overview,
      showDialog,
      dialogMode,
      pageSizeOptions,
      factionOptions,
      classOptions,
      raceOptions,
      specOptions,
      professionOptions,
      mythicDungeonOptions,
      classMetaMap,
      formFactionOptions,
      availableRaceOptions,
      availableSpecOptions,
      availablePrimaryProfessionOptions,
      availableSecondaryProfessionOptions,
      totalPages,
      handleSearch,
      resetQuery,
      changePage,
      handlePageSizeChange,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      submitDialog,
      removeCharacter,
      loadCharacters,
      loadOverview,
      goBack,
      formatFactionText,
      formatSpecText,
      formatRaceText,
      formatMythicDungeonText,
      formatProfessionText,
      buildAvatarText,
      getClassMeta,
      buildCardStyle,
      buildAvatarStyle,
      buildNameBadgeStyle,
      buildClassStatStyle,
      buildMobileCardStyle
    }
  }
}
</script>

<style scoped>
.wow-page {
  min-height: 100vh;
  height: 100%;
  padding: 18px 22px 26px;
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

.hero-panel,
.spotlight-panel,
.filter-panel,
.list-panel,
.insight-panel,
.dialog {
  border-radius: 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(135deg, rgba(7, 22, 39, 0.82), rgba(17, 49, 73, 0.72));
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(16px);
}

.hero-panel,
.spotlight-panel,
.filter-panel {
  margin-bottom: 14px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.stats-row,
.dialog-actions,
.mobile-card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.stats-row {
  justify-content: space-between;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title,
.mobile-card-title,
.character-name {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.mobile-card-subtitle,
.empty-card-content span {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.toolbar-left,
.toolbar-right,
.row-actions,
.mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.faction-chip,
.spec-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.hero-tag {
  background: rgba(91, 180, 255, 0.18);
  color: #d7f0ff;
}

.spotlight-grid,
.summary-grid,
.mobile-card-grid,
.form-inline-grid,
.filter-grid {
  display: grid;
  gap: 12px;
}

.spotlight-grid {
  margin-top: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.character-card {
  position: relative;
  min-height: 240px;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    radial-gradient(circle at top left, var(--card-accent-soft, rgba(255, 255, 255, 0.16)), transparent 48%),
    linear-gradient(135deg, rgba(8, 19, 38, 0.96), rgba(18, 45, 79, 0.9));
}

.character-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.06), transparent 30%),
    radial-gradient(circle at 92% 22%, rgba(255, 255, 255, 0.08), transparent 24%);
  pointer-events: none;
}

.character-card-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  padding: 22px;
}

.character-watermark {
  position: absolute;
  right: 14px;
  bottom: -10px;
  font-size: 180px;
  line-height: 1;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 78px;
  height: 78px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.16), 0 10px 18px rgba(0, 0, 0, 0.22);
  font-size: 22px;
  font-weight: 700;
}

.card-title-wrap {
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.character-name {
  font-size: 40px;
  letter-spacing: 1px;
}

.spec-chip {
  background: rgba(255, 218, 119, 0.18);
  color: #ffe7a0;
}

.card-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.74);
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.card-stat {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(4, 14, 28, 0.38);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-stat span,
.card-meta span,
.field span,
.form-field span,
.mobile-card-grid span,
.summary-card span,
.class-stat-item span,
.stats-row span,
.cell-muted {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.card-stat strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  line-height: 1.15;
  word-break: break-word;
  color: #ffd76e;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.card-meta span {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.empty-card {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(14, 28, 48, 0.8), rgba(21, 44, 70, 0.76));
}

.empty-card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.filter-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field,
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);
  gap: 14px;
}

.summary-grid {
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.class-stat-item,
.stats-row,
.mobile-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.summary-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card strong {
  font-size: 22px;
  line-height: 1.2;
}

.insight-block {
  margin-top: 16px;
}

.stats-list,
.class-stat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-row,
.class-stat-item {
  padding: 12px 14px;
}

.stats-row > div,
.class-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-stat-item {
  border-width: 1px;
  border-style: solid;
}

.toolbar {
  margin-top: 14px;
}

.action-btn,
.ghost-btn,
.mini-btn {
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
}

.action-btn,
.ghost-btn {
  min-height: 38px;
  padding: 0 14px;
}

.action-btn {
  background: linear-gradient(135deg, #1996ff, #27d5a4);
}

.ghost-btn {
  background: rgba(255, 255, 255, 0.12);
}

.mini-btn {
  min-height: 30px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.16);
}

.mini-btn.danger {
  background: rgba(239, 68, 68, 0.65);
}

.table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}

.character-table {
  width: 100%;
  min-width: 1280px;
  border-collapse: collapse;
}

.character-table th,
.character-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
}

.character-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.name-badge {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  font-weight: 700;
}

.class-cell {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.class-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.faction-chip.alliance {
  background: rgba(37, 99, 235, 0.24);
  color: #dbeafe;
}

.faction-chip.horde {
  background: rgba(185, 28, 28, 0.26);
  color: #fecaca;
}

.mobile-list {
  display: none;
  margin-top: 14px;
  gap: 12px;
}

.mobile-card {
  padding: 14px;
}

.mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.mobile-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
}

.mobile-card-grid p {
  margin: 0;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mobile-card-grid strong {
  font-size: 14px;
  word-break: break-word;
}

.mobile-card-grid .wide {
  grid-column: 1 / -1;
}

.pager {
  margin-top: 16px;
  flex-wrap: wrap;
}

.pager-left,
.pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pager-select {
  border: none;
  outline: none;
  border-radius: 8px;
  height: 32px;
  padding: 0 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.pager-select option {
  color: #222;
}

.input {
  width: 100%;
  min-height: 40px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  outline: none;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.48);
}

.textarea {
  resize: vertical;
  min-height: 92px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  padding: 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(1, 8, 16, 0.58);
}

.dialog {
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  padding: 20px;
  border-radius: 20px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-inline-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
}

@media (max-width: 1360px) {
  .spotlight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .content-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .filter-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .wow-page {
    padding: 12px;
  }

  .hero-panel,
  .filter-panel,
  .toolbar,
  .pager,
  .dialog-actions {
    flex-direction: column;
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
  .pager-right .ghost-btn,
  .dialog-actions .action-btn,
  .dialog-actions .ghost-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .desktop-table {
    display: none;
  }

  .mobile-list {
    display: grid;
  }

  .form-inline-grid,
  .mobile-card-grid {
    grid-template-columns: 1fr;
  }

  .character-name {
    font-size: 28px;
  }

  .card-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .spotlight-panel,
  .filter-panel,
  .list-panel,
  .insight-panel,
  .dialog {
    padding: 14px;
    border-radius: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
