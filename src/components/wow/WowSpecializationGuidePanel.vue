<template>
  <section class="guide-panel">
    <header class="guide-command-bar">
      <div>
        <span class="guide-eyebrow">SPECIALIZATION ARCHIVE · {{ versionName }}</span>
        <h2>职业专精作战档案</h2>
        <p>{{ seasonName }} · 40 个专精的天赋、属性、循环与 BIS 维护入口</p>
      </div>
      <div class="guide-command-actions">
        <label class="guide-search">
          <span>⌕</span>
          <input v-model.trim="keyword" type="search" placeholder="搜索职业或专精" />
        </label>
        <button type="button" class="guide-refresh-btn" :disabled="loading" @click="loadGuides">
          {{ loading ? '同步中' : '刷新资料' }}
        </button>
      </div>
    </header>

    <div class="guide-role-filter" aria-label="职责筛选">
      <button
        v-for="role in roleOptions"
        :key="role.value"
        type="button"
        :class="{active: roleFilter === role.value}"
        @click="roleFilter = role.value"
      >
        <i>{{ role.mark }}</i>{{ role.label }}<b>{{ role.count }}</b>
      </button>
    </div>

    <div v-if="loading && !guides.length" class="guide-empty">正在调阅职业档案...</div>
    <div v-else-if="!guides.length" class="guide-empty">当前赛季尚未初始化职业指南</div>
    <div v-else class="guide-workbench">
      <aside class="guide-class-rail">
        <span class="rail-caption">CLASS INDEX</span>
        <button
          v-for="classItem in availableClasses"
          :key="classItem.code"
          type="button"
          :class="{active: activeClassCode === classItem.code}"
          :style="{'--class-color': classItem.color}"
          @click="selectClass(classItem.code)"
        >
          <i>{{ classItem.name.slice(0, 1) }}</i>
          <span>{{ classItem.name }}</span>
          <b>{{ classItem.count }}</b>
        </button>
      </aside>

      <main v-if="activeGuide" class="guide-dossier" :style="{'--class-color': activeClassColor}">
        <nav class="guide-spec-tabs" aria-label="专精切换">
          <button
            v-for="guide in activeClassGuides"
            :key="guide.id"
            type="button"
            :class="{active: activeGuideId === guide.id}"
            @click="activeGuideId = guide.id"
          >
            <span>{{ guide.specName }}</span>
            <b>{{ formatRole(guide.roleType) }}</b>
          </button>
        </nav>

        <div class="guide-dossier-head">
          <div class="guide-spec-seal">{{ activeGuide.specName.slice(0, 1) }}</div>
          <div>
            <span>{{ activeGuide.className }} · {{ formatRole(activeGuide.roleType) }}</span>
            <h3>{{ activeGuide.specName }}</h3>
            <p>M+ {{ activeGuide.mythicTalentBuildName }} · 团本 {{ activeGuide.raidTalentBuildName }}</p>
          </div>
          <button type="button" class="guide-edit-btn" @click="openEditDialog">维护本页</button>
        </div>

        <div class="guide-intel-grid">
          <article class="guide-intel-card talent-card">
            <header><span>01</span><div><b>主流天赋</b><small>MYTHIC+ / RAID BUILDS</small></div></header>
            <div class="talent-variant-grid">
              <section class="talent-variant mythic-variant">
                <span class="talent-context"><i>∞</i> 大秘境</span>
                <h4>{{ activeGuide.mythicTalentBuildName }}</h4>
                <p>{{ activeGuide.mythicTalentSummary || '暂无大秘境天赋摘要' }}</p>
                <div v-if="activeGuide.mythicTalentImportCode" class="guide-import-code">
                  <code>{{ activeGuide.mythicTalentImportCode }}</code>
                  <button
                    type="button"
                    :class="copyButtonClass('mythic')"
                    aria-live="polite"
                    @click="copyTalentCode(activeGuide.mythicTalentImportCode, 'mythic')"
                  >{{ copyButtonLabel('mythic') }}</button>
                </div>
                <span v-else class="guide-pending-chip">M+ 导入代码待维护</span>
              </section>
              <section class="talent-variant raid-variant">
                <span class="talent-context"><i>♜</i> 团本</span>
                <h4>{{ activeGuide.raidTalentBuildName }}</h4>
                <p>{{ activeGuide.raidTalentSummary || '暂无团本天赋摘要' }}</p>
                <div v-if="activeGuide.raidTalentImportCode" class="guide-import-code">
                  <code>{{ activeGuide.raidTalentImportCode }}</code>
                  <button
                    type="button"
                    :class="copyButtonClass('raid')"
                    aria-live="polite"
                    @click="copyTalentCode(activeGuide.raidTalentImportCode, 'raid')"
                  >{{ copyButtonLabel('raid') }}</button>
                </div>
                <span v-else class="guide-pending-chip">团本导入代码待维护</span>
              </section>
            </div>
          </article>

          <article class="guide-intel-card stat-card">
            <header><span>02</span><div><b>属性优先级</b><small>STAT PRIORITY</small></div></header>
            <div class="stat-priority-flow">
              <template v-for="(stat, index) in statSegments" :key="`${stat}-${index}`">
                <strong>{{ stat }}</strong><i v-if="index < statSegments.length - 1">›</i>
              </template>
            </div>
            <p>属性权重会随装备、套装和目标数量变化，换装前建议重新模拟。</p>
          </article>

          <article class="guide-intel-card rotation-card">
            <header><span>03</span><div><b>循环手法</b><small>ROTATION NOTES</small></div></header>
            <p>{{ activeGuide.rotationNotes || '暂无循环手法记录' }}</p>
          </article>

          <article class="guide-intel-card trinket-card">
            <header><span>04</span><div><b>饰品评分</b><small>TRINKET RANKING</small></div></header>
            <p>{{ activeGuide.trinketRanking || '暂无饰品评分记录' }}</p>
          </article>
        </div>

        <footer class="guide-source-strip">
          <div>
            <span>资料来源</span>
            <strong>{{ activeGuide.sourceName }}</strong>
            <small>核对日期 {{ activeGuide.sourceUpdatedAt || '待维护' }}</small>
          </div>
          <a :href="activeGuide.sourceUrl" target="_blank" rel="noopener noreferrer">打开原始指南 ↗</a>
        </footer>
      </main>
      <div v-else class="guide-empty guide-filter-empty">没有符合当前筛选条件的专精</div>
    </div>

    <MacDialog
      v-model="showEditDialog"
      :title="`${activeGuide?.className || ''} ${activeGuide?.specName || ''} · 指南维护`"
      subtitle="保存的是站内摘要；原始资料链接会继续保留用于版本核对。"
      width="900px"
      panel-class="wow-specialization-guide-dialog"
      :close-disabled="submitting"
      @close="closeEditDialog"
    >
      <form id="wow-specialization-guide-form" class="guide-edit-form" @submit.prevent="saveGuide">
        <section class="talent-edit-block mythic-edit-block">
          <header><b>大秘境天赋</b><span>MYTHIC+ BUILD</span></header>
          <label>
            <span>方案名称</span>
            <input v-model.trim="editForm.mythicTalentBuildName" class="input" maxlength="128" required />
          </label>
          <label>
            <span>天赋摘要</span>
            <textarea v-model.trim="editForm.mythicTalentSummary" class="input guide-textarea" rows="3" maxlength="4000" />
          </label>
          <label>
            <span>天赋导入代码</span>
            <textarea v-model.trim="editForm.mythicTalentImportCode" class="input guide-textarea guide-code-textarea" rows="3" maxlength="8000" placeholder="粘贴大秘境天赋导入字符串" />
          </label>
        </section>
        <section class="talent-edit-block raid-edit-block">
          <header><b>团本天赋</b><span>RAID BUILD</span></header>
          <label>
            <span>方案名称</span>
            <input v-model.trim="editForm.raidTalentBuildName" class="input" maxlength="128" required />
          </label>
          <label>
            <span>天赋摘要</span>
            <textarea v-model.trim="editForm.raidTalentSummary" class="input guide-textarea" rows="3" maxlength="4000" />
          </label>
          <label>
            <span>天赋导入代码</span>
            <textarea v-model.trim="editForm.raidTalentImportCode" class="input guide-textarea guide-code-textarea" rows="3" maxlength="8000" placeholder="粘贴团本天赋导入字符串" />
          </label>
        </section>
        <label>
          <span>属性优先级</span>
          <input v-model.trim="editForm.statPriority" class="input" maxlength="512" required />
        </label>
        <div class="guide-edit-grid">
          <label>
            <span>循环手法</span>
            <textarea v-model.trim="editForm.rotationNotes" class="input guide-textarea" rows="6" maxlength="8000" />
          </label>
          <label>
            <span>饰品评分</span>
            <textarea v-model.trim="editForm.trinketRanking" class="input guide-textarea" rows="6" maxlength="8000" placeholder="例如：S：饰品A（95）；A：饰品B（88）" />
          </label>
        </div>
        <div class="guide-edit-source-grid">
          <label>
            <span>来源名称</span>
            <input v-model.trim="editForm.sourceName" class="input" maxlength="128" required />
          </label>
          <label>
            <span>资料核对日期</span>
            <input v-model="editForm.sourceUpdatedAt" class="input" type="date" />
          </label>
          <label class="source-url-field">
            <span>来源地址</span>
            <input v-model.trim="editForm.sourceUrl" class="input" type="url" maxlength="1024" required />
          </label>
        </div>
      </form>
      <template #footer>
        <button type="button" class="ghost-btn" :disabled="submitting" @click="closeEditDialog">取消</button>
        <button type="submit" form="wow-specialization-guide-form" class="action-btn" :disabled="submitting">
          {{ submitting ? '保存中...' : '保存指南' }}
        </button>
      </template>
    </MacDialog>
  </section>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import MacDialog from '@/components/MacDialog.vue'
