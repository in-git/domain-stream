<template>
	<xn-form-container
		:title="isEditing ? '编辑网页条目数据' : '新建 SITE 网页条目'"
		:width="'80vw'"
		:visible="visible"
		:destroy-on-close="true"
		@close="onClose"
	>
		<div class="flex h-full flex-col bg-[#F5F5F7] h-[80vh]">
			<!-- Body: 3 栏布局 -->
			<!-- 左：基本信息 (1/4) | 中：LOGO 编辑 + 封面上传/截图 (1/2) | 右：封面预览 (1/4) -->
			<div class="flex min-h-0 flex-1 flex-col lg:flex-row">
				<!-- 栏1：基本信息 -->
				<div class="flex flex-col overflow-y-auto border-b border-[#E5E5EA] p-6 lg:w-1/4 lg:border-b-0 lg:border-r">
					<SiteFormBasic
						:form-data="formData"
						:errors="errors"
						:category-tree="categoryTree"
						v-model:activeTab="activeTab"
						@clear-pending="onClearPending"
					/>
				</div>

				<!-- 栏2：LOGO 编辑 + 封面 URL/上传 + 截图（占 1/2） -->
				<div class="flex flex-1 flex-col overflow-hidden border-b border-[#E5E5EA] lg:w-1/2 lg:border-b-0 lg:border-r">
					<SiteFormPreview
						:form-data="formData"
						:errors="errors"
						:pending-cover="pendingCover"
						:pending-logo="pendingLogo"
						:converting-key="convertingImageKey"
						@logo-cropped="onLogoCropped"
						@cover-cropped="onCoverCropped"
						@clear-pending="onClearPending"
						@convert-remote="convertRemoteImage"
					/>
				</div>

				<!-- 栏3：封面卡片预览 + iframe 网页预览 -->
				<div class="flex flex-col overflow-y-auto p-6 lg:w-1/4">
					<SiteFormCover
						:form-data="formData"
						:errors="errors"
						:pending-cover="pendingCover"
						:pending-logo="pendingLogo"
						@clear-pending="onClearPending"
						@convert-remote="convertRemoteImage"
					/>
				</div>
			</div>

			<!-- 底部保存栏：放在内容区，drawer/modal 均会渲染 -->
			<div class="flex shrink-0 items-center justify-end gap-2 border-t border-[#E5E5EA] bg-white px-6 py-3">
				<a-button @click="onClose">取消</a-button>
				<a-button type="primary" :loading="submitting" @click="handleSubmit">
					<template #icon><SaveOutlined /></template>
					保存
				</a-button>
			</div>
		</div>

		<!-- 图片裁剪弹窗：封面固定 16:9，LOGO 固定 1:1；裁剪结果暂存，点击"保存"时才统一上传 -->
		<a-modal
			v-model:visible="cropVisible"
			:title="cropTitle"
			:width="620"
			:mask-closable="false"
			:footer="null"
			:destroy-on-close="true"
			@cancel="closeCrop"
		>
			<div class="space-y-3">
				<div class="w-full overflow-hidden rounded-[10px] bg-[#F5F5F7]">
					<img
						v-if="cropVisible && cropSrc"
						ref="cropImgRef"
						:src="cropSrc"
						alt="crop"
						class="block w-full"
						@load="onCropImgLoad"
					/>
				</div>
				<div class="flex items-center justify-between  text-[#86868B]">
					<span>滚轮缩放 · 拖动平移 · 可拖拽裁剪框</span>
					<a-button size="small" type="link" @click="resetCropper">重置</a-button>
				</div>
				<div class="flex justify-end gap-2">
					<a-button @click="closeCrop">取消</a-button>
					<a-button type="primary" @click="confirmCrop">确定裁剪</a-button>
				</div>
			</div>
		</a-modal>
	</xn-form-container>
</template>

