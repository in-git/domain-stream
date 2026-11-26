import { baseRequest, default as service, getApiBaseUrl } from '@/utils/request'
import tool from '@/utils/tool'

const requestOptions = {
	skipSuccessMessage: true,
	skipErrorMessage: true
}

/**
 * 导出接口用隐藏 iframe 触发浏览器原生下载，
 * 同时把 token 写入 API 路径的 Cookie，供 sa-token 在无自定义请求头时鉴权。
 */
function triggerNativeDownload(path) {
	const token = tool.data.get('TOKEN')
	if (!token) throw new Error('登录状态已失效，请重新登录')

	const apiBaseUrl = getApiBaseUrl().replace(/\/$/, '')
	let cookiePath = '/'
	if (/^https?:\/\//.test(apiBaseUrl)) {
		cookiePath = new URL(apiBaseUrl).pathname.replace(/\/$/, '') || '/'
	} else if (apiBaseUrl.startsWith('/')) {
		cookiePath = apiBaseUrl
	}
	document.cookie = `token=${encodeURIComponent(token)}; path=${cookiePath}; SameSite=Lax`

	const frame = document.createElement('iframe')
	frame.hidden = true
	frame.style.display = 'none'
	document.body.appendChild(frame)
	const separator = path.includes('?') ? '&' : '?'
	frame.src = `${apiBaseUrl}${path}${separator}ticket=${encodeURIComponent(createTicket())}&_dl=${Date.now()}`
	window.setTimeout(() => frame.remove(), 10 * 60 * 1000)
	return frame
}

function createTicket() {
	if (window.crypto && typeof window.crypto.randomUUID === 'function') {
		return window.crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 用真实 FormData 提交，让 axios 自动生成 multipart boundary */
function postForm(url, params) {
	const form = new FormData()
	Object.entries(params).forEach(([key, value]) => form.append(key, String(value)))
	return service.post(url, form, requestOptions)
}

/** 导出接口在响应结束时把票据标记为 DONE，前端轮询到这里才结束 loading */
async function downloadAndWait(path) {
	const frame = triggerNativeDownload(path)
	const ticket = new URL(frame.src).searchParams.get('ticket')
	const deadline = Date.now() + 30 * 60 * 1000
	let failures = 0
	while (Date.now() < deadline) {
		await new Promise((resolve) => window.setTimeout(resolve, 600))
		try {
			const done = await baseRequest('/biz/export/status', { ticket }, 'get', requestOptions)
			if (done) return
			failures = 0
		} catch (error) {
			if (++failures >= 50) throw new Error('无法获取导出进度，请稍后查看浏览器下载记录')
		}
	}
	throw new Error('导出超时，请稍后查看浏览器下载记录')
}

const bizDataTransferApi = {
	exportDatabase: () => downloadAndWait('/biz/export/database'),
	exportFullDirectory: () => downloadAndWait('/biz/export/files'),
	exportUserFiles: () => downloadAndWait('/biz/export/user-files'),
	/** 完整迁移包：一个 ZIP 内含 SQL、文件和 ID 映射 */
	exportMigration: () => downloadAndWait('/biz/export/migration'),

	importInit: (params) => postForm('/biz/import/upload/init', params),

	/** 单片用 axios 的 onUploadProgress 获取真实上传进度 */
	importChunk: (uploadId, index, chunk, onProgress) => {
		const form = new FormData()
		form.append('uploadId', uploadId)
		form.append('index', String(index))
		form.append('file', chunk, `chunk-${index}`)
		return service.post('/biz/import/upload/chunk', form, {
			...requestOptions,
			onUploadProgress: (event) => {
				if (event.total) onProgress(event.loaded)
			}
		})
	},

	importComplete: (uploadId) => postForm('/biz/import/upload/complete', { uploadId }),
	importStatus: (ticket) => baseRequest('/biz/import/status', { ticket }, 'get', requestOptions)
}

export default bizDataTransferApi