import {listWowSpecializationGuides, updateWowSpecializationGuide} from '@/api/wowCharacter'

const CLASS_COLORS = {
  death_knight: '#c41f3b', demon_hunter: '#a330c9', druid: '#ff7d0a', evoker: '#33937f',
  hunter: '#abd473', mage: '#69ccf0', monk: '#00ff96', paladin: '#f58cba', priest: '#f4f4f4',
  rogue: '#fff569', shaman: '#0070de', warlock: '#9482c9', warrior: '#c79c6e'
}

function unwrapData(response) {
  const payload = response?.data
  return payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

// NAS 常通过 HTTP 访问，Clipboard API 会因非安全上下文不可用，因此保留兼容复制路径。
async function writeClipboardText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // 权限被拒绝时继续使用兼容复制方案。
    }
  }

  const copyInput = document.createElement('textarea')
  copyInput.value = value
  copyInput.setAttribute('readonly', '')
  copyInput.style.position = 'fixed'
  copyInput.style.left = '-9999px'
  copyInput.style.opacity = '0'
  document.body.appendChild(copyInput)
  copyInput.focus()
  copyInput.select()
  copyInput.setSelectionRange(0, copyInput.value.length)

  try {
    const copied = typeof document.execCommand === 'function' && document.execCommand('copy')
    if (!copied) throw new Error('浏览器拒绝访问剪贴板')
  } finally {
    document.body.removeChild(copyInput)
  }
}

