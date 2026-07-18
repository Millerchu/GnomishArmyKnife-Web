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
        <p class="page-subtitle">维护正式服角色装等、当前钥匙和赛季评分，列表只保留日常检索最常用字段。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">已接真实接口</span>
        <span class="hero-tag">角色总数 {{ overview.totalCharacters }}</span>
        <span class="hero-tag">最高装等 {{ formatDecimal(overview.highestItemLevel) }}</span>
        <span class="hero-tag">最高评分 {{ formatDecimal(overview.highestMythicScore) }}</span>
      </div>
    </div>

    <section class="spotlight-panel">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">主角色名片</h2>
          <p class="panel-tip">仅展示手工勾选的主角色，最多 4 个，联盟和部落使用不同特色背景。</p>
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
                <strong>{{ formatDecimal(item.itemLevel) }}</strong>
              </div>
              <div class="card-stat score-stat" title="点击查看大秘境赛季记录" @click="showFeaturedScorePopover($event, item)">
                <span>M+ 总分</span>
                <strong>{{ formatScore(item.mythicScore) }}</strong>
              </div>
              <div class="card-stat">
                <span>当前钥匙</span>
                <strong>{{ formatCurrentKey(item) }}</strong>
              </div>
            </div>

            <div class="card-meta">
              <span>等级 {{ item.level }}</span>
              <span>{{ formatProfessionText(item) }}</span>
              <span>{{ item.isFeatured ? '主角色' : '普通角色' }}</span>
            </div>
          </div>
        </article>

        <article
          v-for="placeholder in spotlightPlaceholderCount"
          :key="`placeholder-${placeholder}`"
          class="character-card empty-card"
        >
          <div class="empty-card-content">
            <strong>暂无更多主角色</strong>
            <span>勾选“作为主角色展示”后会出现在这里</span>
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
            <p class="panel-tip">点击字段可依次切换降序、升序和取消排序；更多资料进入编辑详情维护。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateDialog">新增角色</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadPageData">刷新列表</button>
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
                <th
                  v-for="column in sortColumns"
                  :key="column.field"
                  :class="{'faction-column': column.field === 'faction'}"
                >
                  <button
                    class="sort-header-btn"
                    :class="{active: query.sortField === column.field}"
                    type="button"
                    :title="getSortButtonTitle(column)"
                    :aria-label="getSortButtonTitle(column)"
                    :disabled="loading"
                    @click="toggleSort(column.field)"
                  >
                    <span>{{ column.label }}</span>
                    <span class="sort-indicator" aria-hidden="true">{{ getSortIndicator(column.field) }}</span>
                  </button>
                </th>
                <th>操作</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="item in pagedRecords"
                :key="item.id"
                class="character-row"
                :class="buildFactionRowClass(item)"
              >
                <td class="faction-column">
                  <img
                    class="faction-icon"
                    :src="getFactionIcon(item.faction)"
                    :alt="`${formatFactionText(item.faction)}图标`"
                    :title="formatFactionText(item.faction)"
                  >
                </td>
                <td>
                  <span class="name-badge" :style="buildNameBadgeStyle(item)">
                    {{ item.characterName }}
                  </span>
                </td>
                <td>
                  <div class="class-cell">
                    <span class="class-dot" :style="{background: getClassMeta(item.className).color}"></span>
                    <span>{{ formatSpecText(item.specName) || '-' }}</span>
                  </div>
                </td>
                <td>{{ item.level || '-' }}</td>
                <td>{{ item.realmName || '-' }}</td>
                <td>{{ formatDecimal(item.itemLevel) }}</td>
                <td>{{ formatCurrentKey(item) }}</td>
                <td class="score-cell" @click="showFeaturedScorePopover($event, item)">{{ formatScore(item.mythicScore) }}</td>
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

          <div v-if="pagedRecords.length" class="mobile-sort-bar" aria-label="角色列表排序">
            <button
              v-for="column in sortColumns"
              :key="column.field"
              class="mobile-sort-btn"
              :class="{active: query.sortField === column.field}"
              type="button"
              :title="getSortButtonTitle(column)"
              :aria-label="getSortButtonTitle(column)"
              :disabled="loading"
              @click="toggleSort(column.field)"
            >
              <span>{{ column.mobileLabel || column.label }}</span>
              <span aria-hidden="true">{{ getSortIndicator(column.field) }}</span>
            </button>
          </div>

          <div v-if="pagedRecords.length" class="mobile-list">
            <article
              v-for="item in pagedRecords"
              :key="item.id"
              class="mobile-card"
              :class="buildFactionRowClass(item)"
              :style="buildMobileCardStyle(item)"
            >
              <div class="mobile-card-head">
                <div class="mobile-card-identity">
                  <img
                    class="faction-icon mobile-faction-icon"
                    :src="getFactionIcon(item.faction)"
                    :alt="`${formatFactionText(item.faction)}图标`"
                  >
                  <div>
                    <h3 class="mobile-card-title">{{ item.characterName }}</h3>
                    <p class="mobile-card-subtitle">{{ formatSpecText(item.specName) || '-' }} · {{ item.realmName }}</p>
                  </div>
                </div>
              </div>

              <div class="mobile-card-grid">
                <p><span>等级</span><strong>{{ item.level }}</strong></p>
                <p><span>装等</span><strong>{{ formatDecimal(item.itemLevel) }}</strong></p>
                <p class="score-mobile-cell" @click="showFeaturedScorePopover($event, item)"><span>评分</span><strong>{{ formatScore(item.mythicScore) }}</strong></p>
                <p class="wide"><span>当前钥匙</span><strong>{{ formatCurrentKey(item) }}</strong></p>
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
        <div class="panel-head insight-panel-head">
          <div>
            <h2 class="panel-title">角色概览</h2>
            <p class="panel-tip">账号规模与角色分布</p>
          </div>
        </div>

        <div class="overview-metrics">
          <article class="overview-metric">
            <span>角色</span>
            <strong>{{ overview.totalCharacters }}</strong>
          </article>
          <article class="overview-metric">
            <span>平均装等</span>
            <strong>{{ formatDecimal(overview.averageItemLevel) }}</strong>
          </article>
          <article class="overview-metric">
            <span>最高评分</span>
            <strong>{{ formatDecimal(overview.highestMythicScore) }}</strong>
          </article>
          <article class="overview-metric">
            <span>服务器</span>
            <strong>{{ overview.totalRealms }}</strong>
          </article>
        </div>

        <div class="insight-detail-grid">
          <section class="insight-block compact-insight-block">
            <div class="insight-head">
              <h3 class="insight-title">阵营与服务器</h3>
              <span class="insight-head-meta">服务器 Top 3</span>
            </div>
            <div class="faction-summary-grid">
              <div v-for="item in factionStats" :key="item.label" class="faction-summary-item">
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.count }} 角色</span>
                </div>
                <b>{{ item.ratio }}</b>
              </div>
            </div>
            <div class="realm-summary-list">
              <div v-for="item in realmStats.slice(0, 3)" :key="item.realmName" class="realm-summary-row">
                <strong>{{ item.realmName }}</strong>
                <span>{{ item.count }} 角色</span>
                <b>最高 {{ formatDecimal(item.highestItemLevel) }}</b>
              </div>
            </div>
          </section>

          <section class="insight-block compact-insight-block">
            <div class="insight-head">
              <h3 class="insight-title">职业分布</h3>
              <span class="insight-head-meta">{{ classStats.length }} 职业</span>
            </div>
            <div class="class-stat-list compact-class-stat-grid">
              <div
                v-for="item in classStats"
                :key="item.className"
                class="class-stat-item compact-class-stat-item"
                :style="buildClassStatStyle(item.className)"
              >
                <div class="class-stat-main">
                  <strong>{{ item.className }}</strong>
                  <b>{{ item.count }}</b>
                </div>
                <span>平均装等 {{ formatDecimal(item.averageItemLevel) }}</span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>

    <MacDialog
      v-model="showDialog"
      :title="dialogMode === 'create' ? '新增角色信息' : '编辑角色信息'"
      width="980px"
      panel-class="wow-character-dialog"
      :close-disabled="submitting"
      @close="closeDialog"
    >
        <form id="wow-character-dialog-form" class="dialog-form" @submit.prevent="submitDialog">
          <section class="character-fields-section">
            <div class="character-fields-head">
              <div>
                <h4 class="dialog-block-title">角色资料</h4>
                <p class="dialog-block-tip">集中维护身份、成长与当前赛季信息。</p>
              </div>
              <label class="featured-toggle">
                <input v-model="form.isFeatured" class="checkbox-input" type="checkbox" />
                <span>主角色展示</span>
              </label>
            </div>

            <div class="character-fields-grid">
            <label class="form-field">
              <span>角色名</span>
              <input v-model.trim="form.characterName" class="input" maxlength="32" placeholder="例如：风渐渐" required />
            </label>
            <label class="form-field">
              <span>服务器</span>
              <input v-model.trim="form.realmName" class="input" maxlength="32" placeholder="例如：影之哀伤" required />
            </label>
            <label class="form-field">
              <span>职业</span>
              <select v-model="form.className" class="input" required>
                <option v-for="item in classOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
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
            <label class="form-field">
              <span>阵营</span>
              <select v-model="form.faction" class="input" required>
                <option v-for="item in formFactionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label class="form-field">
              <span>等级</span>
              <input v-model.number="form.level" class="input" type="number" min="1" max="90" required />
            </label>
            <label class="form-field">
              <span>装等</span>
              <input v-model.number="form.itemLevel" class="input" type="number" min="0" max="999" step="0.01" required />
            </label>
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
            <label class="form-field">
              <span>当前钥匙层数</span>
              <input v-model.number="form.mythicBestLevel" class="input" type="number" min="0" max="40" step="1" />
            </label>
            <label class="form-field">
              <span>当前钥匙副本</span>
              <select v-model="form.mythicDungeonName" class="input">
                <option value="">未设置</option>
                <option v-for="item in mythicDungeonOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            </div>
          </section>

          <section v-if="showEndgameSections" class="dialog-block">
            <div class="dialog-block-head">
              <div>
                <h4 class="dialog-block-title">每周低保</h4>
                <p class="dialog-block-tip">默认收起低保明细，点击宏伟宝库图标后维护本周奖励进度。</p>
              </div>
              <button type="button" class="icon-toggle-btn" @click="toggleWeeklyVaults">
                <img src="/brand/wow-great-vault-icon.png" alt="宏伟宝库" />
                <span>{{ weeklyVaultsExpanded ? '收起低保' : formatLatestVaultText(form.weeklyVaults) }}</span>
              </button>
            </div>

            <div v-if="weeklyVaultsExpanded" class="section-tools">
              <button type="button" class="ghost-btn" @click="appendWeeklyVault">新增一周</button>
            </div>

            <div v-if="weeklyVaultsExpanded && form.weeklyVaults.length" class="weekly-vault-list vault-detail-list">
              <div v-for="(item, index) in form.weeklyVaults" :key="item.localKey" class="weekly-vault-card">
                <div class="weekly-vault-head">
                  <label class="form-field compact-field">
                    <span>周起始日</span>
                    <input v-model="item.weekStartDate" class="input compact-input" type="date" />
                  </label>
                  <button type="button" class="mini-btn danger" @click="removeWeeklyVault(index)">删除</button>
                </div>

                <div class="weekly-vault-grid">
                  <label class="mini-field">
                    <span>团本击杀</span>
                    <input v-model.number="item.raidProgressCount" class="input compact-input" type="number" min="0" max="99" step="1" />
                  </label>
                  <label class="mini-field">
                    <span>大秘境次数</span>
                    <input v-model.number="item.mythicProgressCount" class="input compact-input" type="number" min="0" max="99" step="1" />
                  </label>
                  <label class="mini-field">
                    <span>世界任务 / 地下堡</span>
                    <input v-model.number="item.worldProgressCount" class="input compact-input" type="number" min="0" max="99" step="1" />
                  </label>
                </div>

                <div class="vault-grand-board">
                  <div class="vault-grand-copy">
                    <strong>每周完成活动可以将物品添加到宏伟宝库中。</strong>
                    <span>你每周可以选择一件奖励。</span>
                  </div>
                  <div class="vault-grand-divider" />

                  <div
                    v-for="track in buildVaultRewardTracks(item)"
                    :key="`${item.localKey}-${track.key}`"
                    class="vault-reward-row"
                  >
                    <div class="vault-track-scene" :class="`vault-track-${track.key}`">
                      <strong>{{ track.title }}</strong>
                      <span>{{ track.progress }} / {{ track.maxProgress }}</span>
                    </div>
                    <div class="vault-reward-grid">
                      <div
                        v-for="reward in track.rewards"
                        :key="`${item.localKey}-${track.key}-${reward.threshold}`"
                        class="vault-reward-card"
                        :class="{ unlocked: reward.unlocked }"
                        :style="{ '--vault-progress': `${reward.percent}%` }"
                      >
                        <span class="vault-state-mark">{{ reward.unlocked ? '✓' : '锁' }}</span>
                        <strong>{{ reward.label }}</strong>
                        <span class="vault-reward-value">{{ reward.unlocked ? reward.rewardText : reward.progressText }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <label class="form-field">
                  <span>备注</span>
                  <textarea v-model.trim="item.note" class="input textarea compact-textarea" rows="2" maxlength="160" placeholder="例如：本周团本只打到 4，M+ 已满 8。" />
                </label>
              </div>
            </div>

            <div v-else-if="weeklyVaultsExpanded" class="empty-inline">当前还没有周低保记录</div>
          </section>

          <section v-if="showEndgameSections" class="dialog-block">
            <div class="dialog-block-head">
              <div>
                <h4 class="dialog-block-title">大秘境赛季记录</h4>
                <p class="dialog-block-tip">默认只显示总分，展开后维护每个副本的分数和最高限时层数。</p>
              </div>
              <button type="button" class="icon-toggle-btn" @click="toggleMythicRuns">
                <img src="/brand/wow-mythic-record-icon.png" alt="大秘境记录" />
                <span>总分 {{ formatScore(formMythicScore) }}</span>
              </button>
            </div>
            <div v-if="mythicRunsExpanded" class="mythic-season-board editable-mythic-board">
              <div class="mythic-season-top">
                <div>
                  <span class="mythic-season-kicker">史诗钥石评分</span>
                  <strong>{{ formatScore(formMythicScore) }}</strong>
                </div>
                <div class="mythic-current-key">
                  <span>当前钥石</span>
                  <b>{{ formatMythicSummary(form) }}</b>
                </div>
              </div>

              <div class="mythic-dungeon-grid editable-dungeon-grid">
                <div
                  v-for="item in form.mythicRuns"
                  :key="item.dungeonName"
                  class="mythic-dungeon-tile"
                  :class="{ empty: !item.bestTimedLevel && !item.score }"
                >
                  <div class="dungeon-tile-art">
                    <span>{{ formatDungeonShortLabel(item.dungeonLabel) }}</span>
                  </div>
                  <div class="dungeon-tile-fields">
                    <label>
                      <span>评分</span>
                      <input v-model.number="item.score" class="tile-input" type="number" min="0" max="9999" step="1" />
                    </label>
                    <label>
                      <span>限时</span>
                      <input v-model.number="item.bestTimedLevel" class="tile-input" type="number" min="0" max="40" step="1" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="dialog-block">
            <div class="dialog-block-head">
              <div>
                <h4 class="dialog-block-title">键位方案</h4>
                <p class="dialog-block-tip">可保存多套用户命名的插件键位字符串，内容默认隐藏。</p>
              </div>
              <button type="button" class="ghost-btn" @click="openKeybindingDialog()">新增方案</button>
            </div>
            <div v-if="form.keybindings.length" class="keybinding-list">
              <div v-for="(item, index) in form.keybindings" :key="item.localKey" class="keybinding-row">
                <div>
                  <strong>{{ item.bindingName }}</strong>
                  <span :class="{ saved: item.bindingContent }">{{ item.bindingContent ? '已保存键位' : '未保存键位' }}</span>
                </div>
                <div class="keybinding-actions">
                  <button type="button" class="mini-btn" @click="openKeybindingDialog(item)">编辑 / 复制</button>
                  <button type="button" class="mini-btn danger" @click="removeKeybinding(index)">删除</button>
                </div>
              </div>
            </div>
            <div v-else class="empty-inline keybinding-empty">还没有键位方案</div>
          </section>

          <label class="form-field">
            <span>备注</span>
            <textarea v-model.trim="form.note" class="input textarea" rows="3" maxlength="160" placeholder="补充记录当前版本定位、账号用途等" />
          </label>

        </form>
        <template #footer>
          <button type="submit" form="wow-character-dialog-form" class="action-btn" :disabled="submitting">
            {{ submitting ? '提交中...' : (dialogMode === 'create' ? '保存角色' : '更新角色') }}
          </button>
        </template>
    </MacDialog>

    <MacDialog
      v-model="showKeybindingDialog"
      :title="activeKeybinding?.bindingName || '新增键位方案'"
      subtitle="设置一个容易识别的名称，键位字符串只在这里显示。"
      width="720px"
      panel-class="wow-keybinding-dialog"
      :close-disabled="false"
      @close="closeKeybindingDialog"
    >
      <div v-if="activeKeybinding" class="keybinding-editor">
        <label class="form-field">
          <span>方案名称</span>
          <input v-model.trim="activeKeybinding.bindingName" class="input" maxlength="64" placeholder="例如：团本治疗、大秘境输出" />
        </label>
        <label class="form-field">
          <span>键位字符串</span>
          <textarea
            v-model="activeKeybinding.bindingContent"
            class="input textarea keybinding-textarea"
            rows="10"
            placeholder="粘贴插件导出的键位字符串"
          />
        </label>
      </div>
      <template #footer>
        <button v-if="activeKeybinding" type="button" class="ghost-btn" @click="copyActiveKeybinding">复制字符串</button>
        <button v-if="activeKeybinding" type="button" class="action-btn" @click="saveActiveKeybinding">保存方案</button>
      </template>
    </MacDialog>

    <div
      v-if="activeFeaturedScoreItem"
      class="score-popover floating-score-popover mythic-score-panel"
      :style="featuredScorePopoverStyle"
      @mouseleave="hideFeaturedScorePopover"
    >
      <div class="mythic-panel-header">
        <strong>史诗钥石地下城</strong>
        <button type="button" class="popover-close-btn" @click="hideFeaturedScorePopover">×</button>
      </div>
      <div class="mythic-panel-score">
        <div>
          <span>史诗钥石评分</span>
          <strong>{{ formatScore(activeFeaturedScoreItem.mythicScore) }}</strong>
        </div>
        <p>当前钥石：{{ formatCurrentKey(activeFeaturedScoreItem) }}</p>
      </div>
      <div class="mythic-dungeon-grid popover-dungeon-grid">
        <div
          v-for="run in buildFeaturedScoreDetails(activeFeaturedScoreItem)"
          :key="`${activeFeaturedScoreItem.id}-${run.dungeonName}`"
          class="mythic-dungeon-tile compact-dungeon-tile"
          :class="{ empty: !run.bestTimedLevel && !run.score }"
        >
          <div class="dungeon-tile-art">
            <span>{{ formatDungeonShortLabel(run.dungeonLabel) }}</span>
          </div>
          <div class="dungeon-tile-score">
            <strong>{{ formatScore(run.score) }}</strong>
            <span>{{ run.bestTimedLevel ? run.bestTimedLevel : '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {useRouter} from 'vue-router'
import MacDialog from '@/components/MacDialog.vue'
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
import {shouldShowEndgameSections} from '@/utils/wowCharacterDisplay'

const PAGE_SIZE_OPTIONS = [12, 20, 40]
const CHARACTER_SORT_COLUMNS = [
  {field: 'faction', label: '阵营'},
  {field: 'characterName', label: '角色名', mobileLabel: '角色'},
  {field: 'specName', label: '专精'},
  {field: 'level', label: '等级'},
  {field: 'realmName', label: '服务器'},
  {field: 'itemLevel', label: '装等'},
  {field: 'currentKey', label: '当前钥匙', mobileLabel: '钥匙'},
  {field: 'mythicScore', label: 'M+ 总分', mobileLabel: '评分'}
]
const WOW_APP_CODE = 'APP_WOW_CHARACTER'
const WOW_MODULE_CODE = 'WOW_CHARACTER'
const FACTION_FIELD_CODE = 'faction'
const CLASS_NAME_FIELD_CODE = 'className'
const RACE_NAME_FIELD_CODE = 'raceName'
const SPEC_NAME_FIELD_CODE = 'specName'
const MYTHIC_DUNGEON_FIELD_CODE = 'mythicDungeonName'
const PROFESSION_PRIMARY_FIELD_CODE = 'professionPrimary'
const DEFAULT_FACTION_VALUE = 'ALLIANCE'
const RAID_THRESHOLDS = [2, 4, 6]
const MYTHIC_THRESHOLDS = [1, 4, 8]
const WORLD_THRESHOLDS = [2, 4, 8]
const VAULT_REWARD_TRACKS = [
  {
    key: 'raid',
    title: '团队副本',
    progressField: 'raidProgressCount',
    maxProgress: 6,
    thresholds: RAID_THRESHOLDS,
    rewardText: '团本奖励',
    labels: ['击败 2 个团队首领', '击败 4 个团队首领', '击败 6 个团队首领']
  },
  {
    key: 'mythic',
    title: '地下城',
    progressField: 'mythicProgressCount',
    maxProgress: 8,
    thresholds: MYTHIC_THRESHOLDS,
    rewardText: '地下城奖励',
    labels: ['完成 1 个史诗钥石地下城', '完成 4 个史诗钥石地下城', '完成 8 个史诗钥石地下城']
  },
  {
    key: 'world',
    title: '世界',
    progressField: 'worldProgressCount',
    maxProgress: 8,
    thresholds: WORLD_THRESHOLDS,
    rewardText: '世界奖励',
    labels: ['完成 2 项世界活动', '完成 4 项世界活动', '完成 8 项世界活动']
  }
]
const DUNGEON_SHORT_LABELS = {
  '魔导师平台': '魔导',
  '迈萨拉洞窟': '洞窟',
  '节点希纳斯': '节点',
  '风行者之塔': '风行',
  '艾杰斯亚学院': '学院',
  '萨隆矿坑': '矿坑',
  '执政团之座': '执政',
  '通天峰': '通天',
  '通天': '通天',
  '破晨号': '晨号',
  '艾拉-卡拉，回响之城': '回响',
  '塞兹仙林的迷雾': '迷雾',
  '围攻伯拉勒斯': '围攻',
  '格瑞姆巴托': '格瑞',
  '伤逝剧场': '剧场',
  '暴富矿区': '矿区',
  '驭雷栖巢': '栖巢'
}

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

function formatDecimal(value) {
  return toNumber(value, 0).toFixed(2)
}

function formatScore(value) {
  return String(Math.round(toNumber(value, 0)))
}

function createWeeklyVaultDraft(source = {}) {
  return {
    id: source.id || null,
    localKey: source.localKey || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    weekStartDate: source.weekStartDate || '',
    raidProgressCount: toNumber(source.raidProgressCount, 0),
    mythicProgressCount: toNumber(source.mythicProgressCount, 0),
    worldProgressCount: toNumber(source.worldProgressCount, 0),
    note: source.note || ''
  }
}

function normalizeMythicRunList(rawRuns, dungeonOptions) {
  const runMap = new Map()
  if (Array.isArray(rawRuns)) {
    rawRuns.forEach((item) => {
      const normalizedValue = findOptionByAny(dungeonOptions, item?.dungeonName)?.value || item?.dungeonName || ''
      if (!normalizedValue) {
        return
      }
      runMap.set(normalizedValue, {
        dungeonName: normalizedValue,
        bestTimedLevel: toNumber(item?.bestTimedLevel, 0),
        score: toNumber(item?.score, 0)
      })
    })
  }
  return dungeonOptions.map((option) => ({
    dungeonName: option.value,
    dungeonLabel: option.label,
    bestTimedLevel: runMap.get(option.value)?.bestTimedLevel || 0,
    score: runMap.get(option.value)?.score || 0
  }))
}

function createKeybindingDraft(source = {}, fallbackName = '') {
  return {
    localKey: source.localKey || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bindingName: source.bindingName || source.specNameLabel || source.specName || fallbackName,
    bindingContent: source.bindingContent || '',
    hasKeybinding: Boolean(source.hasKeybinding || source.bindingContent)
  }
}

function normalizeKeybindingList(rawKeybindings) {
  if (!Array.isArray(rawKeybindings)) {
    return []
  }
  return rawKeybindings.map((item, index) => createKeybindingDraft(item, `键位方案 ${index + 1}`))
}

function normalizeCharacter(item = {}, dungeonOptions = []) {
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
    isFeatured: Boolean(item.isFeatured),
    mythicDungeonName: item.mythicDungeonName || item.mythicDungeon || item.bestDungeonName || item.keystoneName || '',
    mythicBestLevel: toNumber(item.mythicBestLevel ?? item.mythicLevel, 0),
    mythicScore: toNumber(item.mythicScore ?? item.mythicRating, 0),
    mythicCompletedDungeonCount: toNumber(item.mythicCompletedDungeonCount, 0),
    mythicRuns: normalizeMythicRunList(item.mythicRuns || item.mythicRunList || [], dungeonOptions),
    keybindings: Array.isArray(item.keybindings) ? item.keybindings : [],
    weeklyVaults: Array.isArray(item.weeklyVaults)
      ? item.weeklyVaults.map((vault) => createWeeklyVaultDraft(vault))
      : [],
    professionPrimary: item.professionPrimary || item.profession1 || '',
    professionSecondary: item.professionSecondary || item.profession2 || '',
    note: item.note || item.remark || '',
    updatedAt: item.updatedAt || item.updateTime || item.createdAt || item.createTime || ''
  }
}

function normalizeOverview(payload = {}, dungeonOptions = []) {
  return {
    totalCharacters: toNumber(payload.totalCharacters, 0),
    totalRealms: toNumber(payload.totalRealms, 0),
    highestItemLevel: toNumber(payload.highestItemLevel, 0),
    highestMythicScore: toNumber(payload.highestMythicScore, 0),
    averageItemLevel: toNumber(payload.averageItemLevel, 0),
    featuredCharacters: Array.isArray(payload.featuredCharacters)
      ? payload.featuredCharacters.map((item) => normalizeCharacter(item, dungeonOptions))
      : [],
    factionStats: Array.isArray(payload.factionStats)
      ? payload.factionStats.map((item) => ({
        label: item.label || item.name || '-',
        count: toNumber(item.count, 0),
        ratio: item.ratio || '0%'
      }))
      : [],
    classStats: Array.isArray(payload.classStats)
      ? payload.classStats.map((item) => ({
        className: item.className || '-',
        count: toNumber(item.count, 0),
        averageItemLevel: toNumber(item.averageItemLevel, 0)
      }))
      : [],
    realmStats: Array.isArray(payload.realmStats)
      ? payload.realmStats.map((item) => ({
        realmName: item.realmName || '-',
        count: toNumber(item.count, 0),
        highestItemLevel: toNumber(item.highestItemLevel, 0)
      }))
      : []
  }
}

export default {
  name: 'WowCharacterStats',
  components: {MacDialog},
  setup() {
    const router = useRouter()

    const loading = ref(false)
    const submitting = ref(false)
    const total = ref(0)
    const pagedRecords = ref([])
    const featuredCharacters = ref([])
    const activeFeaturedScoreItem = ref(null)
    const factionStats = ref([])
    const classStats = ref([])
    const realmStats = ref([])
    const showDialog = ref(false)
    const showKeybindingDialog = ref(false)
    const mythicRunsExpanded = ref(false)
    const weeklyVaultsExpanded = ref(false)
    const activeKeybinding = ref(null)
    const activeKeybindingIndex = ref(-1)
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
      pageSize: PAGE_SIZE_OPTIONS[0],
      sortField: '',
      sortDirection: ''
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
      isFeatured: false,
      mythicBestLevel: 0,
      mythicDungeonName: '',
      mythicRuns: [],
      weeklyVaults: [],
      keybindings: [],
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
    const featuredScorePopoverPosition = reactive({
      left: 0,
      top: 0
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const spotlightPlaceholderCount = computed(() => (
      featuredCharacters.value.length ? Math.max(0, 4 - featuredCharacters.value.length) : 1
    ))
    const featuredScorePopoverStyle = computed(() => ({
      left: `${featuredScorePopoverPosition.left}px`,
      top: `${featuredScorePopoverPosition.top}px`
    }))
    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const sortColumns = CHARACTER_SORT_COLUMNS
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
    const formMythicScore = computed(() => form.mythicRuns.reduce((totalScore, item) => totalScore + toNumber(item.score, 0), 0))
    const showEndgameSections = computed(() => shouldShowEndgameSections(form.level))

    const getDefaultFactionValue = () => {
      const matched = factionOptions.value.find((item) => item.value === DEFAULT_FACTION_VALUE)
      return matched?.value || factionOptions.value[0]?.value || DEFAULT_FACTION_VALUE
    }

    const getDefaultClassValue = () => classOptions.value.find((item) => item.isDefault)?.value || classOptions.value[0]?.value || ''

    const createDefaultMythicRuns = () => normalizeMythicRunList([], mythicDungeonOptions.value)
    const createDefaultKeybindings = () => []

    const normalizeFormSelections = () => {
      form.className = normalizeSelectedValue(classOptions.value, form.className, getDefaultClassValue())
      form.faction = normalizeSelectedValue(factionOptions.value, form.faction, getDefaultFactionValue())
      form.raceName = normalizeSelectedValue(raceOptions.value, form.raceName, '')
      form.specName = normalizeSelectedValue(specOptions.value, form.specName, '')
      form.mythicDungeonName = normalizeSelectedValue(mythicDungeonOptions.value, form.mythicDungeonName, '')
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
      if (!form.mythicRuns.length) {
        form.mythicRuns = createDefaultMythicRuns()
      } else {
        form.mythicRuns = normalizeMythicRunList(form.mythicRuns, mythicDungeonOptions.value)
      }
      form.keybindings = normalizeKeybindingList(form.keybindings)
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
      activeFeaturedScoreItem.value = null
      factionStats.value = []
      classStats.value = []
      realmStats.value = []
    }

    const applyOverview = (payload = {}) => {
      const nextOverview = normalizeOverview(payload, mythicDungeonOptions.value)
      overview.totalCharacters = nextOverview.totalCharacters
      overview.totalRealms = nextOverview.totalRealms
      overview.highestItemLevel = nextOverview.highestItemLevel
      overview.highestMythicScore = nextOverview.highestMythicScore
      overview.averageItemLevel = nextOverview.averageItemLevel
      featuredCharacters.value = nextOverview.featuredCharacters
      activeFeaturedScoreItem.value = null
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
          className: query.className || undefined,
          sortField: query.sortField || undefined,
          sortDirection: query.sortDirection || undefined
        })
        const payload = unwrapData(listRes) || {}
        const rawList = Array.isArray(payload)
          ? payload
          : (payload.list || payload.records || payload.rows || [])
        const normalizedList = rawList.map((item) => normalizeCharacter(item, mythicDungeonOptions.value))
        pagedRecords.value = normalizedList
        total.value = toNumber(payload.total ?? payload.count, normalizedList.length)
      } catch (error) {
        pagedRecords.value = []
        total.value = 0
        alert(getErrorMessage(error, 'WoW角色数据加载失败'))
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
      form.isFeatured = false
      form.mythicBestLevel = 0
      form.mythicDungeonName = ''
      form.mythicRuns = createDefaultMythicRuns()
      form.weeklyVaults = []
      form.keybindings = createDefaultKeybindings()
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
      form.isFeatured = Boolean(record.isFeatured)
      form.mythicBestLevel = Number(record.mythicBestLevel || 0)
      form.mythicDungeonName = normalizeSelectedValue(mythicDungeonOptions.value, record.mythicDungeonName, '')
      form.mythicRuns = normalizeMythicRunList(record.mythicRuns || [], mythicDungeonOptions.value)
      form.weeklyVaults = Array.isArray(record.weeklyVaults)
        ? record.weeklyVaults.map((item) => createWeeklyVaultDraft(item))
        : []
      form.keybindings = normalizeKeybindingList(record.keybindings || [])
      form.professionPrimary = normalizeSelectedValue(professionOptions.value, record.professionPrimary, '')
      form.professionSecondary = normalizeSelectedValue(professionOptions.value, record.professionSecondary, '')
      form.note = record.note || ''
      normalizeFormSelections()
    }

    const appendWeeklyVault = () => {
      form.weeklyVaults.push(createWeeklyVaultDraft())
    }

    const removeWeeklyVault = (index) => {
      form.weeklyVaults.splice(index, 1)
    }

    const toggleWeeklyVaults = () => {
      weeklyVaultsExpanded.value = !weeklyVaultsExpanded.value
      if (weeklyVaultsExpanded.value && !form.weeklyVaults.length) {
        appendWeeklyVault()
      }
    }

    const toggleMythicRuns = () => {
      mythicRunsExpanded.value = !mythicRunsExpanded.value
    }

    const openKeybindingDialog = (item = null) => {
      activeKeybindingIndex.value = item
        ? form.keybindings.findIndex((current) => current.localKey === item.localKey)
        : -1
      activeKeybinding.value = createKeybindingDraft(item || {})
      showKeybindingDialog.value = true
    }

    const closeKeybindingDialog = () => {
      showKeybindingDialog.value = false
      activeKeybinding.value = null
      activeKeybindingIndex.value = -1
    }

    const saveActiveKeybinding = () => {
      const bindingName = `${activeKeybinding.value?.bindingName || ''}`.trim()
      if (!bindingName) {
        alert('请输入键位方案名称')
        return
      }
      const normalizedName = bindingName.toLocaleLowerCase()
      const hasDuplicateName = form.keybindings.some((item, index) => (
        index !== activeKeybindingIndex.value
        && `${item.bindingName || ''}`.trim().toLocaleLowerCase() === normalizedName
      ))
      if (hasDuplicateName) {
        alert('键位方案名称不能重复')
        return
      }
      const savedKeybinding = createKeybindingDraft({
        ...activeKeybinding.value,
        bindingName
      })
      if (activeKeybindingIndex.value >= 0) {
        form.keybindings.splice(activeKeybindingIndex.value, 1, savedKeybinding)
      } else {
        form.keybindings.push(savedKeybinding)
      }
      closeKeybindingDialog()
    }

    const removeKeybinding = (index) => {
      const item = form.keybindings[index]
      if (!item || !window.confirm(`确认删除键位方案【${item.bindingName}】吗？`)) {
        return
      }
      form.keybindings.splice(index, 1)
    }

    const copyActiveKeybinding = async () => {
      const content = activeKeybinding.value?.bindingContent || ''
      if (!content) {
        alert('当前方案还没有保存键位字符串')
        return
      }
      try {
        await navigator.clipboard.writeText(content)
        alert('键位字符串已复制')
      } catch (error) {
        alert('浏览器暂不允许自动复制，请手动复制弹窗中的内容')
      }
    }

    const openCreateDialog = () => {
      dialogMode.value = 'create'
      editingId.value = ''
      resetForm()
      mythicRunsExpanded.value = false
      weeklyVaultsExpanded.value = false
      showDialog.value = true
    }

    const openEditDialog = (item) => {
      dialogMode.value = 'edit'
      editingId.value = item.id
      fillForm(item)
      mythicRunsExpanded.value = false
      weeklyVaultsExpanded.value = false
      showDialog.value = true
    }

    const closeDialog = () => {
      if (submitting.value) {
        return
      }
      showDialog.value = false
      closeKeybindingDialog()
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
      isFeatured: Boolean(form.isFeatured),
      mythicBestLevel: Number(form.mythicBestLevel || 0),
      mythicDungeonName: form.mythicDungeonName || null,
      mythicRuns: showEndgameSections.value ? form.mythicRuns.map((item) => ({
        dungeonName: item.dungeonName,
        bestTimedLevel: Number(item.bestTimedLevel || 0),
        score: Number(item.score || 0)
      })) : [],
      weeklyVaults: showEndgameSections.value ? form.weeklyVaults.map((item) => ({
        id: item.id || null,
        weekStartDate: item.weekStartDate || null,
        raidProgressCount: Number(item.raidProgressCount || 0),
        mythicProgressCount: Number(item.mythicProgressCount || 0),
        worldProgressCount: Number(item.worldProgressCount || 0),
        note: item.note || ''
      })) : [],
      keybindings: form.keybindings.map((item) => ({
        bindingName: item.bindingName,
        bindingContent: item.bindingContent || ''
      })),
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
      const keybindingNames = new Set()
      for (const item of form.keybindings) {
        const bindingName = `${item.bindingName || ''}`.trim()
        if (!bindingName) {
          alert('键位方案名称不能为空')
          return
        }
        const normalizedName = bindingName.toLocaleLowerCase()
        if (keybindingNames.has(normalizedName)) {
          alert('键位方案名称不能重复')
          return
        }
        keybindingNames.add(normalizedName)
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
        alert('当前钥匙层数大于 0 时，请选择当前钥匙副本')
        return
      }
      if (form.mythicDungeonName && toNumber(form.mythicBestLevel, 0) <= 0) {
        alert('选择当前钥匙副本后，请填写大于 0 的当前钥匙层数')
        return
      }
      if (showEndgameSections.value) {
        const weekSet = new Set()
        for (const item of form.weeklyVaults) {
          if (!item.weekStartDate) {
            alert('请完整填写每周低保的周起始日')
            return
          }
          if (weekSet.has(item.weekStartDate)) {
            alert('每周低保存在重复周起始日')
            return
          }
          weekSet.add(item.weekStartDate)
        }
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
      query.sortField = ''
      query.sortDirection = ''
      loadCharacters()
    }

    const toggleSort = async (field) => {
      if (loading.value) {
        return
      }
      if (query.sortField !== field) {
        query.sortField = field
        query.sortDirection = 'DESC'
      } else if (query.sortDirection === 'DESC') {
        query.sortDirection = 'ASC'
      } else {
        query.sortField = ''
        query.sortDirection = ''
      }
      query.pageNo = 1
      await loadCharacters()
    }

    const getSortIndicator = (field) => {
      if (query.sortField !== field) {
        return '↕'
      }
      return query.sortDirection === 'DESC' ? '↓' : '↑'
    }

    const getSortButtonTitle = (column) => {
      if (query.sortField !== column.field) {
        return `${column.label}：点击按降序排列`
      }
      return query.sortDirection === 'DESC'
        ? `${column.label}：当前降序，点击切换为升序`
        : `${column.label}：当前升序，点击取消排序`
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
    const getFactionIcon = (value) => value === 'HORDE'
      ? '/brand/wow-horde-faction-icon.png'
      : '/brand/wow-alliance-faction-icon.png'
    const formatSpecText = (value) => value ? getOptionLabel(specOptions.value, value, value) : ''
    const formatRaceText = (value) => value ? getOptionLabel(raceOptions.value, value, value) : '-'
    const formatProfessionValue = (value) => value ? getOptionLabel(professionOptions.value, value, value) : ''
    const formatProfessionText = (item) => [formatProfessionValue(item.professionPrimary), formatProfessionValue(item.professionSecondary)].filter(Boolean).join(' / ') || '-'
    const formatMythicSummary = (item) => {
      const dungeonName = getOptionLabel(mythicDungeonOptions.value, item?.mythicDungeonName, item?.mythicDungeonName || '')
      const bestLevel = Number(item?.mythicBestLevel || 0)
      if (bestLevel > 0 && dungeonName) {
        return `+${bestLevel} ${dungeonName}`
      }
      return '未设置'
    }
    const formatCurrentKey = (item) => formatMythicSummary(item)
    const formatLatestVaultText = (weeklyVaults = []) => {
      if (!Array.isArray(weeklyVaults) || !weeklyVaults.length) {
        return '-'
      }
      const latest = weeklyVaults[0]
      const unlocked = [latest.raidProgressCount >= 2 ? 1 : 0, latest.raidProgressCount >= 4 ? 1 : 0, latest.raidProgressCount >= 6 ? 1 : 0].filter(Boolean).length
        + [latest.mythicProgressCount >= 1 ? 1 : 0, latest.mythicProgressCount >= 4 ? 1 : 0, latest.mythicProgressCount >= 8 ? 1 : 0].filter(Boolean).length
        + [latest.worldProgressCount >= 2 ? 1 : 0, latest.worldProgressCount >= 4 ? 1 : 0, latest.worldProgressCount >= 8 ? 1 : 0].filter(Boolean).length
      return `${latest.weekStartDate || '未设日期'} · ${unlocked}/9`
    }
    const buildVaultRewardTracks = (weeklyVault) => VAULT_REWARD_TRACKS.map((track) => {
      const progress = Math.max(0, toNumber(weeklyVault?.[track.progressField], 0))
      return {
        ...track,
        progress,
        rewards: track.thresholds.map((threshold, index) => ({
          threshold,
          label: track.labels[index],
          unlocked: progress >= threshold,
          percent: Math.min(100, Math.round((progress / threshold) * 100)),
          progressText: `${Math.min(progress, threshold)}/${threshold}`,
          rewardText: track.rewardText
        }))
      }
    })
    const buildAvatarText = (name) => `${name || '角'}`.slice(0, 2)
    const formatDungeonShortLabel = (label) => {
      const normalized = `${label || ''}`.trim()
      if (!normalized) {
        return '-'
      }
      return DUNGEON_SHORT_LABELS[normalized] || normalized.slice(-2)
    }
    const buildFeaturedScoreDetails = (item) => Array.isArray(item?.mythicRuns)
      ? item.mythicRuns.map((run) => ({
        dungeonName: run.dungeonName,
        dungeonLabel: getOptionLabel(mythicDungeonOptions.value, run.dungeonName, run.dungeonName || '-'),
        bestTimedLevel: toNumber(run.bestTimedLevel, 0),
        score: toNumber(run.score, 0)
      }))
      : []
    const showFeaturedScorePopover = (event, item) => {
      if (activeFeaturedScoreItem.value?.id === item.id) {
        activeFeaturedScoreItem.value = null
        return
      }
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0
      const popoverWidth = Math.min(560, Math.max(280, viewportWidth - 24))
      const popoverHeight = 420
      featuredScorePopoverPosition.left = Math.min(
        Math.max(12, event.clientX + 12),
        Math.max(12, viewportWidth - popoverWidth - 12)
      )
      featuredScorePopoverPosition.top = Math.min(
        Math.max(12, event.clientY + 12),
        Math.max(12, viewportHeight - popoverHeight - 12)
      )
      activeFeaturedScoreItem.value = item
    }
    const hideFeaturedScorePopover = () => {
      activeFeaturedScoreItem.value = null
    }
    const getClassMeta = (className) => getClassMetaByName(classMetaMap.value, className)

    const buildCardStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      const backgroundImage = item.faction === 'HORDE'
        ? 'url(/brand/wow-horde-card-bg.png)'
        : 'url(/brand/wow-alliance-card-bg.png)'
      return {
        '--card-accent': classMeta.color,
        '--card-accent-soft': classColorToRgba(classMeta.color, 0.22),
        '--card-bg-image': backgroundImage
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
        '--business-accent': classMeta.color
      }
    }

    const buildMobileCardStyle = (item) => {
      const classMeta = getClassMeta(item.className)
      return {
        borderColor: classColorToRgba(classMeta.color, 0.36),
        boxShadow: `inset 0 1px 0 ${classColorToRgba(classMeta.color, 0.18)}`
      }
    }

    const buildFactionRowClass = (item) => item?.faction === 'HORDE' ? 'faction-row-horde' : 'faction-row-alliance'

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
      resetForm()
      await loadPageData()
    })

    return {
      loading,
      submitting,
      total,
      pagedRecords,
      featuredCharacters,
      activeFeaturedScoreItem,
      featuredScorePopoverStyle,
      factionStats,
      classStats,
      realmStats,
      query,
      form,
      overview,
      showDialog,
      showKeybindingDialog,
      activeKeybinding,
      mythicRunsExpanded,
      weeklyVaultsExpanded,
      dialogMode,
      pageSizeOptions,
      sortColumns,
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
      spotlightPlaceholderCount,
      formMythicScore,
      showEndgameSections,
      RAID_THRESHOLDS,
      MYTHIC_THRESHOLDS,
      WORLD_THRESHOLDS,
      formatDecimal,
      formatScore,
      handleSearch,
      resetQuery,
      toggleSort,
      getSortIndicator,
      getSortButtonTitle,
      changePage,
      handlePageSizeChange,
      openCreateDialog,
      openEditDialog,
      closeDialog,
      submitDialog,
      removeCharacter,
      loadPageData,
      appendWeeklyVault,
      removeWeeklyVault,
      toggleWeeklyVaults,
      toggleMythicRuns,
      openKeybindingDialog,
      closeKeybindingDialog,
      saveActiveKeybinding,
      removeKeybinding,
      copyActiveKeybinding,
      goBack,
      formatFactionText,
      getFactionIcon,
      formatSpecText,
      formatRaceText,
      formatCurrentKey,
      formatMythicSummary,
      formatLatestVaultText,
      buildVaultRewardTracks,
      formatProfessionText,
      buildAvatarText,
      formatDungeonShortLabel,
      buildFeaturedScoreDetails,
      showFeaturedScorePopover,
      hideFeaturedScorePopover,
      getClassMeta,
      buildCardStyle,
      buildAvatarStyle,
      buildNameBadgeStyle,
      buildClassStatStyle,
      buildMobileCardStyle,
      buildFactionRowClass
    }
  }
}
</script>

<style scoped>
.wow-page {
  min-height: 100vh;
  height: 100%;
  padding: 16px 20px 24px;
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
.insight-panel {
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
.mobile-card-actions,
.weekly-vault-head,
.dialog-block-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.stats-row,
.weekly-vault-head,
.dialog-block-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.insight-title,
.dialog-block-title,
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
.empty-card-content span,
.dialog-block-tip {
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
.filter-grid,
.weekly-vault-grid {
  display: grid;
  gap: 12px;
}

.spotlight-grid {
  margin-top: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.character-card {
  position: relative;
  min-height: 190px;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(140deg, rgba(5, 16, 29, 0.88), rgba(5, 16, 29, 0.4)),
    radial-gradient(circle at top left, var(--card-accent-soft, rgba(255, 255, 255, 0.16)), transparent 48%),
    var(--card-bg-image) center/cover no-repeat,
    linear-gradient(135deg, rgba(8, 19, 38, 0.96), rgba(18, 45, 79, 0.9));
}

.character-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.05), transparent 30%),
    radial-gradient(circle at 92% 22%, rgba(255, 255, 255, 0.08), transparent 24%);
  pointer-events: none;
}

.character-card-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 16px;
}

.character-watermark {
  position: absolute;
  right: 10px;
  bottom: -8px;
  font-size: 122px;
  line-height: 1;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.16), 0 10px 18px rgba(0, 0, 0, 0.22);
  font-size: 18px;
  font-weight: 700;
}

