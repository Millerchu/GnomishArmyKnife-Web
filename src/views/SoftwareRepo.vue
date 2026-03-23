<template>
  <div class="repo-page">
    <div class="page-nav">
      <button type="button" class="back-home-btn" @click="goBack">
        <span class="back-home-icon">←</span>
        <span>返回桌面</span>
      </button>
    </div>

    <div class="hero-panel">
      <div>
        <h1 class="page-title">软件仓库</h1>
        <p class="page-subtitle">集中整理个人常用软件安装包，支持多版本查看、本地安装包上传、本地文件服务器优先下载，以及桌面端直接下载。</p>
      </div>
      <div class="hero-tags">
        <span class="hero-tag">软件 {{ total }}</span>
        <span class="hero-tag">版本 {{ summary.totalVersions }}</span>
        <span class="hero-tag">{{ isDesktopViewport ? '桌面端可下载' : '移动端仅查看版本信息' }}</span>
      </div>
    </div>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="field">
          <span>关键词</span>
          <input
            v-model.trim="query.keyword"
            class="input"
            maxlength="64"
            placeholder="搜索软件名、厂商、描述、版本"
            @keyup.enter="handleSearch"
          />
        </label>

        <label class="field">
          <span>分类</span>
          <select v-model="query.categoryName" class="input">
            <option value="">全部分类</option>
            <option v-for="item in categoryOptions" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label class="field">
          <span>平台</span>
          <select v-model="query.platformCode" class="input">
            <option value="">全部平台</option>
            <option v-for="item in platformOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <div class="filter-actions">
        <button class="action-btn" :disabled="loading" @click="handleSearch">查询</button>
        <button class="ghost-btn" :disabled="loading" @click="resetQuery">重置</button>
      </div>
    </section>

    <div class="repo-layout">
      <section class="list-panel">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">软件列表</h2>
            <p class="panel-tip">每个软件可维护多个安装包版本，推荐版本默认置顶，桌面端可直接下载。</p>
          </div>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="action-btn" :disabled="loading || submitting" @click="openCreateSoftwareDialog">新增软件</button>
            <button class="ghost-btn" :disabled="loading || submitting" @click="loadPackages">刷新列表</button>
          </div>
          <div class="toolbar-right">
            <span>共 {{ total }} 条</span>
            <span v-if="usingLocalData" class="mock-tip">当前为演示数据（后端未联通）</span>
          </div>
        </div>

        <div v-if="loading && !pagedPackages.length" class="empty-state">加载中...</div>
        <div v-else-if="!pagedPackages.length" class="empty-state">当前条件下暂无软件记录</div>

        <div v-else class="software-list">
          <article v-for="item in pagedPackages" :key="item.id" class="software-card">
            <div class="software-head">
              <div class="software-main">
                <div class="software-icon" :style="buildSoftwareIconStyle(item)">
                  <span>{{ buildSoftwareIconText(item.softwareName) }}</span>
                </div>

                <div class="software-meta">
                  <div class="title-row">
                    <h3 class="software-title">{{ item.softwareName }}</h3>
                    <span class="category-chip">{{ item.categoryName }}</span>
                    <span class="platform-chip">{{ formatPlatformText(item.platformCode) }}</span>
                  </div>
                  <p class="software-desc">{{ item.description || '暂无描述' }}</p>
                  <div class="software-submeta">
                    <span>厂商 {{ item.vendorName || '-' }}</span>
                    <span>官网 {{ item.officialSite || '-' }}</span>
                    <span>版本 {{ item.versions.length }}</span>
                  </div>
                </div>
              </div>

              <div class="software-actions">
                <button class="mini-btn" @click="toggleExpand(item.id)">
                  {{ expandedPackageIds.includes(item.id) ? '收起版本' : '查看版本' }}
                </button>
                <button class="mini-btn" @click="openCreateVersionDialog(item)">新增版本</button>
                <button class="mini-btn" @click="openEditSoftwareDialog(item)">编辑软件</button>
                <button class="mini-btn danger" @click="removeSoftware(item)">删除软件</button>
              </div>
            </div>

            <div v-if="expandedPackageIds.includes(item.id)" class="version-section">
              <div v-if="item.versions.length" class="table-wrap desktop-table">
                <table class="version-table">
                  <thead>
                  <tr>
                    <th>版本</th>
                    <th>通道</th>
                    <th>包类型</th>
                    <th>大小</th>
                    <th>发布日期</th>
                    <th>系统要求</th>
                    <th>下载源</th>
                    <th>操作</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-for="version in item.versions" :key="version.id">
                    <td>
                      <div class="version-name-wrap">
                        <strong>{{ version.versionName }}</strong>
                        <span v-if="version.isRecommended" class="recommended-chip">推荐</span>
                      </div>
                    </td>
                    <td>{{ formatChannelText(version.releaseChannel) }}</td>
                    <td>{{ version.packageType || '-' }}</td>
                    <td>{{ version.packageSize || '-' }}</td>
                    <td>{{ version.releaseDate || '-' }}</td>
                    <td>{{ version.systemRequirement || '-' }}</td>
                    <td>{{ formatVersionAvailability(version) }}</td>
                    <td>
                      <div class="row-actions">
                        <button v-if="isDesktopViewport" class="mini-btn" @click="downloadVersion(version)">下载</button>
                        <button class="mini-btn" @click="openEditVersionDialog(item, version)">编辑</button>
                        <button class="mini-btn danger" @click="removeVersion(item, version)">删除</button>
                      </div>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <div class="mobile-version-list">
                <article v-for="version in item.versions" :key="version.id" class="mobile-version-card">
                  <div class="mobile-version-head">
                    <div>
                      <strong>{{ version.versionName }}</strong>
                      <p>{{ formatChannelText(version.releaseChannel) }} · {{ version.packageType || '-' }}</p>
                    </div>
                    <span v-if="version.isRecommended" class="recommended-chip">推荐</span>
                  </div>

                  <div class="mobile-version-grid">
                    <p><span>大小</span><strong>{{ version.packageSize || '-' }}</strong></p>
                    <p><span>发布日期</span><strong>{{ version.releaseDate || '-' }}</strong></p>
                    <p><span>系统要求</span><strong>{{ version.systemRequirement || '-' }}</strong></p>
                    <p><span>下载源</span><strong>{{ formatVersionAvailability(version) }}</strong></p>
                  </div>

                  <div class="mobile-card-actions">
                    <button class="mini-btn" @click="openEditVersionDialog(item, version)">编辑</button>
                    <button class="mini-btn danger" @click="removeVersion(item, version)">删除</button>
                  </div>
                </article>
              </div>
            </div>
          </article>
        </div>

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
            <h2 class="panel-title">仓库概览</h2>
            <p class="panel-tip">快速查看软件总量、分类分布和最近更新的版本记录。</p>
          </div>
        </div>

          <div class="summary-grid">
            <article class="summary-card">
              <span>软件总数</span>
            <strong>{{ summary.totalPackages }}</strong>
          </article>
          <article class="summary-card">
            <span>版本总数</span>
            <strong>{{ summary.totalVersions }}</strong>
          </article>
          <article class="summary-card">
            <span>推荐版本</span>
            <strong>{{ summary.recommendedVersions }}</strong>
          </article>
            <article class="summary-card">
              <span>桌面下载</span>
              <strong>{{ isDesktopViewport ? '已开启' : '未提供' }}</strong>
            </article>
          </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">分类分布</h3>
            <span>{{ categoryStats.length }} 类</span>
          </div>
          <div v-if="categoryStats.length" class="distribution-list">
            <div v-for="item in displayCategoryStats" :key="item.categoryName" class="distribution-row">
              <div>
                <strong>{{ item.categoryName }}</strong>
                <span>{{ item.packageCount }} 个软件</span>
              </div>
              <b>{{ item.versionCount }} 版</b>
            </div>
          </div>
          <div v-else class="subtle-empty">暂无分类分布数据</div>
        </div>

        <div class="insight-block">
          <div class="insight-head">
            <h3 class="insight-title">最近更新</h3>
            <span>{{ displayRecentVersions.length }} 条</span>
          </div>
          <div v-if="recentVersions.length" class="recent-list">
            <article v-for="item in displayRecentVersions" :key="item.id" class="recent-item">
              <strong>{{ item.softwareName }} · {{ item.versionName }}</strong>
              <span>{{ item.releaseDate || '-' }}</span>
            </article>
          </div>
          <div v-else class="subtle-empty">暂无最近更新记录</div>
        </div>
      </aside>
    </div>

    <div v-if="showSoftwareDialog" class="dialog-mask" @click.self="closeSoftwareDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ softwareDialogMode === 'create' ? '新增软件' : '编辑软件' }}</h3>
        <form class="dialog-form" @submit.prevent="submitSoftwareDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>软件名</span>
              <input v-model.trim="softwareForm.softwareName" class="input" maxlength="48" required />
            </label>
            <label class="form-field">
              <span>厂商</span>
              <input v-model.trim="softwareForm.vendorName" class="input" maxlength="48" />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>分类</span>
              <input v-model.trim="softwareForm.categoryName" class="input" maxlength="32" placeholder="例如：开发 / 系统工具" required />
            </label>
            <label class="form-field">
              <span>平台</span>
              <select v-model="softwareForm.platformCode" class="input" required>
                <option v-for="item in platformOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <label class="form-field">
            <span>官网地址</span>
            <input v-model.trim="softwareForm.officialSite" class="input" maxlength="255" placeholder="例如：https://code.visualstudio.com/" />
          </label>

          <label class="form-field">
            <span>描述</span>
            <textarea v-model.trim="softwareForm.description" class="input textarea" rows="3" maxlength="200" placeholder="记录适用场景、用途等" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeSoftwareDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (softwareDialogMode === 'create' ? '保存软件' : '更新软件') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showVersionDialog" class="dialog-mask" @click.self="closeVersionDialog">
      <div class="dialog">
        <h3 class="dialog-title">{{ versionDialogMode === 'create' ? '新增版本' : '编辑版本' }}</h3>
        <form class="dialog-form" @submit.prevent="submitVersionDialog">
          <div class="form-inline-grid">
            <label class="form-field">
              <span>版本号</span>
              <input v-model.trim="versionForm.versionName" class="input" maxlength="32" required />
            </label>
            <label class="form-field">
              <span>发布通道</span>
              <select v-model="versionForm.releaseChannel" class="input" required>
                <option v-for="item in channelOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>包类型</span>
              <input v-model.trim="versionForm.packageType" class="input" maxlength="16" placeholder="例如：EXE / ZIP / DMG" />
            </label>
            <label class="form-field">
              <span>包大小</span>
              <input v-model.trim="versionForm.packageSize" class="input" maxlength="16" placeholder="例如：96 MB" />
            </label>
          </div>

          <div class="form-inline-grid">
            <label class="form-field">
              <span>发布日期</span>
              <input v-model="versionForm.releaseDate" class="input" type="date" />
            </label>
            <label class="form-field">
              <span>系统要求</span>
              <input v-model.trim="versionForm.systemRequirement" class="input" maxlength="48" placeholder="例如：Windows 10+" />
            </label>
          </div>

          <label class="form-field">
            <span>本地安装包</span>
            <div class="upload-row">
              <input
                :value="versionForm.localFileName"
                class="input upload-display"
                placeholder="未上传本地安装包"
                readonly
              />
              <button type="button" class="ghost-btn upload-btn" :disabled="submitting" @click="openUploadPicker">选择文件</button>
              <button
                v-if="versionForm.localFileName"
                type="button"
                class="mini-btn"
                :disabled="submitting"
                @click="clearUploadedFile"
              >
                清除
              </button>
            </div>
            <input ref="uploadInputRef" class="hidden-input" type="file" @change="handleFileSelected" />
            <small class="field-tip">上传后将优先使用本地文件服务器地址下载；后端未联通时仅临时记录文件名和当前会话下载链接。</small>
          </label>

          <label class="form-field">
            <span>外部下载地址</span>
            <input v-model.trim="versionForm.downloadUrl" class="input" maxlength="255" placeholder="本地文件不可用时的备用下载地址，可留空" />
          </label>

          <label class="form-field checkbox-field">
            <input v-model="versionForm.isRecommended" type="checkbox" />
            <span>设为推荐版本</span>
          </label>

          <label class="form-field">
            <span>更新说明</span>
            <textarea v-model.trim="versionForm.changelog" class="input textarea" rows="3" maxlength="240" placeholder="记录该版本的主要更新" />
          </label>

          <div class="dialog-actions">
            <button type="button" class="ghost-btn" :disabled="submitting" @click="closeVersionDialog">取消</button>
            <button type="submit" class="action-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : (versionDialogMode === 'create' ? '保存版本' : '更新版本') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useRouter} from 'vue-router'
