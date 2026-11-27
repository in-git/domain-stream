<template>
	<div
		class="site-form-logo flex w-full flex-col gap-4 border-t border-[#E5E5EA] bg-[#F5F5F7] p-5 lg:border-t-0"
		@paste="onPaste"
	>
		<!-- 封面 URL / 上传 -->
		<div class="space-y-2">
			<label class="mb-1 block font-medium">
				封面 URL / 上传 <span class="text-red-500">*</span>
			</label>
			<div class="flex items-center gap-2">
				<a-input
					v-model:value="props.formData.cover"
					placeholder="粘贴图片 URL，或直接上传 / 裁剪"
					:status="errors.cover ? 'error' : ''"
					class="flex-1"
					@input="onCoverUrlInput"
				/>
				<a-button @click="triggerCoverFile">
					<template #icon><UploadOutlined /></template>
					上传
				</a-button>
			</div>
			<div v-if="errors.cover" class="mt-1 text-red-500">{{ errors.cover }}</div>
			<input
				ref="coverFileInput"
				type="file"
				accept="image/*"
				class="hidden"
				@change="onCoverFileChange"
			/>
			<p class="text-[#86868B]">建议 16:9 比例；可上传后裁剪为 16:9 封面。</p>
		</div>

		<!-- 标题 -->
		<div class="flex items-center justify-between">
			<span class="text-[15px] font-semibold text-[#1D1D1F]">封面与 LOGO</span>
			<span v-if="pendingCover || pendingLogo" class="rounded-full bg-[#007AFF]/10 px-2 py-0.5 text-xs text-[#007AFF]">
				待保存裁剪
			</span>
		</div>

		<!-- 封面与 LOGO 并排 -->
		<div class="flex flex-col gap-4 md:flex-row">
			<!-- 封面卡片：左侧 16:9 预览 + 下方操作 -->
			<div class="apple-shadow flex flex-1 flex-col gap-3 rounded-[14px] border border-[#E5E5EA] bg-white p-4">
				<!-- 16:9 封面预览 -->
				<div
					class="relative flex h-[200px] aspect-[16/9] max-w-full items-center justify-center overflow-hidden rounded-[14px] border-2 border-[#D2D2D7] ring-1 ring-black/5"
					:style="{ backgroundColor: formData.background || 'transparent' }"
				>
					<img
						v-if="coverDisplaySrc"
						:src="coverDisplaySrc"
						alt="cover"
						class="h-full w-full object-cover"
					/>
					<span
						v-else
						class="text-[36px] font-bold"
						:style="{ color: formData.background ? '#FFFFFF' : '#1D1D1F' }"
					>
						{{ (formData.name || 'W').charAt(0) }}
					</span>
				</div>
				<!-- 操作按钮 -->
				<a-button block type="primary" ghost @click="triggerCoverFile">
					<template #icon><UploadOutlined /></template>
					上传封面
				</a-button>
				<p class="text-xs text-[#86868B]">
					支持上传、粘贴图片，将自动裁剪为 16:9 封面
				</p>
			</div>

			<!-- LOGO 卡片：左侧大预览 + 右侧操作 -->
			<div class="apple-shadow flex flex-1 items-center gap-4 rounded-[14px] border border-[#E5E5EA] bg-white p-4">
			<!-- 大 LOGO 预览 -->
			<div
				class="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-[#E5E5EA]"
				:style="{ backgroundColor: formData.background || 'transparent' }"
			>
				<img
					v-if="logoDisplaySrc"
					:src="logoDisplaySrc"
					alt="logo"
					class="h-full w-full object-cover"
				/>
				<span
					v-else
					class="text-[36px] font-bold"
					:style="{ color: formData.background ? '#FFFFFF' : '#1D1D1F' }"
				>
					{{ (formData.name || 'W').charAt(0) }}
				</span>
			</div>
			<!-- 操作按钮 -->
			<div class="flex flex-1 flex-col gap-2">
				<a-button block type="primary" ghost @click="triggerLogoFile">
					<template #icon><UploadOutlined /></template>
					上传 Logo
				</a-button>
				<a-button block :disabled="!coverDisplaySrc" @click="openCropperFromCover">
					<template #icon><ScissorOutlined /></template>
					从封面截取 Logo
				</a-button>
				<p class="text-xs text-[#86868B]">
					支持上传、粘贴图片，或从已设置的封面上裁剪出 1:1 图标
				</p>
			</div>
		</div>
		</div>

		<!-- 隐藏的文件选择器：用于挑选一张图片作为 LOGO 源 -->
		<input
			ref="logoFileInput"
			type="file"
			accept="image/*"
			class="hidden"
			@change="onLogoFileChange"
		/>

		<!-- 网页 LOGO (URL 或 Favicon) -->
		<div class="space-y-2">
			<label class="block font-medium">
				网页 LOGO (URL 或 Favicon) <span class="text-red-500">*</span>
			</label>
			<div class="flex items-center gap-2">
				<a-input
					v-model:value="props.formData.logo"
					placeholder="粘贴 Logo 图片 URL，或上面的 favicon 地址"
					:status="errors.logo ? 'error' : ''"
					class="flex-1"
					@input="onLogoUrlInput"
				/>
				<a-button
					:loading="fetchingIcons"
					:disabled="!props.formData.link || props.formData.link === 'https://'"
					@click="handleFetchFavicon"
				>
					<template #icon><ApiOutlined /></template>
					获取 icon
				</a-button>
			</div>
			<div v-if="errors.logo" class="text-red-500">{{ errors.logo }}</div>

			<!-- favicon 图标列表：存在链接且已拉取到列表时展示；点击仅选中高亮，保存时统一处理 -->
			<div v-if="faviconIcons.length" class="space-y-2">
				<div class="text-xs text-[#86868B]">
					点击图标选中（高亮），保存时统一下载转成本地文件
				</div>
				<div class="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
					<button
						v-for="(icon, i) in faviconIcons"
						:key="i"
						type="button"
						class="flex aspect-square items-center justify-center overflow-hidden rounded-[10px] border bg-white transition hover:border-[#007AFF] hover:shadow-sm"
						:class="
							icon.url === props.formData.logo
								? 'border-[#007AFF] ring-2 ring-[#007AFF]/30'
								: 'border-[#E5E5EA]'
						"
						:title="icon.engine"
						@click="onSelectFaviconIcon(icon)"
					>
						<img
							:src="icon.url"
							:alt="icon.engine"
							class="h-full w-full object-contain"
							loading="lazy"
						/>
					</button>
				</div>
			</div>
		</div>

		<!-- LOGO 裁剪弹窗 -->
		<a-modal
			v-model:visible="cropperVisible"
			:title="cropTitle"
			:width="520"
			:mask-closable="false"
			:footer="null"
			:destroy-on-close="true"
			@cancel="closeCropper"
		>
			<div class="space-y-3">
				<div class="w-full overflow-hidden rounded-[10px] bg-[#F5F5F7]">
					<img
						v-if="cropperVisible && logoEditingSrc"
						ref="cropImgRef"
						:src="logoEditingSrc"
						:crossorigin="isRemoteSrc ? 'anonymous' : undefined"
						alt="crop"
						class="block w-full"
						@load="onCropImgLoad"
					/>
				</div>
				<div class="flex items-center justify-between text-[#86868B]">
					<span>滚轮缩放 · 拖动平移 · 可拖拽裁剪框</span>
					<a-button size="small" type="link" @click="resetCropper">重置</a-button>
				</div>
				<div class="flex justify-end gap-2">
					<a-button @click="closeCropper">取消</a-button>
					<a-button type="primary" @click="saveCropped"> 保存 </a-button>
				</div>
			</div>
		</a-modal>
	</div>