<script setup>
	import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
	import { message, Modal } from 'ant-design-vue'
	import { SaveOutlined } from '@ant-design/icons-vue'
	import { getApiBaseUrl } from '@/utils/request'
	import bizSiteApi from '@/api/biz/bizSiteApi'
	import bizSitePublicApi from '@/api/biz/bizSitePublicApi'
	import bizCategoryApi from '@/api/biz/bizCategoryApi'
	import fileApi from '@/api/dev/fileApi'
	import Cropper from 'cropperjs'
	import 'cropperjs/dist/cropper.css'
	import SiteFormBasic from './components/SiteFormBasic.vue'
	import SiteFormCover from './components/SiteFormCover.vue'
	import SiteFormPreview from './components/SiteFormPreview.vue'

	// 分类树（多层，取自系统通用分类表模块 /biz/category/tree，交由 a-tree-select 展示与多选）
	const categoryTree = ref([])
	const loadCategories = async () => {
		try {
			const res = await bizCategoryApi.bizCategoryTree({})
			categoryTree.value = res?.data ?? res ?? []
		} catch {
			categoryTree.value = []
		}
	}

	// ---------- 工具函数 ----------
	const withBase = (value) => (value && value.startsWith('/') ? getApiBaseUrl() + value : value || '')
	// 把 withBase 拼出的完整链接还原为存储用的相对路径；非本站地址或 dataURL 原样返回
	const withoutBase = (value) => {
		if (value && value.startsWith(getApiBaseUrl())) {
			return value.slice(getApiBaseUrl().length)
		}
		return value || ''
	}
	// 是否本站完整链接（getApiBaseUrl() 开头），用于识别"未改、仅被前端拼过前缀"的图片
	const isLocalFullUrl = (value) => !!value && value.startsWith(getApiBaseUrl())

	// ---------- 状态 ----------
	const visible = ref(false)
	const submitting = ref(false)
	const isEditing = computed(() => !!formData.id)
	const activeTab = ref('basic')
	const errors = reactive({})

	// 裁剪暂存（裁剪完成后先不上传，等点击"保存"时统一上传）
	const pendingCover = ref('') // 封面裁剪结果（dataURL）
	const pendingLogo = ref('') // LOGO 裁剪结果（dataURL）

	// 编辑打开时记录的原始图片（数据库存储的相对路径），用于判断编辑过程中图片是否被改动
	let originalImages = { cover: '', logo: '' }

	// ---------- 图片裁剪弹窗（封面 16:9 / LOGO 1:1） ----------
	const cropVisible = ref(false)
	const cropSrc = ref('')
	const cropTarget = ref('cover') // 'cover' | 'logo'
	const cropImgRef = ref(null)
	let cropperInstance = null

	const cropTitle = computed(() => (cropTarget.value === 'logo' ? '裁剪 LOGO' : '裁剪封面（16:9）'))
	const cropAspectRatio = computed(() => (cropTarget.value === 'logo' ? 1 : 16 / 9))

	const openCrop = (target, src) => {
		cropTarget.value = target
		cropSrc.value = src
		cropVisible.value = true
	}

	const onCropImgLoad = () => {
		nextTick(() => {
			const img = cropImgRef.value
			if (!img) return
			if (cropperInstance) {
				cropperInstance.destroy()
				cropperInstance = null
			}
			cropperInstance = new Cropper(img, {
				viewMode: 1,
				dragMode: 'move',
				aspectRatio: cropAspectRatio.value,
				autoCropArea: 1,
				background: false,
				movable: true,
				zoomable: true,
				rotatable: false,
				scalable: false,
				checkCrossOrigin: true,
				checkOrientation: false,
				cropBoxMovable: false,
				cropBoxResizable: false,
				toggleDragModeOnDblclick: false,
			})
		})
	}
	const resetCropper = () => cropperInstance?.reset()
	const destroyCropper = () => {
		if (cropperInstance) {
			cropperInstance.destroy()
			cropperInstance = null
		}
	}
	const closeCrop = () => {
		cropVisible.value = false
		destroyCropper()
	}
	const confirmCrop = () => {
		if (!cropperInstance) {
			message.warning('裁剪器尚未就绪')
			return
		}
		const isLogo = cropTarget.value === 'logo'
		const canvas = cropperInstance.getCroppedCanvas({
			width: isLogo ? 560 : 1280,
			height: isLogo ? 560 : 720,
			imageSmoothingQuality: 'high',
		})
		if (!canvas) {
			message.error('裁剪失败')
			return
		}
		const dataUrl = canvasToWebpDataUrl(canvas)
		if (isLogo) pendingLogo.value = dataUrl
		else pendingCover.value = dataUrl
		closeCrop()
	}

	// 将 canvas 导出为 webp dataURL：优先导出 webp；若浏览器不支持 webp 编码（极罕见）则回退 png 并提示
	const canvasToWebpDataUrl = (canvas) => {
		const dataUrl = canvas.toDataURL('image/webp', 0.92)
		if (dataUrl.startsWith('data:image/webp')) return dataUrl
		message.warning('当前浏览器不支持 WebP 编码，已回退为 PNG 格式')
		return canvas.toDataURL('image/png')
	}

	// ---------- 远程网络图片处理 ----------
	// 判断是否为"需要落地的远程图片"：http(s) 链接且不属于本站上传目录，这类地址需下载转 webp 后再上传到本站
	const isRemoteNetImage = (url) => {
		if (!url || url.startsWith('data:')) return false
		if (!/^https?:\/\//i.test(url)) return false
		try {
			if (new URL(url).origin === new URL(getApiBaseUrl()).origin) return false
		} catch {
			/* 非法 URL 忽略 */
		}
		return true
	}

	// 通过 <img> 加载远程图片并绘制为 webp dataURL（跨域失败/非图片时 reject）
	const loadRemoteToWebp = (url) =>
		new Promise((resolve, reject) => {
			const img = new Image()
			img.crossOrigin = 'anonymous'
			img.onload = () => {
				if (!img.naturalWidth || !img.naturalHeight) {
					reject(new Error('图片尺寸无效'))
					return
				}
				const canvas = document.createElement('canvas')
				canvas.width = img.naturalWidth
				canvas.height = img.naturalHeight
				const ctx = canvas.getContext('2d')
				ctx.drawImage(img, 0, 0)
				resolve(canvasToWebpDataUrl(canvas))
			}
			img.onerror = () => reject(new Error('图片加载失败'))
			img.src = url
		})

	// 下载远程网络图片并转换为 webp dataURL：
	// 优先前端直连下载（目标站点允许跨域时最快），直连失败时再由本站后端代理下载（规避浏览器跨域限制）
	const fetchRemoteAsWebp = async (url) => {
		let blob = null
		try {
			const res = await fetch(url, { mode: 'cors' })
			if (res.ok) {
				const rawBlob = await res.blob()
				if (rawBlob.type.startsWith('image/')) blob = rawBlob
			}
		} catch {
			blob = null
		}
		if (!blob) {
			// 回退：后端代理下载
			const res = await fileApi.fileFetchRemoteImage({ url })
			if (!(res?.data instanceof Blob) || !res.data.type.startsWith('image/')) {
				throw new Error('下载失败')
			}
			blob = res.data
		}
		try {
			// 优先 createImageBitmap；个别场景（如 ico/svg）回退到 <img> 加载
			const bitmap = await createImageBitmap(blob)
			try {
				const canvas = document.createElement('canvas')
				canvas.width = bitmap.width
				canvas.height = bitmap.height
				const ctx = canvas.getContext('2d')
				ctx.drawImage(bitmap, 0, 0)
				return canvasToWebpDataUrl(canvas)
			} finally {
				bitmap.close()
			}
		} catch (e) {
			// 用后端代理下载到的字节生成 objectURL 加载，避免对目标站点再次跨域请求
			if (blob) {
				const objectUrl = URL.createObjectURL(blob)
				try {
					return await loadRemoteToWebp(objectUrl)
				} finally {
					URL.revokeObjectURL(objectUrl)
				}
			}
			return loadRemoteToWebp(url)
		}
	}

	// 手动"转为本地文件"：把网络图标下载转成 webp，暂存为待上传文件（convertingImageKey 控制按钮 loading）；
	// 点击"保存"时才由 handleSubmit 统一上传到云端
	const convertingImageKey = ref('')
	const convertRemoteImage = async (key) => {
		const url = formData[key]
		if (!isRemoteNetImage(url)) {
			message.info('当前内容已是本地文件，无需转换')
			return
		}
		convertingImageKey.value = key
		try {
			const dataUrl = await fetchRemoteAsWebp(url)
			if (key === 'logo') 			pendingLogo.value = dataUrl
			else pendingCover.value = dataUrl
		} catch (e) {
			message.error(`${key === 'cover' ? '封面' : 'LOGO'} 转换失败：${e?.message || '请检查网络后重试'}`)
		} finally {
			convertingImageKey.value = ''
		}
	}

	// favicon 图标列表中选择：组件内仅把选中的远程图标地址写入 formData.logo 并高亮，
	// 不立即下载转文件；保存时由 handleSubmit 的远程图片统一处理流程下载转本地（避免卡顿）


	const emptyFormData = () => ({
		id: '',
		name: '',
		link: '',
		// 图标默认使用 favicon 服务（link 为空时的兜底值）
		logo: 'https://ad5b2b34e29aea588.app.workbuddy.link/api/favicon?url=api.suyanw.cn',
		cover: '',
		des: '',
		orderNum: 200,
		count: 0,
		visible: 'Y',
		background: '',
		isRecommend: 'N',
		categoryIds: [],
		device: '',
		signal: null,
	})

	const formData = reactive(emptyFormData())

	// ---------- 生命周期/接口 ----------
	const emit = defineEmits(['successful'])
	const onOpen = async (record) => {
		Object.assign(formData, emptyFormData())
		// 重置裁剪暂存
		pendingCover.value = ''
		pendingLogo.value = ''
		originalImages.cover = ''
		originalImages.logo = ''
		if (record && record.id) {
			try {
				const data = await bizSiteApi.bizSiteDetail({ id: record.id })
				// 记录编辑前的原始图片（相对路径），保存时据此判断图片是否被改动
				originalImages.cover = data.cover || ''
				originalImages.logo = data.logo || ''
				Object.assign(formData, {
					...data,
					logo: withBase(data.logo),
					cover: withBase(data.cover),
					categoryIds: data.categoryIds || [],
					visible: data.visible || 'Y',
					isRecommend: data.isRecommend || 'N',
				})
			} catch (e) {
				message.error('获取详情失败')
			}
		}
		Object.keys(errors).forEach((k) => delete errors[k])
		activeTab.value = 'basic'
		visible.value = true
	}
	defineExpose({ onOpen })

	const onClose = () => {
		visible.value = false
	}

	// ---------- 校验/提交 ----------
	const FIELD_LABELS = {
		name: '网页名称',
		link: '网页链接',
		logo: 'LOGO',
		cover: '封面',
		des: '简要描述',
		categoryIds: '分类',
		device: '终端类型',
		signal: '信号值',
	}

	const pendingValue = (key) => (key === 'cover' ? pendingCover.value : pendingLogo.value)

	const validate = () => {
		Object.keys(errors).forEach((k) => delete errors[k])
		if (!formData.name?.trim()) errors.name = '网页名称不能为空'
		if (!formData.link?.trim() || formData.link === 'https://') errors.link = '链接地址不能为空'
		if (!formData.logo?.trim() && !pendingLogo.value) errors.logo = 'LOGO 不能为空'
		if (!formData.cover?.trim() && !pendingCover.value) errors.cover = '封面不能为空'
		if (!formData.des?.trim()) errors.des = '描述不能为空'
		if (!formData.categoryIds || formData.categoryIds.length === 0) errors.categoryIds = '请至少选择一个分类'
		if (!formData.device?.trim()) errors.device = '请选择终端类型'
		if (formData.signal == null || formData.signal < 1 || formData.signal > 5) errors.signal = '请输入 1-5 的信号值'
		return Object.keys(errors).length === 0
	}

	const handleSubmit = async () => {
		if (!validate()) {
			const missing = Object.keys(errors)
				.map((k) => FIELD_LABELS[k])
				.filter(Boolean)
			if (missing.length) {
				Modal.warning({
					title: '保存失败',
					content: `以下必填字段未填写：${missing.join('、')}`,
				})
			}
			return
		}
		submitting.value = true
		try {
			// 图片处理：仅当图片有改动时才上传/转换，未改动则保持原值、只保存基本信息
			// 改动判定：有裁剪/上传暂存（pending* 非空），或当前值（还原为相对路径后）与编辑前的原始值不一致
			const isImageChanged = (key) => {
				if (pendingValue(key)) return true
				const current = formData[key]
				const currentRel = isLocalFullUrl(current) ? withoutBase(current) : current
				return currentRel !== originalImages[key]
			}
			for (const key of ['cover', 'logo']) {
				if (!isImageChanged(key)) continue
				if (pendingValue(key)) {
					// 本次裁剪/选择/粘贴/主动"转为本地文件"产生的本地图片 => 上传
					formData[key] = await uploadDataUrl(pendingValue(key), `site_${key}_${Date.now()}.webp`)
				} else if (isRemoteNetImage(formData[key])) {
					// 手动输入/候选选中的远程网络图片 => 下载转 webp 后上传到本站，避免第三方失效后丢失
					try {
						const dataUrl = await fetchRemoteAsWebp(formData[key])
						formData[key] = await uploadDataUrl(dataUrl, `site_${key}_${Date.now()}.webp`)
					} catch (e) {
						// 下载/上传失败时保留原网络地址、不阻断保存，仅提示
						message.warning(`${key === 'cover' ? '封面' : 'LOGO'} 网络图片转本地失败，已保留原链接`)
					}
				}
			}
			// 统一规整为相对路径：还原编辑时 withBase 拼出的前缀（未改动字段），并把上传/转换得到的完整 URL 一并还原
			for (const key of ['cover', 'logo']) {
				if (isLocalFullUrl(formData[key])) {
					formData[key] = withoutBase(formData[key])
				}
			}
			// 分类只传纯 ID（可能有 {label, value} 对象的情况）
			formData.categoryIds = (formData.categoryIds || []).map((v) =>
				typeof v === 'object' && v !== null ? v.value : v
			)
			await bizSiteApi.bizSiteSubmitForm(formData, !!formData.id)
			visible.value = false
			emit('successful')
		} catch (e) {
			message.error(e?.message || '保存失败')
		} finally {
			submitting.value = false
		}
	}

	// ---------- 上传/粘贴 ----------
	// dataURL -> Blob
	const dataUrlToBlob = (dataUrl) => {
		const [head, body] = dataUrl.split(',')
		const mime = (head.match(/data:(.*?);/) || [])[1] || 'image/png'
		const bin = atob(body)
		const arr = new Uint8Array(bin.length)
		for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
		return new Blob([arr], { type: mime })
	}

	// 上传暂存的裁剪结果，返回完整 URL
	const uploadDataUrl = async (dataUrl, filename) => {
		const fd = new FormData()
		fd.append('file', dataUrlToBlob(dataUrl), filename)
		// 复用统一封装的上传接口，自动携带鉴权并解包返回结果
		const res = await fileApi.fileUploadDynamicReturnUrl(fd)
		// 兼容两种返回结构：data 直接为 url 字符串，或 data.data 为 url 字符串
		const url = (res?.data?.data || res?.data || res || '').toString().trim()
		if (!url) throw new Error('上传失败')
		return url.startsWith('/') ? getApiBaseUrl() + url : url
	}

	// 封面裁剪完成（来自 SiteFormPreview）：暂存，保存时才上传
	const onCoverCropped = (dataUrl) => {
		pendingCover.value = dataUrl
	}

	// LOGO 裁剪完成（来自 SiteFormPreview）：暂存，保存时才上传
	const onLogoCropped = (dataUrl) => {
		pendingLogo.value = dataUrl
	}

	// 用户手动输入 URL / 点击候选方案时，清空对应的裁剪暂存，避免被裁剪结果覆盖
	const onClearPending = (type) => {
		if (type === 'cover') pendingCover.value = ''
		else if (type === 'logo') pendingLogo.value = ''
	}

	// 粘贴封面：同样先打开 16:9 裁剪弹窗，不直接上传
	const handleCoverFiles = (files) => {
		if (!files || files.length === 0) return
		const file = files[0]
		if (!file.type.startsWith('image/')) {
			errors.cover = '请选择图片文件'
			return
		}
		errors.cover = ''
		const reader = new FileReader()
		reader.onload = () => openCrop('cover', reader.result)
		reader.readAsDataURL(file)
	}

	// 全局粘贴上传封面
	const onPaste = (e) => {
		const items = e.clipboardData?.files
		if (items && items.length) {
			e.preventDefault()
			handleCoverFiles(items)
		}
	}
	onMounted(() => {
		loadCategories()
		document.addEventListener('paste', onPaste)
	})
	onBeforeUnmount(() => {
		destroyCropper()
		document.removeEventListener('paste', onPaste)
	})
</script>