import {
  createSoftwarePackage,
  createSoftwareVersion,
  deleteSoftwarePackage,
  deleteSoftwareVersion,
  getSoftwareRepoSummary,
  listSoftwarePackages,
  uploadSoftwarePackageFile,
  updateSoftwarePackage,
  updateSoftwareVersion
} from '@/api/softwareRepo'

// 软件仓库默认走本地数据，便于先验证上传、版本管理和本地下载优先策略。
const LOCAL_SOFTWARE_KEY = 'software_repo_packages'
const PAGE_SIZE_OPTIONS = [6, 10, 16]
const PLATFORM_OPTIONS = [
  {value: 'WINDOWS', label: 'Windows'},
  {value: 'MAC', label: 'macOS'},
  {value: 'LINUX', label: 'Linux'},
  {value: 'CROSS', label: '跨平台'}
]
const CHANNEL_OPTIONS = [
  {value: 'STABLE', label: '稳定版'},
  {value: 'BETA', label: '测试版'},
  {value: 'LEGACY', label: '历史版'}
]
const DEFAULT_PACKAGES = [
  {
    id: 'software-1',
    softwareName: 'Visual Studio Code',
    vendorName: 'Microsoft',
    categoryName: '开发工具',
    platformCode: 'CROSS',
    officialSite: 'https://code.visualstudio.com/',
    description: '轻量代码编辑器，适合日常前端、脚本和 Markdown 编辑。',
    versions: [
      {id: 'version-1', versionName: '1.99.1', releaseChannel: 'STABLE', packageType: 'User EXE', packageSize: '103 MB', releaseDate: '2026-03-10', systemRequirement: 'Windows 10+', localFileName: 'VSCodeUserSetup-x64-1.99.1.exe', localFileUrl: 'http://127.0.0.1:9000/software/vscode/1.99.1/VSCodeUserSetup-x64-1.99.1.exe', downloadUrl: 'https://code.visualstudio.com/', isRecommended: true, changelog: '例行更新与插件兼容修复'},
      {id: 'version-2', versionName: '1.97.3', releaseChannel: 'LEGACY', packageType: 'ZIP', packageSize: '96 MB', releaseDate: '2026-01-18', systemRequirement: 'Windows 10+', downloadUrl: 'https://code.visualstudio.com/', isRecommended: false, changelog: '保留旧版兼容场景'}
    ]
  },
  {
    id: 'software-2',
    softwareName: 'Docker Desktop',
    vendorName: 'Docker',
    categoryName: '容器工具',
    platformCode: 'WINDOWS',
    officialSite: 'https://www.docker.com/products/docker-desktop/',
    description: '本地容器开发环境，日常调试服务、数据库和依赖组件使用。',
    versions: [
      {id: 'version-3', versionName: '4.41.0', releaseChannel: 'STABLE', packageType: 'Installer EXE', packageSize: '620 MB', releaseDate: '2026-03-08', systemRequirement: 'Windows 11 / WSL2', localFileName: 'Docker Desktop Installer 4.41.0.exe', localFileUrl: 'http://127.0.0.1:9000/software/docker/4.41.0/Docker%20Desktop%20Installer.exe', downloadUrl: 'https://www.docker.com/products/docker-desktop/', isRecommended: true, changelog: '性能优化与安全修复'},
      {id: 'version-4', versionName: '4.36.2', releaseChannel: 'LEGACY', packageType: 'Installer EXE', packageSize: '601 MB', releaseDate: '2025-12-22', systemRequirement: 'Windows 10 / WSL2', downloadUrl: 'https://www.docker.com/products/docker-desktop/', isRecommended: false, changelog: '保留兼容旧项目环境'}
    ]
  },
  {
    id: 'software-3',
    softwareName: '7-Zip',
    vendorName: 'Igor Pavlov',
    categoryName: '系统工具',
    platformCode: 'WINDOWS',
    officialSite: 'https://www.7-zip.org/',
    description: '轻量压缩解压工具，适合作为基础装机包。',
    versions: [
      {id: 'version-5', versionName: '24.09', releaseChannel: 'STABLE', packageType: 'x64 MSI', packageSize: '1.6 MB', releaseDate: '2026-02-12', systemRequirement: 'Windows 7+', localFileName: '7z2409-x64.msi', localFileUrl: 'http://127.0.0.1:9000/software/7zip/24.09/7z2409-x64.msi', downloadUrl: 'https://www.7-zip.org/', isRecommended: true, changelog: '安全更新'},
      {id: 'version-6', versionName: '23.01', releaseChannel: 'LEGACY', packageType: 'x64 MSI', packageSize: '1.5 MB', releaseDate: '2025-05-18', systemRequirement: 'Windows 7+', downloadUrl: 'https://www.7-zip.org/', isRecommended: false, changelog: '旧版兼容保留'}
    ]
  },
  {
    id: 'software-4',
    softwareName: 'Navicat Premium',
    vendorName: 'PremiumSoft',
    categoryName: '数据库工具',
    platformCode: 'WINDOWS',
    officialSite: 'https://www.navicat.com.cn/',
    description: '集中管理 MySQL、PostgreSQL 和其他数据库连接。',
    versions: [
      {id: 'version-7', versionName: '17.2.1', releaseChannel: 'STABLE', packageType: 'EXE', packageSize: '214 MB', releaseDate: '2026-03-01', systemRequirement: 'Windows 10+', downloadUrl: '', isRecommended: true, changelog: '当前只做版本记录，下载地址后续补充'}
    ]
  }
]