export default {
  name: 'WowSpecializationGuidePanel',
  components: {MacDialog},
  props: {
    versionName: {type: String, default: ''},
    seasonName: {type: String, default: ''}
  },
  setup() {
    const loading = ref(false)
    const submitting = ref(false)
    const guides = ref([])
    const keyword = ref('')
    const roleFilter = ref('')
    const activeClassCode = ref('')
    const activeGuideId = ref(null)
    const showEditDialog = ref(false)
    const copyFeedback = reactive({key: '', state: ''})
    let copyFeedbackTimer = null
    const editForm = reactive({
      mythicTalentBuildName: '', mythicTalentSummary: '', mythicTalentImportCode: '',
      raidTalentBuildName: '', raidTalentSummary: '', raidTalentImportCode: '',
      statPriority: '', rotationNotes: '', trinketRanking: '', sourceName: '', sourceUrl: '', sourceUpdatedAt: ''
    })

    const filteredGuides = computed(() => {
      const normalizedKeyword = keyword.value.toLowerCase()
      return guides.value.filter((guide) => {
        const roleMatched = !roleFilter.value || guide.roleType === roleFilter.value
        const keywordMatched = !normalizedKeyword
          || `${guide.className} ${guide.specName} ${guide.classCode} ${guide.specCode}`.toLowerCase().includes(normalizedKeyword)
        return roleMatched && keywordMatched
      })
    })

    const availableClasses = computed(() => {
      const classMap = new Map()
      filteredGuides.value.forEach((guide) => {
        const current = classMap.get(guide.classCode)
        if (current) {
          current.count += 1
          return
        }
        classMap.set(guide.classCode, {
          code: guide.classCode,
          name: guide.className,
          color: CLASS_COLORS[guide.classCode] || '#d8b96d',
          count: 1
        })
      })
      return [...classMap.values()]
    })

    const activeClassGuides = computed(() => filteredGuides.value.filter((guide) => guide.classCode === activeClassCode.value))
    const activeGuide = computed(() => activeClassGuides.value.find((guide) => guide.id === activeGuideId.value) || activeClassGuides.value[0] || null)
    const activeClassColor = computed(() => CLASS_COLORS[activeGuide.value?.classCode] || '#d8b96d')
    const statSegments = computed(() => (activeGuide.value?.statPriority || '').split(/\s*(?:＞+|≥|=)\s*/).filter(Boolean))
    const roleOptions = computed(() => [
      {value: '', label: '全部', mark: '◆', count: guides.value.length},
      {value: 'TANK', label: '坦克', mark: '◈', count: guides.value.filter((item) => item.roleType === 'TANK').length},
      {value: 'HEALER', label: '治疗', mark: '✦', count: guides.value.filter((item) => item.roleType === 'HEALER').length},
      {value: 'DPS', label: '输出', mark: '⚔', count: guides.value.filter((item) => item.roleType === 'DPS').length}
    ])

    const ensureActiveGuide = () => {
      if (!availableClasses.value.some((item) => item.code === activeClassCode.value)) {
        activeClassCode.value = availableClasses.value[0]?.code || ''
      }
      if (!activeClassGuides.value.some((item) => item.id === activeGuideId.value)) {
        activeGuideId.value = activeClassGuides.value[0]?.id || null
      }
    }

    const loadGuides = async () => {
      loading.value = true
      try {
        const response = await listWowSpecializationGuides()
        guides.value = Array.isArray(unwrapData(response)) ? unwrapData(response) : []
        ensureActiveGuide()
      } catch (error) {
        alert(errorMessage(error, '职业指南加载失败'))
      } finally {
        loading.value = false
      }
    }

    const selectClass = (classCode) => {
      activeClassCode.value = classCode
      activeGuideId.value = filteredGuides.value.find((guide) => guide.classCode === classCode)?.id || null
    }

    const formatRole = (roleType) => ({TANK: '坦克', HEALER: '治疗', DPS: '输出'}[roleType] || roleType)

    const openEditDialog = () => {
      if (!activeGuide.value) return
      Object.assign(editForm, {
        mythicTalentBuildName: activeGuide.value.mythicTalentBuildName || '',
        mythicTalentSummary: activeGuide.value.mythicTalentSummary || '',
        mythicTalentImportCode: activeGuide.value.mythicTalentImportCode || '',
        raidTalentBuildName: activeGuide.value.raidTalentBuildName || '',
        raidTalentSummary: activeGuide.value.raidTalentSummary || '',
        raidTalentImportCode: activeGuide.value.raidTalentImportCode || '',
        statPriority: activeGuide.value.statPriority || '',
        rotationNotes: activeGuide.value.rotationNotes || '',
        trinketRanking: activeGuide.value.trinketRanking || '',
        sourceName: activeGuide.value.sourceName || '',
        sourceUrl: activeGuide.value.sourceUrl || '',
        sourceUpdatedAt: activeGuide.value.sourceUpdatedAt || ''
      })
      showEditDialog.value = true
    }

    const closeEditDialog = () => {
      if (!submitting.value) showEditDialog.value = false
    }

    const saveGuide = async () => {
      if (!activeGuide.value) return
      submitting.value = true
      try {
        const response = await updateWowSpecializationGuide(activeGuide.value.id, {...editForm})
        const updatedGuide = unwrapData(response)
        guides.value = guides.value.map((guide) => guide.id === updatedGuide.id ? updatedGuide : guide)
        showEditDialog.value = false
      } catch (error) {
        alert(errorMessage(error, '职业指南保存失败'))
      } finally {
        submitting.value = false
      }
    }

    const showCopyFeedback = (key, state) => {
      copyFeedback.key = key
      copyFeedback.state = state
      if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer)
      copyFeedbackTimer = window.setTimeout(() => {
        copyFeedback.key = ''
        copyFeedback.state = ''
      }, 2200)
    }

    const copyButtonLabel = (key) => {
      if (copyFeedback.key !== key) return '复制导入代码'
      return copyFeedback.state === 'success' ? '✓ 已复制' : '复制失败，请手动复制'
    }

    const copyButtonClass = (key) => ({
      'copy-success': copyFeedback.key === key && copyFeedback.state === 'success',
      'copy-error': copyFeedback.key === key && copyFeedback.state === 'error'
    })

    const copyTalentCode = async (talentImportCode, key) => {
      if (!talentImportCode) return
      try {
        await writeClipboardText(talentImportCode)
        showCopyFeedback(key, 'success')
      } catch {
        showCopyFeedback(key, 'error')
      }
    }

    watch([keyword, roleFilter], ensureActiveGuide)
    watch(activeGuide, (guide) => {
      if (guide && guide.id !== activeGuideId.value) activeGuideId.value = guide.id
    })
    onMounted(loadGuides)
    onBeforeUnmount(() => {
      if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer)
    })

    return {
      loading, submitting, guides, keyword, roleFilter, activeClassCode, activeGuideId, showEditDialog,
      editForm, availableClasses, activeClassGuides, activeGuide, activeClassColor, statSegments, roleOptions,
      loadGuides, selectClass, formatRole, openEditDialog, closeEditDialog, saveGuide,
      copyTalentCode, copyButtonLabel, copyButtonClass
    }
  }
}
</script>