.card-title-wrap {
  min-width: 0;
}

.title-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.character-name {
  font-size: 22px;
  letter-spacing: 0.4px;
}

.spec-chip {
  background: rgba(255, 218, 119, 0.18);
  color: #ffe7a0;
}

.card-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.74);
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.card-stat {
  position: relative;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(4, 14, 28, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.score-stat {
  cursor: pointer;
}

.score-cell,
.score-mobile-cell {
  cursor: pointer;
}

.score-cell {
  color: #ffd76e;
  font-weight: 800;
}

.score-popover {
  position: relative;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 207, 89, 0.22);
  background:
    linear-gradient(135deg, rgba(6, 7, 13, 0.9), rgba(35, 25, 42, 0.82)),
    radial-gradient(circle at 18% 18%, rgba(255, 206, 78, 0.2), transparent 28%),
    radial-gradient(circle at 84% 36%, rgba(54, 169, 255, 0.16), transparent 32%);
  box-shadow: 0 22px 36px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(16px);
}

.floating-score-popover {
  position: fixed;
  z-index: 60;
  width: min(560px, calc(100vw - 24px));
}

.mythic-score-panel {
  overflow: hidden;
}

.mythic-score-panel::before,
.mythic-season-board::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, transparent, rgba(255, 206, 78, 0.08), transparent),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0 1px, transparent 1px 9px);
  mix-blend-mode: screen;
  opacity: 0.48;
}