// 兼容统一响应包装与直接返回数据的两种接口形态。
function unwrapData(res) {
  const payload = res?.data
  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

// 版本信息单独归一，便于软件主档和版本明细分别维护。
function buildVersionEntry(item = {}) {
  return {
    id: item.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    versionName: item.versionName || '',
    releaseChannel: item.releaseChannel || 'STABLE',
    packageType: item.packageType || '',
    packageSize: item.packageSize || '',
    releaseDate: item.releaseDate || '',
    systemRequirement: item.systemRequirement || '',
    localFileName: item.localFileName || '',
    localFileUrl: item.localFileUrl || item.localDownloadUrl || '',
    downloadUrl: item.downloadUrl || '',
    isRecommended: Boolean(item.isRecommended),
    changelog: item.changelog || ''
  }
}

// 软件主档字段统一后，列表、概览和版本弹窗都走这一份结构。
function normalizePackage(item = {}) {
  return {
    id: item.id ?? item.packageId ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    softwareName: item.softwareName || item.name || '',
    vendorName: item.vendorName || item.vendor || '',
    categoryName: item.categoryName || item.category || '',
    platformCode: item.platformCode || item.platform || 'WINDOWS',
    officialSite: item.officialSite || '',
    description: item.description || item.remark || '',
    versions: Array.isArray(item.versions) ? item.versions.map((version) => buildVersionEntry(version)) : []
  }
}

function loadLocalPackages() {
  try {
    const raw = localStorage.getItem(LOCAL_SOFTWARE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_SOFTWARE_KEY, JSON.stringify(DEFAULT_PACKAGES))
      return DEFAULT_PACKAGES.map((item) => normalizePackage(item))
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return DEFAULT_PACKAGES.map((item) => normalizePackage(item))
    }
    return parsed.map((item) => {
      const nextItem = normalizePackage(item)
      nextItem.versions = nextItem.versions.map((version) => ({
        ...version,
        localFileUrl: `${version.localFileUrl || ''}`.startsWith('blob:') ? '' : version.localFileUrl
      }))
      return nextItem
    })
  } catch (error) {
    return DEFAULT_PACKAGES.map((item) => normalizePackage(item))
  }
}