</template>

<script setup>
	import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
	import { message } from 'ant-design-vue'
	import {
		UploadOutlined,
		ScissorOutlined,
		ApiOutlined,
		CameraOutlined,
		PictureOutlined,
	} from '@ant-design/icons-vue'
	import Cropper from 'cropperjs'
	import 'cropperjs/dist/cropper.css'

	const props = defineProps({
		formData: { type: Object, required: true },
		errors: { type: Object, required: true },
		pendingCover: { type: String, default: '' }, // 封面裁剪暂存（未上传）
		pendingLogo: { type: String, default: '' }, // LOGO 裁剪暂存（未上传）
		convertingKey: { type: String, default: '' }, // 当前正在转换远程图片的字段
	})

	// 子组件裁剪完成后交由父组件暂存（不直接上传）：
	// logoCropped：裁剪出 1:1 LOGO；coverCropped：裁剪出 16:9 封面
	// selectFavicon：点击 favicon 列表中的图标，交由父组件直接转成本地文件（不裁剪）
	const emit = defineEmits(['logoCropped', 'coverCropped', 'clearPending', 'convertRemote'])

	// ---------- 封面上传 ----------
	const coverFileInput = ref(null)
	const triggerCoverFile = () => coverFileInput.value?.click()
	// 选择封面文件后读取为 dataURL，直接打开子组件内 16:9 裁剪（与 LOGO 上传同源逻辑）
	const onCoverFileChange = (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		if (!file.type.startsWith('image/')) {
			props.errors.cover = '请选择图片文件'
			return
		}
		const reader = new FileReader()
		reader.onload = () => {
			cropTarget.value = 'cover'
			logoEditingSrc.value = reader.result
			cropperVisible.value = true
		}
		reader.readAsDataURL(file)
		e.target.value = ''
	}
	// 手动编辑封面 URL 时清除裁剪暂存（以手填 URL 为准）
	const onCoverUrlInput = () => {
		if (props.pendingCover) emit('clearPending', 'cover')
	}

	// logo 显示源：优先使用裁剪暂存（pendingLogo），其次 formData.logo，附加时间戳避免浏览器缓存导致图片不刷新
	const logoVersion = ref(0)
	const logoDisplaySrc = computed(() => {
		const logo = props.pendingLogo || props.formData.logo || ''
		if (!logo) return ''
		// data: URL 或无查询参数的远程地址都附加版本号，强制浏览器重新加载
		if (logo.startsWith('data:')) return logo
		const sep = logo.includes('?') ? '&' : '?'
		return `${logo}${sep}v=${logoVersion.value}`
	})

	// 封面显示源：优先使用裁剪暂存
	const coverDisplaySrc = computed(() => props.pendingCover || props.formData.cover || '')

	// 选择文件后生成的待裁剪图片源
	const logoFileInput = ref(null)
	const logoEditingSrc = ref('')
	const cropperVisible = ref(false)
	// cropTarget 表示裁剪入口来源，决定裁剪比例与弹窗标题：
	// 'logo'（上传文件裁 1:1）| 'cover'（上传文件裁 16:9 封面）| 'coverLogo'（从封面截取 1:1 LOGO）
	const cropTarget = ref('logo')
	const cropTitle = computed(() => {
		if (cropTarget.value === 'cover') return '裁剪封面（16:9）'
		if (cropTarget.value === 'coverLogo') return '从封面截取 LOGO'
		return '裁剪 LOGO（1:1）'
	})

	// 组件卸载时清理 cropper 实例
	onBeforeUnmount(() => destroyCropper())

	// 判断裁剪源是否为远程 URL（需以 CORS 方式加载，避免 canvas 污染）
	const isRemoteSrc = computed(() => {
		const src = logoEditingSrc.value || ''
		return /^https?:\/\//i.test(src) && !src.startsWith('data:')
	})

	// ---------- favicon 工具 ----------
	const FAVICON_BASE = 'https://ad5b2b34e29aea588.app.workbuddy.link'
	// 单图标文件接口（兜底默认 favicon）
	const FAVICON_API = `${FAVICON_BASE}/api/favicon`
	const FAVICON_DEFAULT_URL = `${FAVICON_API}?url=api.suyanw.cn`
	// favicon 图标列表接口（返回各大引擎的 128 图标清单）
	const FAVICONS_API = `${FAVICON_BASE}/api/favicons`
	// 从 link 中提取域名（用于 favicon 列表/单图接口）
	const extractHost = (link = '') => {
		const trimmed = (link || '').trim()
		if (!trimmed || trimmed === 'https://') return ''
		try {
			return new URL(trimmed).hostname
		} catch {
			return trimmed.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
		}
	}
	const getDefaultFavicon = (link = '') => {
		const host = extractHost(link)
		if (!host) return FAVICON_DEFAULT_URL
		return `${FAVICON_API}?url=${host}`
	}
	// favicon 图标列表（点击"获取 icon"后拉取，按引擎展示在下方网格）
	const faviconIcons = ref([])
	const fetchingIcons = ref(false)
	const handleFetchFavicon = async () => {
		const link = (props.formData.link || '').trim()
		if (!link || link === 'https://') {
			message.warning('请先填写网页链接')
			return
		}
		fetchingIcons.value = true
		faviconIcons.value = []
		// 50s 超时兜底，避免请求挂起导致按钮一直 loading（禁用）
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), 50000)
		try {
			const host = extractHost(link)
			const res = await fetch(`${FAVICONS_API}?domain=${encodeURIComponent(host)}`, {
				signal: controller.signal,
			})
			if (!res.ok) throw new Error('请求失败')
			const data = await res.json()
			const icons = data?.icons || []
			if (!icons.length) {
				message.info('未获取到可选图标，已回填默认 favicon')
				props.formData.logo = getDefaultFavicon(link)
				emit('clearPending', 'logo')
			} else {
				faviconIcons.value = icons
			}
		} catch (e) {
			message.error('获取 icon 列表失败')
		} finally {
			clearTimeout(timer)
			fetchingIcons.value = false
		}
	}
	// 点击某个 favicon 图标：仅选中高亮（写入 logo 远程地址），不立即下载转文件；
	// 保存时由父组件统一将远程图片下载转本地
	const onSelectFaviconIcon = (icon) => {
		if (!icon?.url) return
		props.formData.logo = icon.url
		emit('clearPending', 'logo')
	}

	// 手动编辑 LOGO URL 时清除裁剪暂存（以手填 URL 为准）
	const onLogoUrlInput = () => {
		if (props.pendingLogo) emit('clearPending', 'logo')
	}

	// 文件选择：读取为 dataURL 后自动打开 1:1 裁剪（保留自动裁剪逻辑）
	const onLogoFileChange = (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		if (!file.type.startsWith('image/')) {
			props.errors.logo = '请选择图片文件'
			return
		}
		const reader = new FileReader()
		reader.onload = () => {
			logoEditingSrc.value = reader.result
			cropperVisible.value = true
		}
		reader.readAsDataURL(file)
		e.target.value = ''
	}

	// 从封面截取 LOGO：以封面图为裁剪源，裁成 1:1 作为 LOGO（保留封面，不覆盖封面）
	const openCropperFromCover = async () => {
		cropTarget.value = 'coverLogo'
		const src = coverDisplaySrc.value
		if (!src) {
			message.warning('请先设置封面图')
			return
		}
		// 远程/签名地址需转为同源 dataURL，否则裁剪器会跨域污染 canvas 导致导出失败
		const loaded = await loadImageToDataUrl(src)
		if (!loaded) {
			message.warning('封面图加载失败（可能原图地址不可访问），请重新上传封面')
			return
		}
		logoEditingSrc.value = loaded
		cropperVisible.value = true
	}

	const triggerLogoFile = () => logoFileInput.value?.click()

	// 粘贴：若剪贴板包含图片，则直接作为 LOGO 源自动裁剪
	const onPaste = async (e) => {
		const items = e.clipboardData?.items
		if (!items) return
		for (const it of items) {
			if (it.type.startsWith('image/')) {
				const file = it.getAsFile()
				if (!file) continue
				const reader = new FileReader()
				reader.onload = () => {
					logoEditingSrc.value = reader.result
					cropperVisible.value = true
				}
				reader.readAsDataURL(file)
				e.preventDefault()
				return
			}
		}
	}

	// ---------- cropperjs 实例管理 ----------
	const cropImgRef = ref(null)
	let cropperInstance = null

	const destroyCropper = () => {
		if (cropperInstance) {
			cropperInstance.destroy()
			cropperInstance = null
		}
	}

	const onCropImgLoad = async () => {
		await nextTick()
		// 远程源设置 crossOrigin 后需等待解码，避免 canvas 污染
		if (isRemoteSrc.value) {
			try {
				await cropImgRef.value?.decode()
			} catch {
				/* 忽略解码异常，继续尝试初始化 */
			}
		}
		initCropper()
	}

	const initCropper = () => {
		destroyCropper()
		if (!cropImgRef.value) return
		cropperInstance = new Cropper(cropImgRef.value, {
			viewMode: 1,
			dragMode: 'move',
			aspectRatio: cropTarget.value === 'cover' ? 16 / 9 : 1,
			autoCropArea: 1,
			background: false,
			guides: true,
			center: true,
			highlight: false,
			cropBoxMovable: true,
			cropBoxResizable: true,
			toggleDragModeOnDblclick: false,
			ready() {
				// 远程跨域图片未正确加载时给出提示
				if (isRemoteSrc.value && !cropperInstance?.canvasData) {
					message.warning('远程图片可能受跨域限制，建议先下载到本地再上传')
				}
			},
		})
	}

	const resetCropper = () => {
		cropperInstance?.reset()
	}

	const closeCropper = () => {
		cropperVisible.value = false
		logoEditingSrc.value = ''
		destroyCropper()
	}

	// 调用 cropperjs 导出裁剪结果：按 cropTarget 决定是封面（16:9）还是 LOGO（1:1），
	// 仅暂存到父组件，等点击"保存"时才统一上传
	const saveCropped = async () => {
		if (!cropperInstance) {
			message.warning('裁剪器尚未就绪')
			return
		}
		try {
			// 不强制固定输出尺寸，按裁剪框的实际像素（默认即整张原图）导出，
			// 避免把原图缩放/裁掉额外部分
			const canvas = cropperInstance.getCroppedCanvas({
				imageSmoothingQuality: 'high'
			})
			if (!canvas) throw new Error('裁剪失败')
			const dataUrl = canvasToWebpDataUrl(canvas)
			// 交由父组件暂存，保存表单时才上传
			if (cropTarget.value === 'cover') emit('coverCropped', dataUrl)
			else emit('logoCropped', dataUrl)
			closeCropper()
		} catch (err) {
			message.error(err?.message || '裁剪失败')
		}
	}

	// 把任意图片 url 转成同源 dataURL，避免 cropper 导出时 canvas 被跨域污染
	const loadImageToDataUrl = (url) =>
		new Promise((resolve) => {
			const img = new Image()
			// 远程需匿名跨域，否则画布会被污染无法 toDataURL
			if (/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
				img.crossOrigin = 'anonymous'
			}
			img.onload = () => {
				try {
					const canvas = document.createElement('canvas')
					canvas.width = img.naturalWidth
					canvas.height = img.naturalHeight
					const ctx = canvas.getContext('2d')
					ctx.drawImage(img, 0, 0)
					resolve(canvas.toDataURL('image/png'))
				} catch {
					resolve(null)
				}
			}
			img.onerror = () => resolve(null)
			img.src = url
		})

	// 将裁剪 canvas 导出为 webp dataURL（带存在性降级）
	const canvasToWebpDataUrl = (canvas) => {
		try {
			if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
				return canvas.toDataURL('image/webp', 0.95)
			}
		} catch {
			/* 部分环境不支持 webp，降级 */
		}
		return canvas.toDataURL('image/png')
	}
</script>

<style scoped>
	.site-form-logo {
		min-height: 0;
	}
	:deep(.apple-shadow) {
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
	}
</style>