.mythic-panel-header,
.mythic-season-top {
  position: relative;
  z-index: 1;
}

.mythic-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #ffdf5f;
}

.mythic-panel-header strong {
  font-size: 16px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.52);
}

.popover-close-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 999px;
  color: #ffffff;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.14);
}

.mythic-panel-score {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.34);
  border: 1px solid rgba(255, 207, 89, 0.16);
}

.mythic-panel-score div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mythic-panel-score span,
.mythic-panel-score p {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
}

.mythic-panel-score strong {
  color: #ff9f1c;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 0;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.48);
}

.card-stat span,
.card-meta span,
.field span,
.form-field span,
.mobile-card-grid span,
.summary-card span,
.class-stat-item span,
.stats-row span,
.cell-muted,
.mini-field span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.card-stat strong {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  line-height: 1.15;
  word-break: break-word;
  color: #ffd76e;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-meta span {
  padding: 7px 9px;
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
.form-field,
.mini-field {
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
  grid-template-columns: minmax(0, 1.72fr) minmax(320px, 0.98fr);
  align-items: start;
  gap: 14px;
}

.insight-panel {
  min-width: 0;
  align-self: start;
}

.insight-panel-head {
  padding-bottom: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-grid {
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
}

.summary-card,
.overview-metric,
.class-stat-item,
.stats-row,
.mobile-card,
.dialog-block,
.weekly-vault-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.overview-metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  min-height: 54px;
  padding: 8px;
  border-radius: 8px;
}

.overview-metric strong {
  overflow: hidden;
  font-size: 16px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #ffd76e;
}

.overview-metric span {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.72);
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
  margin-top: 14px;
}