function persistLocalPackages(list) {
  localStorage.setItem(LOCAL_SOFTWARE_KEY, JSON.stringify(list))
}

// 版本先按推荐标记，再按发布日期排序，保证用户优先看到可下载安装的主版本。
function sortVersions(list = []) {
  return [...list].sort((prev, next) => Number(next.isRecommended) - Number(prev.isRecommended) || `${next.releaseDate}-${next.versionName}`.localeCompare(`${prev.releaseDate}-${prev.versionName}`))
}

function sortPackages(list = []) {
  return [...list].sort((prev, next) => `${prev.softwareName}`.localeCompare(`${next.softwareName}`))
}

// 概览区展示的软件数、版本数、推荐版本和最近更新都在这里汇总。
function buildSummary(packages = []) {
  const versionList = packages.flatMap((item) => item.versions.map((version) => ({
    ...version,
    softwareName: item.softwareName
  })))
  const categoryMap = packages.reduce((result, item) => {
    const current = result[item.categoryName] || {
      categoryName: item.categoryName,
      packageCount: 0,
      versionCount: 0
    }
    current.packageCount += 1
    current.versionCount += item.versions.length
    result[item.categoryName] = current
    return result
  }, {})

  return {
    totalPackages: packages.length,
    totalVersions: versionList.length,
    recommendedVersions: versionList.filter((item) => item.isRecommended).length,
    categoryStats: Object.values(categoryMap).sort((prev, next) => next.versionCount - prev.versionCount),
    recentVersions: versionList
      .sort((prev, next) => `${next.releaseDate}-${next.versionName}`.localeCompare(`${prev.releaseDate}-${prev.versionName}`))
      .slice(0, 5)
  }
}