<style scoped>
.guide-panel { overflow: hidden; border: 1px solid rgba(217,184,102,.42); border-radius: 0 0 18px 18px; color: #eee8d9; background: radial-gradient(circle at 82% 0, rgba(88,115,89,.18), transparent 36%), linear-gradient(135deg, rgba(12,14,14,.97), rgba(18,30,31,.96)); box-shadow: 0 18px 42px rgba(0,0,0,.3); }
.guide-command-bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; padding: 22px 24px 18px; border-bottom: 1px solid rgba(217,184,102,.2); }
.guide-eyebrow, .rail-caption { color: #bfa35f; font-size: 10px; font-weight: 800; letter-spacing: .18em; }
.guide-command-bar h2 { margin: 5px 0 3px; color: #fff6df; font-family: Georgia, 'Noto Serif SC', serif; font-size: 25px; }
.guide-command-bar p { margin: 0; color: #8d9992; font-size: 12px; }
.guide-command-actions { display: flex; gap: 8px; }
.guide-search { display: flex; align-items: center; gap: 7px; width: 230px; height: 36px; padding: 0 11px; border: 1px solid rgba(217,184,102,.2); border-radius: 4px; background: rgba(0,0,0,.26); }
.guide-search span { color: #bfa35f; font-size: 18px; }
.guide-search input { min-width: 0; flex: 1; border: 0; outline: 0; color: #eee8d9; background: transparent; }
.guide-refresh-btn, .guide-edit-btn { height: 36px; padding: 0 14px; border: 1px solid rgba(217,184,102,.38); border-radius: 4px; color: #ead9aa; background: rgba(148,110,45,.12); cursor: pointer; }
.guide-role-filter { display: flex; gap: 1px; padding: 0 24px; border-bottom: 1px solid rgba(217,184,102,.15); background: rgba(0,0,0,.13); }
.guide-role-filter button { display: flex; align-items: center; gap: 7px; padding: 11px 15px; border: 0; border-bottom: 2px solid transparent; color: #78877f; background: transparent; cursor: pointer; }
.guide-role-filter button.active { border-bottom-color: #d8b96d; color: #f4e8c8; }
.guide-role-filter i { color: #b79d5d; font-style: normal; }.guide-role-filter b { padding: 1px 6px; border-radius: 20px; color: #6f7f77; background: rgba(255,255,255,.05); font-size: 10px; }
.guide-workbench { display: grid; grid-template-columns: 185px minmax(0,1fr); min-height: 490px; }
.guide-class-rail { padding: 15px 10px; border-right: 1px solid rgba(217,184,102,.17); background: rgba(0,0,0,.19); }
.rail-caption { display: block; padding: 0 9px 9px; }
.guide-class-rail button { position: relative; display: grid; grid-template-columns: 27px 1fr auto; align-items: center; gap: 8px; width: 100%; min-height: 35px; padding: 4px 9px; border: 0; border-left: 2px solid transparent; color: #89958f; background: transparent; cursor: pointer; text-align: left; }
.guide-class-rail button:hover { color: #d9dedb; background: rgba(255,255,255,.035); }
.guide-class-rail button.active { border-left-color: var(--class-color); color: #fff; background: linear-gradient(90deg, color-mix(in srgb, var(--class-color) 15%, transparent), transparent); }
.guide-class-rail i { display: grid; place-items: center; width: 24px; height: 24px; border: 1px solid color-mix(in srgb, var(--class-color) 45%, transparent); border-radius: 50%; color: var(--class-color); font-style: normal; font-weight: 900; }
.guide-class-rail span { font-size: 12px; font-weight: 700; }.guide-class-rail b { color: #536159; font-size: 10px; }
.guide-dossier { min-width: 0; }
.guide-spec-tabs { display: flex; min-height: 50px; padding: 0 18px; border-bottom: 1px solid rgba(217,184,102,.14); }
.guide-spec-tabs button { min-width: 110px; padding: 8px 16px; border: 0; border-bottom: 2px solid transparent; color: #75827b; background: transparent; cursor: pointer; }
.guide-spec-tabs button.active { border-bottom-color: var(--class-color); color: #fff; background: linear-gradient(0deg, color-mix(in srgb, var(--class-color) 10%, transparent), transparent 75%); }
.guide-spec-tabs span, .guide-spec-tabs b { display: block; }.guide-spec-tabs span { font-weight: 800; }.guide-spec-tabs b { margin-top: 2px; color: #6c7972; font-size: 9px; }
.guide-dossier-head { display: grid; grid-template-columns: 58px 1fr auto; align-items: center; gap: 14px; padding: 18px 22px 13px; }
.guide-spec-seal { display: grid; place-items: center; width: 54px; height: 54px; border: 1px solid color-mix(in srgb, var(--class-color) 55%, transparent); border-radius: 8px 50% 50% 50%; color: var(--class-color); background: color-mix(in srgb, var(--class-color) 10%, rgba(0,0,0,.5)); font: 900 24px Georgia, serif; }
.guide-dossier-head span { color: #8a968f; font-size: 10px; letter-spacing: .1em; }.guide-dossier-head h3 { margin: 2px 0; color: #fff7e6; font: 700 23px Georgia, 'Noto Serif SC', serif; }.guide-dossier-head p { margin: 0; color: #bca974; font-size: 11px; }
.guide-intel-grid { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 9px; padding: 0 22px 13px; }
.talent-card { grid-column: 1 / -1; }
.stat-card,.rotation-card,.trinket-card { grid-column: span 2; }
.guide-intel-card { min-height: 142px; padding: 15px 17px; border: 1px solid rgba(217,184,102,.13); border-radius: 6px; background: linear-gradient(145deg, rgba(255,255,255,.025), rgba(0,0,0,.14)); }
.guide-intel-card header { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }.guide-intel-card header > span { color: color-mix(in srgb, var(--class-color) 72%, #d8b96d); font: 700 17px Georgia,serif; }.guide-intel-card header b,.guide-intel-card header small { display:block }.guide-intel-card header b { color:#eee8d9;font-size:12px }.guide-intel-card header small { margin-top:1px;color:#536159;font-size:8px;letter-spacing:.13em }
.guide-intel-card h4 { margin: 0 0 7px; color: #d9c58e; font-size: 14px; }.guide-intel-card p { margin:0; color:#9ca7a1; font-size:11px; line-height:1.65; white-space:pre-wrap; }
.talent-variant-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px }.talent-variant { position:relative;padding:13px 14px 12px;border:1px solid rgba(217,184,102,.12);background:rgba(0,0,0,.16) }.mythic-variant { border-top-color:rgba(105,204,240,.45) }.raid-variant { border-top-color:rgba(245,140,186,.45) }.talent-context { display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;color:#909e97;font-size:10px;font-weight:800;letter-spacing:.08em }.talent-context i { color:#d4b867;font-style:normal;font-size:15px }
.guide-import-code { display:flex; align-items:center; gap:8px; margin-top:10px; padding:7px 8px; background:rgba(0,0,0,.28) }.guide-import-code code { min-width:0; flex:1; overflow:hidden; color:#7f9188; text-overflow:ellipsis; white-space:nowrap; font-size:9px; user-select:all }.guide-import-code button { border:0;color:#dbc585;background:transparent;cursor:pointer;font-size:10px;white-space:nowrap;transition:color .16s ease,transform .16s ease }.guide-import-code button:hover { color:#fff0bd }.guide-import-code button.copy-success { color:#79d9ac;transform:translateY(-1px) }.guide-import-code button.copy-error { color:#f09a88 }.guide-pending-chip { display:inline-block;margin-top:10px;padding:4px 7px;color:#6e7c75;background:rgba(255,255,255,.035);font-size:9px }
.stat-priority-flow { display:flex; align-items:center; flex-wrap:wrap; gap:7px; margin:18px 0 14px }.stat-priority-flow strong { padding:7px 10px; border:1px solid color-mix(in srgb,var(--class-color) 28%,rgba(217,184,102,.2)); color:#efe3c4; background:color-mix(in srgb,var(--class-color) 7%,rgba(0,0,0,.2)); font-size:12px }.stat-priority-flow i { color:#705f36;font-style:normal;font-size:20px }
.guide-source-strip { display:flex; align-items:center; justify-content:space-between; gap:15px; margin:0 22px 20px; padding:11px 13px; border-top:1px solid rgba(217,184,102,.16); border-bottom:1px solid rgba(217,184,102,.16); background:rgba(0,0,0,.15) }.guide-source-strip div { display:flex; align-items:center; gap:10px }.guide-source-strip span,.guide-source-strip small { color:#65736c;font-size:9px }.guide-source-strip strong { color:#b9b4a7;font-size:11px }.guide-source-strip a { color:#d8b96d;font-size:11px;text-decoration:none }
.guide-empty { display:grid;place-items:center;min-height:300px;color:#728078;font-size:12px }.guide-filter-empty { min-height:490px }
.guide-edit-form { display:grid;gap:13px }.guide-edit-form label { display:flex;flex-direction:column;gap:6px;color:#c8d3cd;font-size:12px }.guide-edit-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px }.guide-edit-source-grid { display:grid;grid-template-columns:1fr 180px;gap:12px }.source-url-field { grid-column:1/-1 }.guide-textarea { min-height:84px;resize:vertical }.guide-code-textarea { font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all }
.talent-edit-block { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;padding:13px;border:1px solid rgba(217,184,102,.16);border-radius:8px;background:rgba(0,0,0,.12) }.talent-edit-block header,.talent-edit-block label:last-child { grid-column:1/-1 }.talent-edit-block header { display:flex;align-items:baseline;gap:8px }.talent-edit-block header b { color:#f0dfb4;font-size:13px }.talent-edit-block header span { color:#64736b;font-size:9px;letter-spacing:.12em }.mythic-edit-block { border-left:3px solid rgba(105,204,240,.5) }.raid-edit-block { border-left:3px solid rgba(245,140,186,.5) }
.input { width:100%; min-height:38px; padding:8px 10px; border:1px solid rgba(255,255,255,.15); border-radius:8px; outline:0; color:#edf4f1; background:rgba(5,18,27,.72); box-sizing:border-box }.input:focus { border-color:rgba(217,184,102,.55); box-shadow:0 0 0 3px rgba(217,184,102,.08) }
.action-btn,.ghost-btn { min-height:36px;padding:0 14px;border-radius:8px;cursor:pointer }.action-btn { border:1px solid rgba(217,184,102,.52);color:#1b160b;background:linear-gradient(135deg,#ead28f,#b99243);font-weight:800 }.ghost-btn { border:1px solid rgba(255,255,255,.16);color:#dce8e2;background:rgba(255,255,255,.055) }.action-btn:disabled,.ghost-btn:disabled { opacity:.58;cursor:not-allowed }
@media (max-width: 900px) { .guide-command-bar { align-items:stretch;flex-direction:column }.guide-workbench { grid-template-columns:1fr }.guide-class-rail { display:flex;gap:5px;overflow-x:auto;border-right:0;border-bottom:1px solid rgba(217,184,102,.17) }.rail-caption { display:none }.guide-class-rail button { min-width:115px }.guide-intel-grid { grid-template-columns:1fr }.talent-card,.stat-card,.rotation-card,.trinket-card { grid-column:auto } }
@media (max-width: 620px) { .guide-command-actions,.guide-source-strip,.guide-source-strip div { align-items:stretch;flex-direction:column }.guide-search { width:auto }.guide-role-filter { overflow-x:auto;padding:0 10px }.guide-dossier-head { grid-template-columns:46px 1fr }.guide-spec-seal { width:42px;height:42px }.guide-edit-btn { grid-column:1/-1 }.guide-intel-grid { padding:0 10px 10px }.guide-dossier-head { padding:14px 10px 10px }.guide-source-strip { margin:0 10px 12px }.guide-edit-grid,.guide-edit-source-grid,.talent-variant-grid,.talent-edit-block { grid-template-columns:1fr }.talent-edit-block label:last-child { grid-column:auto }.source-url-field { grid-column:auto } }
</style>