.compact-insight-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.insight-detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.compact-insight-block .insight-head {
  min-height: 24px;
  gap: 8px;
}

.compact-insight-block .insight-title {
  font-size: 14px;
}

.insight-head-meta {
  color: rgba(255, 255, 255, 0.54);
  font-size: 11px;
}

.faction-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
}

.faction-summary-item {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 7px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
}

.faction-summary-item > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.faction-summary-item strong,
.faction-summary-item span,
.faction-summary-item b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.faction-summary-item strong {
  font-size: 12px;
}

.faction-summary-item span {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
}

.faction-summary-item b {
  color: #ffd76e;
  font-size: 12px;
}

.realm-summary-list {
  margin-top: 5px;
}

.realm-summary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 5px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.realm-summary-row:last-child {
  border-bottom: 0;
}

.realm-summary-row strong,
.realm-summary-row span,
.realm-summary-row b {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.realm-summary-row span {
  color: rgba(255, 255, 255, 0.56);
}

.realm-summary-row b {
  color: rgba(255, 215, 110, 0.9);
  font-weight: 600;
}

.class-stat-list.compact-class-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
}

.class-stat-item.compact-class-stat-item {
  min-width: 0;
  gap: 2px;
  padding: 7px 8px;
  border-radius: 8px;
}