export default {
  name: 'SoftwareRepo',
  setup() {
    const router = useRouter()

    // 页面状态包含仓库列表、概览统计、软件弹窗、版本弹窗和上传临时文件引用。
    const loading = ref(false)
    const submitting = ref(false)
    const usingLocalData = ref(false)
    const total = ref(0)
    const allPackages = ref([])
    const pagedPackages = ref([])
    const expandedPackageIds = ref([])
    const categoryStats = ref([])
    const recentVersions = ref([])
    const isDesktopViewport = ref(window.innerWidth > 900)
    const showSoftwareDialog = ref(false)
    const showVersionDialog = ref(false)
    const uploadInputRef = ref(null)
    const softwareDialogMode = ref('create')
    const versionDialogMode = ref('create')
    const editingSoftwareId = ref('')
    const editingVersionId = ref('')
    const activeVersionPackageId = ref('')
    const tempUploadUrls = []

    const query = reactive({
      keyword: '',
      categoryName: '',
      platformCode: '',
      pageNo: 1,
      pageSize: PAGE_SIZE_OPTIONS[0]
    })

    const summary = reactive({
      totalPackages: 0,
      totalVersions: 0,
      recommendedVersions: 0
    })

    const softwareForm = reactive({
      softwareName: '',
      vendorName: '',
      categoryName: '',
      platformCode: 'WINDOWS',
      officialSite: '',
      description: ''
    })

    const versionForm = reactive({
      versionName: '',
      releaseChannel: 'STABLE',
      packageType: '',
      packageSize: '',
      releaseDate: '',
      systemRequirement: '',
      localFileName: '',
      localFileUrl: '',
      downloadUrl: '',
      isRecommended: false,
      changelog: ''
    })

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
    const pageSizeOptions = PAGE_SIZE_OPTIONS
    const platformOptions = PLATFORM_OPTIONS
    const channelOptions = CHANNEL_OPTIONS
    const categoryOptions = computed(() => Array.from(new Set(allPackages.value.map((item) => item.categoryName).filter(Boolean))))
    const displayCategoryStats = computed(() => isDesktopViewport.value ? categoryStats.value : categoryStats.value.slice(0, 4))
    const displayRecentVersions = computed(() => isDesktopViewport.value ? recentVersions.value : recentVersions.value.slice(0, 3))

    const syncViewport = () => {
      isDesktopViewport.value = window.innerWidth > 900
    }

    const applySummary = (packages) => {
      const nextSummary = buildSummary(packages)
      summary.totalPackages = nextSummary.totalPackages
      summary.totalVersions = nextSummary.totalVersions
      summary.recommendedVersions = nextSummary.recommendedVersions
      categoryStats.value = nextSummary.categoryStats
      recentVersions.value = nextSummary.recentVersions
    }

    const matchesFilters = (item) => {
      if (query.categoryName && item.categoryName !== query.categoryName) {
        return false
      }
      if (query.platformCode && item.platformCode !== query.platformCode) {
        return false
      }
      const keyword = query.keyword.trim().toLowerCase()
      if (!keyword) {
        return true
      }
      const versionText = item.versions.map((version) => version.versionName).join(' ')
      const text = [
        item.softwareName,
        item.vendorName,
        item.categoryName,
        item.description,
        versionText
      ].filter(Boolean).join(' ').toLowerCase()
      return text.includes(keyword)
    }

    const applyLocalFilterAndPaging = () => {
      const filtered = sortPackages(allPackages.value.filter((item) => matchesFilters(item)))
      total.value = filtered.length
      const safePageNo = Math.min(query.pageNo, Math.max(1, Math.ceil(filtered.length / query.pageSize) || 1))
      query.pageNo = safePageNo
      const startIndex = (safePageNo - 1) * query.pageSize
      pagedPackages.value = filtered.slice(startIndex, startIndex + query.pageSize)
      applySummary(filtered)
    }

    const syncLocalPackages = (records) => {
      const nextRecords = sortPackages(records.map((item) => ({
        ...normalizePackage(item),
        versions: sortVersions(normalizePackage(item).versions)
      })))
      allPackages.value = nextRecords
      persistLocalPackages(nextRecords)
      applyLocalFilterAndPaging()
    }

    const loadPackages = async () => {
      loading.value = true
      try {
        const listRes = await listSoftwarePackages({
          pageNo: query.pageNo,
          pageSize: query.pageSize,
          keyword: query.keyword || undefined,
          categoryName: query.categoryName || undefined,
          platformCode: query.platformCode || undefined
        })
        const payload = unwrapData(listRes) || {}
        const rawList = Array.isArray(payload)
          ? payload
          : (payload.list || payload.records || payload.rows || [])
        const normalized = sortPackages(rawList.map((item) => {
          const nextPackage = normalizePackage(item)
          nextPackage.versions = sortVersions(nextPackage.versions)
          return nextPackage
        }))
        allPackages.value = normalized
        pagedPackages.value = normalized
        total.value = Number(payload.total ?? payload.count ?? normalized.length)
        usingLocalData.value = false

        try {
          const summaryRes = await getSoftwareRepoSummary({
            keyword: query.keyword || undefined,
            categoryName: query.categoryName || undefined,
            platformCode: query.platformCode || undefined
          })
          const summaryPayload = unwrapData(summaryRes) || {}
          summary.totalPackages = Number(summaryPayload.totalPackages ?? normalized.length)
          summary.totalVersions = Number(summaryPayload.totalVersions ?? 0)
          summary.recommendedVersions = Number(summaryPayload.recommendedVersions ?? 0)
          categoryStats.value = Array.isArray(summaryPayload.categoryStats) ? summaryPayload.categoryStats : buildSummary(normalized).categoryStats
          recentVersions.value = Array.isArray(summaryPayload.recentVersions) ? summaryPayload.recentVersions : buildSummary(normalized).recentVersions
        } catch (error) {
          applySummary(normalized)
        }
      } catch (error) {
        allPackages.value = sortPackages(loadLocalPackages())
        usingLocalData.value = true
        applyLocalFilterAndPaging()
      } finally {
        loading.value = false
      }
    }

    const toggleExpand = (packageId) => {
      expandedPackageIds.value = expandedPackageIds.value.includes(packageId)
        ? expandedPackageIds.value.filter((item) => item !== packageId)
        : [...expandedPackageIds.value, packageId]
    }

    const resetSoftwareForm = () => {
      softwareForm.softwareName = ''
      softwareForm.vendorName = ''
      softwareForm.categoryName = ''
      softwareForm.platformCode = 'WINDOWS'
      softwareForm.officialSite = ''
      softwareForm.description = ''
    }

    const fillSoftwareForm = (item) => {
      softwareForm.softwareName = item.softwareName || ''
      softwareForm.vendorName = item.vendorName || ''
      softwareForm.categoryName = item.categoryName || ''
      softwareForm.platformCode = item.platformCode || 'WINDOWS'
      softwareForm.officialSite = item.officialSite || ''
      softwareForm.description = item.description || ''
    }

    const resetVersionForm = () => {
      versionForm.versionName = ''
      versionForm.releaseChannel = 'STABLE'
      versionForm.packageType = ''
      versionForm.packageSize = ''
      versionForm.releaseDate = ''
      versionForm.systemRequirement = ''
      versionForm.localFileName = ''
      versionForm.localFileUrl = ''
      versionForm.downloadUrl = ''
      versionForm.isRecommended = false
      versionForm.changelog = ''
    }

    const fillVersionForm = (item) => {
      versionForm.versionName = item.versionName || ''
      versionForm.releaseChannel = item.releaseChannel || 'STABLE'
      versionForm.packageType = item.packageType || ''
      versionForm.packageSize = item.packageSize || ''
      versionForm.releaseDate = item.releaseDate || ''
      versionForm.systemRequirement = item.systemRequirement || ''
      versionForm.localFileName = item.localFileName || ''
      versionForm.localFileUrl = item.localFileUrl || item.localDownloadUrl || ''
      versionForm.downloadUrl = item.downloadUrl || ''
      versionForm.isRecommended = Boolean(item.isRecommended)
      versionForm.changelog = item.changelog || ''
    }

    const openCreateSoftwareDialog = () => {
      softwareDialogMode.value = 'create'
      editingSoftwareId.value = ''
      resetSoftwareForm()
      showSoftwareDialog.value = true
    }

    const openEditSoftwareDialog = (item) => {
      softwareDialogMode.value = 'edit'
      editingSoftwareId.value = item.id
      fillSoftwareForm(item)
      showSoftwareDialog.value = true
    }

    const closeSoftwareDialog = () => {
      if (submitting.value) {
        return
      }
      showSoftwareDialog.value = false
      resetSoftwareForm()
    }

    const openCreateVersionDialog = (item) => {
      versionDialogMode.value = 'create'
      activeVersionPackageId.value = item.id
      editingVersionId.value = ''
      resetVersionForm()
      showVersionDialog.value = true
    }

    const openEditVersionDialog = (item, version) => {
      versionDialogMode.value = 'edit'
      activeVersionPackageId.value = item.id
      editingVersionId.value = version.id
      fillVersionForm(version)
      showVersionDialog.value = true
    }

    const closeVersionDialog = () => {
      if (submitting.value) {
        return
      }
      showVersionDialog.value = false
      resetVersionForm()
    }

    const buildSoftwarePayload = () => ({
      softwareName: softwareForm.softwareName,
      vendorName: softwareForm.vendorName,
      categoryName: softwareForm.categoryName,
      platformCode: softwareForm.platformCode,
      officialSite: softwareForm.officialSite,
      description: softwareForm.description
    })

    const buildVersionPayload = () => ({
      versionName: versionForm.versionName,
      releaseChannel: versionForm.releaseChannel,
      packageType: versionForm.packageType,
      packageSize: versionForm.packageSize,
      releaseDate: versionForm.releaseDate,
      systemRequirement: versionForm.systemRequirement,
      localFileName: versionForm.localFileName,
      localFileUrl: versionForm.localFileUrl,
      downloadUrl: versionForm.downloadUrl,
      isRecommended: versionForm.isRecommended,
      changelog: versionForm.changelog
    })

    const openUploadPicker = () => {
      uploadInputRef.value?.click()
    }

    const clearUploadInput = () => {
      if (uploadInputRef.value) {
        uploadInputRef.value.value = ''
      }
    }

    const clearUploadedFile = () => {
      versionForm.localFileName = ''
      versionForm.localFileUrl = ''
      clearUploadInput()
    }

    const handleFileSelected = async (event) => {
      const file = event.target?.files?.[0]
      if (!file) {
        return
      }

      try {
        const uploadRes = await uploadSoftwarePackageFile(file)
        const payload = unwrapData(uploadRes) || {}
        versionForm.localFileName = payload.fileName || payload.name || file.name
        versionForm.localFileUrl = payload.fileUrl || payload.downloadUrl || ''
        if (!versionForm.localFileUrl) {
          throw new Error('missing file url')
        }
      } catch (error) {
        const objectUrl = URL.createObjectURL(file)
        tempUploadUrls.push(objectUrl)
        versionForm.localFileName = file.name
        versionForm.localFileUrl = objectUrl
      } finally {
        clearUploadInput()
      }
    }

    const submitSoftwareDialog = async () => {
      if (!softwareForm.softwareName) {
        alert('请输入软件名')
        return
      }
      if (!softwareForm.categoryName) {
        alert('请输入分类')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildSoftwarePayload()
      submitting.value = true
      try {
        if (softwareDialogMode.value === 'create') {
          await createSoftwarePackage(payload)
        } else {
          await updateSoftwarePackage(editingSoftwareId.value, payload)
        }
        showSoftwareDialog.value = false
        resetSoftwareForm()
        await loadPackages()
      } catch (error) {
        if (softwareDialogMode.value === 'create') {
          syncLocalPackages([
            normalizePackage({
              ...payload,
              id: `software-${Date.now()}`,
              versions: []
            }),
            ...loadLocalPackages()
          ])
        } else {
          syncLocalPackages(loadLocalPackages().map((item) => (
            item.id === editingSoftwareId.value
              ? normalizePackage({
                ...item,
                ...payload,
                versions: item.versions
              })
              : item
          )))
        }
        usingLocalData.value = true
        showSoftwareDialog.value = false
        resetSoftwareForm()
      } finally {
        submitting.value = false
      }
    }

    const submitVersionDialog = async () => {
      if (!versionForm.versionName) {
        alert('请输入版本号')
        return
      }
      if (submitting.value) {
        return
      }

      const payload = buildVersionPayload()
      submitting.value = true
      try {
        if (versionDialogMode.value === 'create') {
          await createSoftwareVersion(activeVersionPackageId.value, payload)
        } else {
          await updateSoftwareVersion(editingVersionId.value, payload)
        }
        showVersionDialog.value = false
        resetVersionForm()
        await loadPackages()
      } catch (error) {
        const localPackages = loadLocalPackages()
        const nextPackages = localPackages.map((item) => {
          if (item.id !== activeVersionPackageId.value) {
            return item
          }
          const nextVersions = item.versions.map((version) => buildVersionEntry(version))
          const normalizedPayload = buildVersionEntry({
            ...payload,
            id: versionDialogMode.value === 'create' ? `version-${Date.now()}` : editingVersionId.value
          })
          if (normalizedPayload.isRecommended) {
            nextVersions.forEach((version) => {
              version.isRecommended = false
            })
          }
          if (versionDialogMode.value === 'create') {
            nextVersions.push(normalizedPayload)
          } else {
            const versionIndex = nextVersions.findIndex((version) => version.id === editingVersionId.value)
            if (versionIndex >= 0) {
              nextVersions.splice(versionIndex, 1, normalizedPayload)
            }
          }
          return {
            ...item,
            versions: sortVersions(nextVersions)
          }
        })
        syncLocalPackages(nextPackages)
        usingLocalData.value = true
        showVersionDialog.value = false
        resetVersionForm()
      } finally {
        submitting.value = false
      }
    }

    const removeSoftware = async (item) => {
      if (!window.confirm(`确认删除软件【${item.softwareName}】吗？`)) {
        return
      }
      try {
        await deleteSoftwarePackage(item.id)
        await loadPackages()
      } catch (error) {
        syncLocalPackages(loadLocalPackages().filter((record) => record.id !== item.id))
        usingLocalData.value = true
      }
    }

    const removeVersion = async (item, version) => {
      if (!window.confirm(`确认删除版本【${item.softwareName} / ${version.versionName}】吗？`)) {
        return
      }
      try {
        await deleteSoftwareVersion(version.id)
        await loadPackages()
      } catch (error) {
        const nextPackages = loadLocalPackages().map((record) => (
          record.id === item.id
            ? {
              ...record,
              versions: record.versions.filter((currentVersion) => currentVersion.id !== version.id)
            }
            : record
        ))
        syncLocalPackages(nextPackages)
        usingLocalData.value = true
      }
    }

    const downloadVersion = (version) => {
      if (!isDesktopViewport.value) {
        alert('移动端仅提供版本信息查看，请在桌面端下载')
        return
      }
      const resolvedUrl = version.localFileUrl || version.downloadUrl
      if (!resolvedUrl) {
        alert('当前版本暂未配置下载地址')
        return
      }
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    }

    const handleSearch = () => {
      query.pageNo = 1
      loadPackages()
    }

    const resetQuery = () => {
      query.keyword = ''
      query.categoryName = ''
      query.platformCode = ''
      query.pageNo = 1
      query.pageSize = PAGE_SIZE_OPTIONS[0]
      loadPackages()
    }

    const changePage = (offset) => {
      const nextPage = query.pageNo + offset
      if (nextPage < 1 || nextPage > totalPages.value) {
        return
      }
      query.pageNo = nextPage
      loadPackages()
    }

    const handlePageSizeChange = () => {
      query.pageNo = 1
      loadPackages()
    }

    const goBack = () => {
      router.push('/home')
    }

    const formatPlatformText = (value) => platformOptions.find((item) => item.value === value)?.label || value || '-'
    const formatChannelText = (value) => channelOptions.find((item) => item.value === value)?.label || value || '-'
    const formatVersionAvailability = (version) => {
      if (version.localFileUrl) {
        return '本地文件'
      }
      if (version.downloadUrl) {
        return '外部链接'
      }
      return '仅记录'
    }
    const buildSoftwareIconText = (name) => `${name || '软'}`.replace(/\s+/g, '').slice(0, 2).toUpperCase()
    const buildSoftwareIconStyle = (item) => {
      const colorMap = {
        开发工具: ['#2563eb', '#22c55e'],
        容器工具: ['#0ea5e9', '#2563eb'],
        系统工具: ['#f59e0b', '#ea580c'],
        数据库工具: ['#8b5cf6', '#ec4899']
      }
      const palette = colorMap[item.categoryName] || ['#1d4ed8', '#14b8a6']
      return {
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`
      }
    }

    onMounted(() => {
      syncViewport()
      window.addEventListener('resize', syncViewport)
      loadPackages()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', syncViewport)
      tempUploadUrls.forEach((item) => URL.revokeObjectURL(item))
    })

    return {
      loading,
      submitting,
      usingLocalData,
      total,
      pagedPackages,
      expandedPackageIds,
      categoryStats,
      recentVersions,
      displayCategoryStats,
      displayRecentVersions,
      isDesktopViewport,
      query,
      summary,
      softwareForm,
      versionForm,
      showSoftwareDialog,
      showVersionDialog,
      uploadInputRef,
      softwareDialogMode,
      versionDialogMode,
      pageSizeOptions,
      platformOptions,
      channelOptions,
      categoryOptions,
      totalPages,
      toggleExpand,
      openCreateSoftwareDialog,
      openEditSoftwareDialog,
      closeSoftwareDialog,
      submitSoftwareDialog,
      openCreateVersionDialog,
      openEditVersionDialog,
      closeVersionDialog,
      submitVersionDialog,
      openUploadPicker,
      handleFileSelected,
      clearUploadedFile,
      removeSoftware,
      removeVersion,
      downloadVersion,
      handleSearch,
      resetQuery,
      changePage,
      handlePageSizeChange,
      loadPackages,
      goBack,
      formatPlatformText,
      formatChannelText,
      formatVersionAvailability,
      buildSoftwareIconText,
      buildSoftwareIconStyle
    }
  }
}
</script>

<style scoped>
.repo-page {
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
.filter-panel {
  margin-bottom: 14px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.recent-item,
.dialog-actions,
.mobile-card-actions,
.software-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-panel,
.toolbar,
.panel-head,
.pager,
.insight-head,
.distribution-row,
.software-head {
  justify-content: space-between;
}

.page-title,
.panel-title,
.dialog-title,
.insight-title,
.software-title,
.mobile-card-title {
  margin: 0;
}

.page-title {
  font-size: 28px;
}

.page-subtitle,
.panel-tip,
.mobile-card-subtitle,
.software-desc,
.software-submeta,
.subtle-empty,
.field-tip {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.74);
}

.hero-tags,
.toolbar-left,
.toolbar-right,
.row-actions,
.mobile-card-actions,
.software-actions,
.software-submeta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag,
.category-chip,
.platform-chip,
.recommended-chip {
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

.mock-tip {
  padding: 4px 8px;
  border-radius: 8px;
  color: #ffecb3;
  background: rgba(255, 184, 0, 0.2);
}

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.filter-grid,
.summary-grid,
.form-inline-grid,
.mobile-version-grid {
  display: grid;
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

.field span,
.form-field span,
.mobile-version-grid span,
.summary-card span,
.distribution-row span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
}

.filter-actions {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.field-tip {
  font-size: 12px;
  line-height: 1.45;
}

.repo-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.92fr);
  gap: 14px;
}

.summary-grid {
  margin-top: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.summary-card,
.distribution-row,
.recent-item,
.software-card,
.mobile-version-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}

.summary-card,
.software-card,
.mobile-version-card {
  padding: 14px;
}

.summary-card strong {
  font-size: 22px;
  line-height: 1.2;
}

.software-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.software-main {
  display: flex;
  gap: 14px;
  min-width: 0;
}

.software-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  flex-shrink: 0;
}

.software-meta {
  min-width: 0;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.software-title {
  font-size: 20px;
}

.software-desc {
  line-height: 1.5;
}

.software-submeta {
  margin-top: 10px;
  font-size: 12px;
}

.category-chip {
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
}

.platform-chip {
  background: rgba(59, 130, 246, 0.16);
  color: #dbeafe;
}

.recommended-chip {
  background: rgba(245, 158, 11, 0.18);
  color: #fde68a;
}

.version-section {
  margin-top: 14px;
}

.table-wrap {
  overflow-x: auto;
}

.version-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.version-table th,
.version-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 13px;
}

.version-table th {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
}

.version-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mobile-version-list {
  display: none;
  gap: 10px;
}

.mobile-version-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mobile-version-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 12px;
}

.mobile-version-grid p {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insight-block {
  margin-top: 16px;
}

.distribution-list,
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.distribution-row,
.recent-item {
  padding: 12px 14px;
}

.distribution-row > div,
.recent-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.checkbox-field {
  flex-direction: row;
  align-items: center;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-display {
  flex: 1;
}

.upload-btn {
  flex-shrink: 0;
}

.hidden-input {
  display: none;
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

@media (max-width: 1080px) {
  .repo-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .filter-grid,
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .repo-page {
    padding: 12px;
  }

  .insight-panel {
    order: -1;
  }

  .hero-panel,
  .filter-panel,
  .toolbar,
  .pager,
  .dialog-actions,
  .software-head {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-actions,
  .toolbar-left,
  .toolbar-right,
  .pager-left,
  .pager-right,
  .software-actions,
  .upload-row {
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

  .mobile-version-list {
    display: grid;
    margin-top: 12px;
  }

  .insight-panel .panel-tip {
    display: none;
  }

  .summary-grid {
    margin-top: 10px;
  }

  .summary-card {
    padding: 12px;
  }

  .summary-card strong {
    font-size: 18px;
  }

  .distribution-row,
  .recent-item {
    padding: 10px 12px;
  }

  .form-inline-grid,
  .filter-grid,
  .mobile-version-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .software-main {
    flex-direction: column;
  }

  .upload-row {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 560px) {
  .hero-panel,
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

  .hero-tags {
    gap: 6px;
  }

  .hero-tag,
  .category-chip,
  .platform-chip,
  .recommended-chip {
    min-height: 26px;
    padding: 0 9px;
    font-size: 11px;
  }

  .insight-block {
    margin-top: 12px;
  }

  .distribution-list,
  .recent-list {
    gap: 8px;
  }

  .dialog-mask {
    padding: 10px;
  }
}
</style>
