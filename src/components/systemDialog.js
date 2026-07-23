let dialogPresenter = null
const pendingDialogRequests = []

function presentOrQueue(request) {
  if (dialogPresenter) {
    dialogPresenter(request)
    return
  }
  pendingDialogRequests.push(request)
}

export function registerSystemDialogPresenter(presenter) {
  dialogPresenter = presenter
  pendingDialogRequests.splice(0).forEach((request) => presenter(request))

  return () => {
    if (dialogPresenter === presenter) {
      dialogPresenter = null
    }
  }
}

export function inferDialogTone(message, requestedTone) {
  if (requestedTone) {
    return requestedTone
  }

  const normalizedMessage = String(message || '')
  if (/成功|完成|已复制|已创建|已更新|已保存/.test(normalizedMessage)) {
    return 'success'
  }
  if (/删除|清理|放弃|不可恢复|禁用|移除/.test(normalizedMessage)) {
    return 'danger'
  }
  return 'warning'
}

export function alertDialog(message, options = {}) {
  return new Promise((resolve) => {
    presentOrQueue({
      kind: 'alert',
      message: String(message ?? ''),
      title: options.title,
      tone: inferDialogTone(message, options.tone),
      confirmText: options.confirmText || '知道了',
      resolve
    })
  })
}

export function confirmDialog(message, options = {}) {
  return new Promise((resolve) => {
    presentOrQueue({
      kind: 'confirm',
      message: String(message ?? ''),
      title: options.title,
      tone: inferDialogTone(message, options.tone),
      confirmText: options.confirmText || '确认',
      cancelText: options.cancelText || '取消',
      resolve
    })
  })
}

export function installNativeAlertBridge() {
  if (typeof window === 'undefined') {
    return
  }

  // 旧页面仍可继续调用 alert，新提示会统一进入非阻塞的系统弹窗队列。
  window.alert = (message) => {
    void alertDialog(message)
  }
}