.class-stat-main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.class-stat-main strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-stat-main b {
  flex: 0 0 auto;
  font-size: 12px;
}

.compact-class-stat-item span {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-list,
.class-stat-list,
.weekly-vault-list,
.mythic-run-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-row,
.class-stat-item {
  padding: 12px 14px;
}

.compact-stats-list {
  gap: 8px;
}

.compact-stats-row {
  padding: 10px 12px;
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
.mini-btn,
.icon-toggle-btn {
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

.icon-toggle-btn {
  min-height: 44px;
  padding: 4px 10px 4px 6px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.icon-toggle-btn img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
}

.section-tools {
  display: flex;
  justify-content: flex-end;
  margin: 10px 0;
}

.table-wrap {
  margin-top: 14px;
  overflow-x: auto;
}

.character-table {
  width: 100%;
  min-width: 860px;
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

.faction-column {
  width: 58px;
  text-align: center !important;
}

.sort-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 0;
  border: 0;
  color: inherit;
  font: inherit;
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
}

.sort-header-btn:disabled {
  cursor: wait;
  opacity: 0.62;
}

.sort-header-btn.active,
.sort-header-btn:hover {
  color: #f8cf62;
}

.sort-indicator {
  width: 12px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 12px;
  text-align: center;
}

.sort-header-btn.active .sort-indicator {
  color: #f8cf62;
}

.faction-icon {
  display: block;
  width: 32px;
  height: 32px;
  margin: 0 auto;
  border: 1px solid rgba(248, 207, 98, 0.46);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.32);
}

.character-row {
  transition: background 0.18s ease;
}

.character-row.faction-row-alliance {
  background: linear-gradient(90deg, rgba(37, 99, 235, 0.12), rgba(37, 99, 235, 0.03));
}

.character-row.faction-row-horde {
  background: linear-gradient(90deg, rgba(185, 28, 28, 0.12), rgba(185, 28, 28, 0.03));
}

.character-row:hover {
  background-color: rgba(255, 255, 255, 0.06);
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

.mobile-sort-bar,
.mobile-list {
  display: none;
}

.mobile-list {
  margin-top: 14px;
  gap: 8px;
}

.mobile-card {
  padding: 10px 11px;
  border-radius: 12px;
}

.mobile-card.faction-row-alliance {
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(37, 99, 235, 0.04)),
    rgba(255, 255, 255, 0.08);
}

.mobile-card.faction-row-horde {
  background:
    linear-gradient(135deg, rgba(185, 28, 28, 0.18), rgba(185, 28, 28, 0.04)),
    rgba(255, 255, 255, 0.08);
}

.mobile-card-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.mobile-card-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.mobile-card-identity > div {
  min-width: 0;
}

.mobile-faction-icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
}

.mobile-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  margin-top: 8px;
  gap: 8px;
}

.mobile-card-grid p {
  margin: 0;
  padding: 8px 9px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-card-grid strong {
  font-size: 13px;
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

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.character-fields-section {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.045);
}

.character-fields-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.character-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 12px;
}

.featured-toggle {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.24);
  cursor: pointer;
  white-space: nowrap;
}

.featured-toggle span {
  font-size: 12px;
  font-weight: 700;
}

.form-inline-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dialog-block {
  padding: 14px;
}

.dialog-block-title {
  font-size: 16px;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: #38bdf8;
}

.mythic-run-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(120px, 0.7fr) 92px;
  gap: 10px;
  align-items: end;
}

.compact-mythic-list {
  gap: 8px;
}

.compact-row {
  grid-template-columns: minmax(0, 1fr) 118px 126px;
  gap: 8px;
  align-items: center;
}

.mythic-season-board {
  position: relative;
  margin-top: 12px;
  padding: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 207, 89, 0.2);
  background:
    linear-gradient(135deg, rgba(7, 8, 16, 0.9), rgba(39, 28, 43, 0.78)),
    radial-gradient(circle at 20% 18%, rgba(255, 206, 78, 0.2), transparent 26%),
    radial-gradient(circle at 84% 34%, rgba(48, 145, 255, 0.14), transparent 28%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 14px 26px rgba(0, 0, 0, 0.24);
}

.mythic-season-top {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}

.mythic-season-top > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mythic-season-kicker {
  color: #ffe16f;
  font-size: 13px;
  font-weight: 700;
}

.mythic-season-top strong {
  color: #ff9f1c;
  font-size: 34px;
  line-height: 1;
  letter-spacing: 0;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.48);
}

.mythic-current-key {
  min-width: 180px;
  padding: 9px 11px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 207, 89, 0.14);
}

.mythic-current-key span,
.dungeon-tile-fields span {
  display: block;
  margin-bottom: 3px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.62);
}

.mythic-current-key b {
  display: block;
  color: #fff5c8;
  font-size: 13px;
}

.mythic-dungeon-grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.editable-dungeon-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.popover-dungeon-grid {
  grid-template-columns: repeat(8, minmax(0, 1fr));
}

.mythic-dungeon-tile {
  min-width: 0;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(255, 207, 89, 0.22);
  background:
    linear-gradient(180deg, rgba(143, 64, 21, 0.72), rgba(38, 14, 21, 0.94)),
    radial-gradient(circle at 50% 4%, rgba(255, 207, 89, 0.32), transparent 34%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.mythic-dungeon-tile.empty {
  border-color: rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(180deg, rgba(47, 56, 72, 0.74), rgba(17, 21, 32, 0.92)),
    radial-gradient(circle at 50% 4%, rgba(255, 255, 255, 0.14), transparent 34%);
}

.dungeon-tile-art {
  min-height: 48px;
  display: flex;
  align-items: end;
  justify-content: center;
  padding: 7px 5px;
  background:
    linear-gradient(180deg, rgba(9, 18, 31, 0.12), rgba(0, 0, 0, 0.44)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0 1px, transparent 1px 10px);
}

.dungeon-tile-art span {
  width: 100%;
  min-height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffd45f;
  font-size: 13px;
  font-weight: 800;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.62);
}

.dungeon-tile-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 5px 3px 7px;
}

.dungeon-tile-score strong {
  color: #ff9f1c;
  font-size: 19px;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.58);
}

.dungeon-tile-score span {
  color: #ffd76e;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.05;
}

.dungeon-tile-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 7px;
  background: rgba(0, 0, 0, 0.26);
}

.tile-input {
  width: 100%;
  height: 32px;
  padding: 0 5px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 7px;
  color: #ffffff;
  background: rgba(6, 13, 25, 0.66);
  outline: none;
  text-align: center;
  font-weight: 800;
}

.compact-dungeon-tile .dungeon-tile-art {
  min-height: 44px;
}

.mythic-run-title {
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
}

.mythic-run-score {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.mythic-run-score strong {
  color: #ffd76e;
}

.weekly-vault-card {
  padding: 12px;
}

.vault-detail-list {
  margin-top: 10px;
}

.weekly-vault-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 10px;
}

.score-field {
  gap: 6px;
}

.compact-input {
  min-height: 36px;
  padding: 7px 10px;
}

.compact-textarea {
  min-height: 72px;
}

.vault-grand-board {
  position: relative;
  margin-top: 12px;
  padding: 18px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(205, 147, 54, 0.28);
  background:
    linear-gradient(135deg, rgba(12, 11, 13, 0.94), rgba(32, 23, 21, 0.9)),
    radial-gradient(circle at 50% 8%, rgba(221, 157, 58, 0.18), transparent 36%),
    url('/brand/wow-great-vault-icon.png') right 18px top 18px/92px 92px no-repeat;
  box-shadow: inset 0 1px 0 rgba(255, 232, 155, 0.08), 0 16px 28px rgba(0, 0, 0, 0.24);
}

.vault-grand-board::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 210, 112, 0.08), transparent 24%, transparent 76%, rgba(255, 210, 112, 0.06)),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.025) 0 1px, transparent 1px 14px);
  opacity: 0.72;
}

.vault-grand-copy,
.vault-grand-divider,
.vault-reward-row {
  position: relative;
  z-index: 1;
}

.vault-grand-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-right: 88px;
  color: rgba(255, 255, 255, 0.86);
  text-align: center;
}

.vault-grand-copy strong {
  color: #f5e7c5;
  font-size: 17px;
}

.vault-grand-copy span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}

.vault-grand-divider {
  width: min(460px, 72%);
  height: 14px;
  margin: 12px auto 16px;
  border-top: 1px solid rgba(206, 149, 57, 0.54);
}

.vault-grand-divider::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -5px;
  width: 14px;
  height: 14px;
  transform: translateX(-50%) rotate(45deg);
  border-right: 1px solid rgba(206, 149, 57, 0.78);
  border-bottom: 1px solid rgba(206, 149, 57, 0.78);
  background: rgba(22, 15, 12, 0.9);
}

.vault-reward-row {
  display: grid;
  grid-template-columns: minmax(160px, 0.72fr) minmax(0, 1.8fr);
  gap: 16px;
  align-items: stretch;
  padding: 14px 0;
  border-top: 1px solid rgba(206, 149, 57, 0.18);
}

.vault-reward-row:first-of-type {
  border-top: none;
}

.vault-track-scene {
  min-height: 116px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 18px 14px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(206, 149, 57, 0.18);
  background:
    linear-gradient(90deg, rgba(16, 12, 10, 0.52), rgba(16, 12, 10, 0.18)),
    radial-gradient(circle at 72% 42%, rgba(245, 158, 11, 0.3), transparent 36%),
    linear-gradient(135deg, rgba(88, 37, 18, 0.84), rgba(16, 23, 28, 0.88));
}

.vault-track-scene strong {
  color: #d9a43c;
  font-size: 25px;
  line-height: 1;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55);
}

.vault-track-scene span {
  width: max-content;
  padding: 4px 8px;
  border-radius: 999px;
  color: #ffe4a0;
  font-size: 12px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.36);
  border: 1px solid rgba(255, 210, 112, 0.2);
}

.vault-track-mythic {
  background:
    linear-gradient(90deg, rgba(9, 15, 18, 0.58), rgba(9, 15, 18, 0.14)),
    radial-gradient(circle at 72% 40%, rgba(55, 189, 201, 0.28), transparent 38%),
    linear-gradient(135deg, rgba(18, 54, 57, 0.82), rgba(15, 18, 27, 0.9));
}

.vault-track-world {
  background:
    linear-gradient(90deg, rgba(11, 15, 11, 0.56), rgba(11, 15, 11, 0.16)),
    radial-gradient(circle at 74% 42%, rgba(126, 183, 69, 0.26), transparent 40%),
    linear-gradient(135deg, rgba(42, 57, 30, 0.86), rgba(17, 18, 24, 0.9));
}

.vault-reward-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.vault-reward-card {
  position: relative;
  min-height: 116px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px 14px 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  background:
    linear-gradient(180deg, rgba(19, 25, 28, 0.86), rgba(8, 9, 12, 0.92)),
    radial-gradient(circle at 18% 84%, rgba(237, 179, 65, 0.12), transparent 34%);
  box-shadow: inset 0 -4px 0 rgba(214, 151, 48, 0.3);
}

.vault-reward-card::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: var(--vault-progress);
  height: 4px;
  background: #d9a43c;
}

.vault-reward-card.unlocked {
  color: #ffffff;
  border-color: rgba(50, 214, 93, 0.52);
  background:
    linear-gradient(180deg, rgba(48, 50, 43, 0.8), rgba(15, 18, 15, 0.9)),
    radial-gradient(circle at 20% 84%, rgba(255, 211, 96, 0.4), transparent 36%);
  box-shadow: inset 0 -4px 0 #32d65d, 0 0 22px rgba(255, 205, 84, 0.12);
}

.vault-reward-card.unlocked::before {
  background: #32d65d;
}

.vault-state-mark {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #111318;
  font-size: 12px;
  font-weight: 900;
  background: rgba(255, 255, 255, 0.22);
}

.vault-reward-card.unlocked .vault-state-mark {
  color: #07340f;
  background: #32d65d;
  box-shadow: 0 0 16px rgba(50, 214, 93, 0.46);
}

.vault-reward-card strong {
  min-height: 38px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  line-height: 1.35;
}

.vault-reward-card.unlocked strong {
  color: #fff5d2;
}

.vault-reward-value {
  align-self: flex-end;
  color: #d9a43c;
  font-size: 16px;
  font-weight: 900;
}

.vault-reward-card.unlocked .vault-reward-value {
  color: #31f06a;
}

.empty-inline {
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
}

.keybinding-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.keybinding-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.keybinding-row > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.keybinding-row strong {
  font-size: 13px;
}

.keybinding-row span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}

.keybinding-row span.saved {
  color: #86efac;
}

.keybinding-actions {
  flex-direction: row !important;
  flex-shrink: 0;
  gap: 6px !important;
}

.keybinding-empty {
  margin-top: 12px;
}

.keybinding-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keybinding-textarea {
  min-height: 220px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.68);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1400px) {
  .spotlight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .insight-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}

@media (max-width: 960px) {
  .character-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-grid,
  .summary-grid,
  .keybinding-list,
  .weekly-vault-grid {
    grid-template-columns: 1fr;
  }

  .vault-reward-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .mythic-run-row {
    grid-template-columns: 1fr;
  }

  .mythic-season-top,
  .mythic-panel-score {
    flex-direction: column;
    align-items: stretch;
  }

  .editable-dungeon-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .popover-dungeon-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

}

@media (max-width: 720px) {
  .wow-page {
    padding: 8px;
    font-size: 13px;
  }

  .page-nav {
    margin-bottom: 8px;
  }

  .back-home-btn {
    min-height: 34px;
    padding: 0 10px;
    gap: 6px;
    font-size: 12px;
  }

  .back-home-icon {
    width: 22px;
    height: 22px;
    font-size: 13px;
  }

  .hero-panel,
  .filter-panel,
  .toolbar,
  .pager,
  .dialog-block-head,
  .weekly-vault-head {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-panel,
  .filter-panel,
  .list-panel {
    padding: 10px;
    border-radius: 12px;
  }

  .hero-panel,
  .filter-panel {
    margin-bottom: 8px;
  }

  .spotlight-panel,
  .insight-panel {
    display: none;
  }

  .page-title {
    font-size: 20px;
    line-height: 1.18;
  }

  .panel-title {
    font-size: 16px;
    line-height: 1.25;
  }

  .page-subtitle,
  .panel-tip {
    display: none;
  }

  .hero-tags {
    gap: 6px;
  }

  .hero-tag {
    min-height: 24px;
    padding: 0 8px;
    font-size: 11px;
  }

  .hero-tag:first-child,
  .hero-tag:last-child {
    display: none;
  }

  .filter-grid {
    gap: 8px;
  }

  .field,
  .form-field,
  .mini-field {
    gap: 5px;
  }

  .field span,
  .form-field span,
  .mini-field span {
    font-size: 11px;
  }

  .input {
    min-height: 34px;
    padding: 7px 9px;
    border-radius: 9px;
    font-size: 13px;
  }

  .textarea {
    min-height: 74px;
  }

  .toolbar {
    margin-top: 8px;
    gap: 8px;
  }

  .action-btn,
  .ghost-btn {
    min-height: 34px;
    padding: 0 10px;
    font-size: 12px;
  }

  .mini-btn {
    min-height: 28px;
    padding: 0 9px;
    font-size: 12px;
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
  .pager-right .ghost-btn {
    flex: 1 1 calc(50% - 6px);
  }

  .desktop-table {
    display: none;
  }

  .mobile-sort-bar {
    display: flex;
    margin: 8px -1px 0;
    padding: 0 1px 5px;
    gap: 5px;
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .mobile-sort-btn {
    display: inline-flex;
    flex: 0 0 auto;
    min-height: 29px;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.76);
    font-size: 11px;
    cursor: pointer;
    background: rgba(8, 20, 34, 0.62);
  }

  .mobile-sort-btn.active {
    border-color: rgba(248, 207, 98, 0.62);
    color: #ffe39a;
    background: rgba(108, 73, 17, 0.48);
  }

  .mobile-sort-btn:disabled {
    cursor: wait;
    opacity: 0.62;
  }

  .mobile-list {
    display: grid;
    margin-top: 8px;
    gap: 6px;
  }

  .mobile-card {
    padding: 8px;
    border-radius: 10px;
  }

  .mobile-card-head {
    gap: 6px;
  }

  .mobile-card-identity {
    gap: 7px;
  }

  .mobile-faction-icon {
    width: 27px;
    height: 27px;
  }

  .mobile-card-title {
    font-size: 14px;
    line-height: 1.2;
  }

  .mobile-card-subtitle {
    margin-top: 3px;
    font-size: 11px;
  }

  .mobile-card-actions {
    margin-top: 6px;
    gap: 6px;
  }

  .mobile-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    margin-top: 6px;
    gap: 6px;
  }

  .mobile-card-grid p {
    padding: 6px 7px;
    border-radius: 8px;
    gap: 2px;
  }

  .mobile-card-grid p:first-child {
    display: none;
  }

  .mobile-card-grid span {
    font-size: 10px;
  }

  .mobile-card-grid strong {
    font-size: 12px;
  }

  .form-inline-grid,
  .character-fields-grid,
  .overview-metrics,
  .spotlight-grid {
    grid-template-columns: 1fr;
  }

  .character-fields-section {
    padding: 10px;
  }

  .character-fields-head {
    align-items: stretch;
    flex-direction: column;
  }

  .featured-toggle {
    justify-content: space-between;
  }

  .pager {
    margin-top: 10px;
    gap: 8px;
    font-size: 12px;
  }

  .pager-select {
    height: 30px;
    font-size: 12px;
  }

  .dialog-form {
    gap: 10px;
  }

  .dialog-block {
    padding: 10px;
    border-radius: 12px;
  }

  .dialog-block-title {
    font-size: 14px;
  }

  .dialog-block-tip {
    font-size: 11px;
  }

  .icon-toggle-btn {
    min-height: 36px;
    padding: 4px 8px 4px 5px;
    gap: 8px;
    font-size: 12px;
  }

  .icon-toggle-btn img {
    width: 28px;
    height: 28px;
  }

  .mythic-run-title {
    min-height: 32px;
    padding: 0 8px;
    font-size: 12px;
  }

  .mythic-season-board,
  .score-popover {
    padding: 12px;
  }

  .mythic-season-top strong,
  .mythic-panel-score strong {
    font-size: 28px;
  }

  .dungeon-tile-art {
    min-height: 40px;
  }

  .dungeon-tile-art span {
    font-size: 12px;
  }

  .vault-grand-board {
    padding: 12px;
    background:
      linear-gradient(135deg, rgba(12, 11, 13, 0.94), rgba(32, 23, 21, 0.9)),
      radial-gradient(circle at 50% 8%, rgba(221, 157, 58, 0.18), transparent 36%),
      url('/brand/wow-great-vault-icon.png') right 10px top 10px/58px 58px no-repeat;
  }

  .vault-grand-copy {
    align-items: flex-start;
    padding-right: 54px;
    text-align: left;
  }

  .vault-grand-copy strong {
    font-size: 14px;
  }

  .vault-grand-copy span {
    font-size: 12px;
  }

  .vault-grand-divider {
    width: 100%;
    margin: 10px auto 8px;
  }

  .vault-track-scene {
    min-height: 82px;
    padding: 14px;
  }

  .vault-track-scene strong {
    font-size: 21px;
  }

  .vault-reward-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .vault-reward-card {
    min-height: 88px;
    padding: 12px;
  }

  .vault-reward-card strong {
    min-height: auto;
    font-size: 13px;
  }

  .dungeon-tile-fields {
    gap: 5px;
    padding: 6px;
  }

  .tile-input {
    height: 30px;
    font-size: 12px;
  }

  .keybinding-row {
    align-items: stretch;
    flex-direction: column;
    padding: 8px;
  }

  .keybinding-actions {
    width: 100%;
  }

  .keybinding-actions .mini-btn {
    flex: 1;
  }

  .keybinding-textarea {
    min-height: 180px;
  }
}

@media (max-width: 560px) {
  .hero-panel,
  .spotlight-panel,
  .filter-panel,
  .list-panel,
  .insight-panel {
    padding: 9px;
    border-radius: 12px;
  }

  .page-title {
    font-size: 19px;
  }

  .hero-tags {
    display: none;
  }

  .filter-actions .action-btn,
  .filter-actions .ghost-btn,
  .toolbar-left .action-btn,
  .toolbar-left .ghost-btn,
  .pager-right .ghost-btn {
    flex-basis: 100%;
  }
}
</style>
