<template>
	<div v-if="indexShow" class="index-wrap">
		<xn-panel>
			<div class="material-toolbar">
				<a-radio-group v-model:value="activeCategory" button-style="solid" class="material-tabs">
					<a-radio-button v-for="item in categoryOptions" :key="item.value" :value="item.value">
						{{ item.label }}
					</a-radio-button>
				</a-radio-group>
				<a-input-search
					v-model:value="searchKey"
					placeholder="请输入素材名称关键词"
					class="material-search"
					allow-clear
					@search="onSearch"
				/>
				<a-space>
					<a-button type="primary" @click="() => uploadFormRef.openUpload()">
						<UploadOutlined />
						上传素材
					</a-button>
					<a-popconfirm title="删除选中的素材？" :disabled="!selectedRowKeys.length" @confirm="deleteBatchFile">
						<a-button danger :disabled="!selectedRowKeys.length">
							<DeleteOutlined />
							批量删除
						</a-button>
					</a-popconfirm>
				</a-space>
			</div>
			<a-spin :spinning="loading">
				<a-empty v-if="!records.length" description="暂无素材" class="material-empty" />
				<a-row v-else :gutter="[16, 16]">
					<a-col v-for="record in records" :key="record.id" :xs="24" :sm="12" :md="8" :lg="6" :xl="6">
						<div class="material-card" :class="{ selected: isSelected(record) }" @click="toggleSelect(record)">
							<div class="material-cover">
								<img
									v-if="record.category === 'IMAGE' && record.thumbnail"
									:src="record.thumbnail"
									class="material-thumb"
								/>
								<div v-else class="material-placeholder">
									<component :is="iconOf(record)" class="material-icon" />
									<span v-if="record.category === 'VIDEO'" class="material-placeholder-tip">视频</span>
									<span v-else-if="record.category === 'AUDIO'" class="material-placeholder-tip">音频</span>
								</div>
								<a-checkbox
									class="material-check"
									:checked="isSelected(record)"
									@click.stop
									@change="toggleSelect(record)"
								/>
							</div>
							<div class="material-info">
								<div class="material-name" :title="record.name">{{ record.name }}</div>
								<div class="material-meta">
									<span>{{ record.sizeInfo }}</span>
									<a-tag class="material-suffix">{{ (record.suffix || '').toUpperCase() }}</a-tag>
								</div>
								<div class="material-actions" @click.stop>
									<a v-if="canPreview(record)" @click="onPreview(record)">预览</a>
									<a-divider v-if="canPreview(record)" type="vertical" />
									<a @click="detailRef.onOpen(record)">详情</a>
									<a-divider type="vertical" />
									<a :href="record.downloadPath" target="_blank">下载</a>
									<a-divider type="vertical" />
									<a-popconfirm title="删除此素材？" @confirm="deleteFile(record)">
										<a class="material-danger">删除</a>
									</a-popconfirm>
								</div>
							</div>
						</div>
					</a-col>
				</a-row>
				<div class="material-pagination">
					<a-pagination
						v-model:current="pageData.current"
						v-model:page-size="pageData.size"
						:total="pageData.total"
						:page-size-options="['12', '24', '36']"
						show-size-changer
						show-total="(total) => `共 ${total} 条`"
						@change="fetchPage"
					/>
				</div>
			</a-spin>
		</xn-panel>
		<uploadForm ref="uploadFormRef" @successful="onUploadSuccess" />
		<detail ref="detailRef" />
		<!-- 预览文件下载中：挡住列表操作，显示进度，可取消 -->
		<div v-if="previewLoading" class="preview-loading-mask">
			<a-spin />
			<div class="preview-loading-name">正在加载：{{ previewLoadingName }}</div>
			<a-progress v-if="previewPercent !== null" :percent="previewPercent" class="preview-loading-progress" />
			<div class="preview-loading-size">{{ previewLoadedText }}</div>
			<a-button size="small" @click="cancelPreview">取消</a-button>
		</div>
		<!-- 视频/音频弹窗播放 -->
		<a-modal
			v-model:open="mediaVisible"
			:title="mediaTitle"
			:width="800"
			:footer="null"
			:destroy-on-close="true"
			@cancel="closeMedia"
		>
			<video v-if="mediaIsVideo" :src="mediaUrl" class="media-video" controls autoplay></video>
			<audio v-else :src="mediaUrl" controls class="media-audio"></audio>
		</a-modal>
	</div>
	<preview v-if="!indexShow" ref="previewRef" @goBack="previewBack" />
</template>

<script setup name="devFile">
	import fileApi from '@/api/dev/fileApi'
	import UploadForm from './uploadForm.vue'
	import Detail from './detail.vue'
	import Preview from './preview.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import {
		PictureOutlined,
		VideoCameraOutlined,
		CustomerServiceOutlined,
		FileTextOutlined,
		FileOutlined
	} from '@ant-design/icons-vue'
	import { message } from 'ant-design-vue'

	// 可在页面内预览的后缀（与预览组件能渲染的格式一致；doc、ppt 等旧格式组件不支持）
	const PREVIEW_SUFFIX_LIST = [
		...['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico'],
		...['pdf', 'docx', 'xls', 'xlsx', 'pptx'],
		...['txt', 'log', 'md', 'csv', 'json', 'xml', 'yml', 'yaml']
	]
	// 视频/音频后缀，预览走播放器弹窗
	const VIDEO_SUFFIX_LIST = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'ogv', 'm4v', 'wmv', '3gp', 'mpg', 'mpeg', 'ts']
	const AUDIO_SUFFIX_LIST = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus']
	// Office 类后缀，渲染开销大，单独限制大小
	const PREVIEW_OFFICE_SUFFIX_LIST = ['docx', 'xls', 'xlsx']
	// 预览大小上限（字节）：Office 20MB，其他 50MB，授权播放的媒体 100MB
	const PREVIEW_OFFICE_MAX_SIZE = 20 * 1024 * 1024
	const PREVIEW_MAX_SIZE = 50 * 1024 * 1024
	const MEDIA_MAX_SIZE = 100 * 1024 * 1024

	// 分类 Tab
	const categoryOptions = [
		{ label: '全部', value: '' },
		{ label: '视频', value: 'VIDEO' },
		{ label: '音频', value: 'AUDIO' },
		{ label: '图片', value: 'IMAGE' },
		{ label: '文档', value: 'DOC' },
		{ label: '其他', value: 'OTHER' }
	]

	const activeCategory = ref('')
	const searchKey = ref('')
	const loading = ref(false)
	const pageData = ref({ current: 1, size: 12, total: 0 })
	const records = ref([])
	const uploadFormRef = ref()
	const detailRef = ref()
	const previewRef = ref()
	const indexShow = ref(true)
	const selectedRowKeys = ref([])
	// 预览文件是否正在下载
	const previewLoading = ref(false)
	// 正在下载的预览文件名
	const previewLoadingName = ref('')
	// 预览文件已下载字节数
	const previewLoaded = ref(0)
	// 预览文件总字节数，取响应的文件大小，未知时为0
	const previewTotal = ref(0)
	// 取消当前预览请求的控制器
	let previewController = null
	// 下载百分比，总大小未知时不显示进度条
	const previewPercent = computed(() =>
		previewTotal.value ? Math.floor((previewLoaded.value / previewTotal.value) * 100) : null
	)
	// 字节数转为可读大小
	const formatBytes = (bytes) =>
		bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB'
	// 已下载大小文案
	const previewLoadedText = computed(() =>
		previewTotal.value
			? `${formatBytes(previewLoaded.value)} / ${formatBytes(previewTotal.value)}`
			: `已下载 ${formatBytes(previewLoaded.value)}`
	)
	// 媒体弹窗状态
	const mediaVisible = ref(false)
	const mediaTitle = ref('')
	const mediaUrl = ref('')
	const mediaIsVideo = ref(true)
	// 弹窗播放用的临时地址（授权文件 blob 生成），关闭时释放
	let mediaObjectUrl = ''

	// 卡片占位图标
	const iconOf = (record) => {
		switch (record.category) {
			case 'IMAGE':
				return PictureOutlined
			case 'VIDEO':
				return VideoCameraOutlined
			case 'AUDIO':
				return CustomerServiceOutlined
			case 'DOC':
				return FileTextOutlined
			default:
				return FileOutlined
		}
	}
	// 后缀是否视频/音频（兜底兼容历史数据分类为空的情况）
	const isVideoRecord = (record) => VIDEO_SUFFIX_LIST.includes((record.suffix || '').toLowerCase())
	const isAudioRecord = (record) => AUDIO_SUFFIX_LIST.includes((record.suffix || '').toLowerCase())
	const isMediaRecord = (record) =>
		record.category === 'VIDEO' || record.category === 'AUDIO' || isVideoRecord(record) || isAudioRecord(record)
	// 是否显示预览入口：媒体可播，其余按预览组件支持的格式
	const canPreview = (record) => {
		return isMediaRecord(record) || PREVIEW_SUFFIX_LIST.includes((record.suffix || '').toLowerCase())
	}
	// 选中状态
	const isSelected = (record) => selectedRowKeys.value.includes(record.id)
	const toggleSelect = (record) => {
		const index = selectedRowKeys.value.indexOf(record.id)
		if (index > -1) {
			selectedRowKeys.value.splice(index, 1)
		} else {
			selectedRowKeys.value.push(record.id)
		}
	}

	// 分页查询素材
	const fetchPage = () => {
		loading.value = true
		fileApi
			.filePage({
				current: pageData.value.current,
				size: pageData.value.size,
				category: activeCategory.value || undefined,
				searchKey: searchKey.value || undefined
			})
			.then((data) => {
				records.value = data.records || []
				pageData.value.total = Number(data.total || 0)
			})
			.finally(() => {
				loading.value = false
			})
	}
	// 切换分类回到第一页
	const onSearch = () => {
		pageData.value.current = 1
		fetchPage()
	}
	watch(activeCategory, onSearch)
	// 页大小变化时回到第一页
	watch(
		() => pageData.value.size,
		() => {
			pageData.value.current = 1
			fetchPage()
		}
	)
	// 上传成功刷新列表
	const onUploadSuccess = () => {
		fetchPage()
	}

	// 公开文件（带签名）把下载地址换成流式播放地址，视频音频可直接拖动进度
	const toStreamUrl = (downloadPath) => downloadPath.replace('/dev/file/download', '/public/file/stream')
	// 打开媒体弹窗
	const openMedia = (name, url, isVideo, objectUrl = '') => {
		mediaTitle.value = name
		mediaUrl.value = url
		mediaIsVideo.value = isVideo
		mediaObjectUrl = objectUrl
		mediaVisible.value = true
	}
	// 关闭媒体弹窗并释放临时地址
	const closeMedia = () => {
		if (mediaObjectUrl) {
			URL.revokeObjectURL(mediaObjectUrl)
			mediaObjectUrl = ''
		}
		mediaUrl.value = ''
	}

	// 预览：媒体走播放弹窗，其余先带进度下载文件内容再交给预览组件渲染
	const onPreview = (record) => {
		if (isMediaRecord(record)) {
			return previewMedia(record)
		}
		const suffix = (record.suffix || '').toLowerCase()
		const maxSize = PREVIEW_OFFICE_SUFFIX_LIST.includes(suffix) ? PREVIEW_OFFICE_MAX_SIZE : PREVIEW_MAX_SIZE
		// 超过预览大小上限的不在页面内渲染，避免浏览器卡顿（sizeKb 单位为KB）
		if (Number(record.sizeKb) * 1024 > maxSize) {
			message.warning('文件较大，请下载后查看')
			return
		}
		// 上一个预览还在加载时先取消，只显示最后点击的文件
		cancelPreview()
		const controller = new AbortController()
		previewController = controller
		previewLoadingName.value = record.name
		previewLoaded.value = 0
		previewTotal.value = 0
		previewLoading.value = true
		let finished = false
		// 大文件耗时长，不设超时，由用户自行取消
		fileApi
			.fileAuthDownload(
				{ id: record.id },
				{
					signal: controller.signal,
					timeout: 0,
					onDownloadProgress: (event) => {
						previewLoaded.value = event.loaded
						previewTotal.value = event.total || 0
					}
				}
			)
			.then((res) => {
				finished = true
				// 非200时拦截器已提示并返回空
				if (!res) return
				// 出错时后端以JSON返回错误信息，交给下载工具解析并提示
				if (res.data.type && res.data.type.includes('json')) {
					downloadUtil.resultDownload(res)
					return
				}
				indexShow.value = false
				nextTick(() => {
					previewRef.value.onOpen(record, res.data)
				})
			})
			.finally(() => {
				// 已被取消或被新预览替换的请求不再改动加载状态
				if (previewController !== controller) return
				previewController = null
				previewLoading.value = false
				// 网络中断等失败全局只记控制台，这里补一句提示
				if (!finished) {
					message.error('文件加载失败，请稍后重试')
				}
			})
	}
	// 媒体预览：公开文件直接流式播放；授权文件先下载成 blob 再播放
	const previewMedia = (record) => {
		const isVideo = isVideoRecord(record)
		// 公开文件带签名，直接用流式播放地址，支持 Range 拖动进度
		if (record.downloadPath && record.downloadPath.includes('sign=')) {
			openMedia(record.name, toStreamUrl(record.downloadPath), isVideo)
			return
		}
		// 授权文件需要带 token 下载，媒体过大时提示直接下载
		if (Number(record.sizeKb) * 1024 > MEDIA_MAX_SIZE) {
			message.warning('文件较大，请下载后查看')
			return
		}
		cancelPreview()
		const controller = new AbortController()
		previewController = controller
		previewLoadingName.value = record.name
		previewLoaded.value = 0
		previewTotal.value = 0
		previewLoading.value = true
		let finished = false
		fileApi
			.fileAuthDownload(
				{ id: record.id },
				{
					signal: controller.signal,
					timeout: 0,
					onDownloadProgress: (event) => {
						previewLoaded.value = event.loaded
						previewTotal.value = event.total || 0
					}
				}
			)
			.then((res) => {
				finished = true
				if (!res) return
				if (res.data.type && res.data.type.includes('json')) {
					downloadUtil.resultDownload(res)
					return
				}
				const objectUrl = URL.createObjectURL(res.data)
				openMedia(record.name, objectUrl, isVideo, objectUrl)
			})
			.finally(() => {
				if (previewController !== controller) return
				previewController = null
				previewLoading.value = false
				if (!finished) {
					message.error('文件加载失败，请稍后重试')
				}
			})
	}
	// 取消正在加载的预览
	const cancelPreview = () => {
		if (previewController) {
			previewController.abort()
			previewController = null
		}
		previewLoading.value = false
	}
	// 预览返回
	const previewBack = () => {
		indexShow.value = true
	}
	// 关闭页面时中止未完成的预览下载
	onBeforeUnmount(() => {
		cancelPreview()
		closeMedia()
	})
	// 删除
	const deleteFile = (record) => {
		fileApi
			.fileDelete([
				{
					id: record.id
				}
			])
			.then(() => {
				selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
				fetchPage()
			})
	}
	// 批量删除
	const deleteBatchFile = () => {
		fileApi.fileDelete(selectedRowKeys.value.map((id) => ({ id }))).then(() => {
			selectedRowKeys.value = []
			fetchPage()
		})
	}

	onMounted(fetchPage)
</script>

<style lang="less" scoped>
	.index-wrap {
		position: relative;
		height: 100%;
	}
	.preview-loading-mask {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.75);
	}
	.preview-loading-name {
		max-width: 60%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.preview-loading-progress {
		width: 320px;
	}
	.preview-loading-size {
		color: rgba(0, 0, 0, 0.45);
		font-size: 12px;
	}
	.material-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}
	.material-tabs {
		flex-shrink: 0;
	}
	.material-search {
		width: 240px;
	}
	.material-empty {
		padding: 60px 0;
	}
	.material-card {
		position: relative;
		border: 1px solid #f0f0f0;
		border-radius: 8px;
		overflow: hidden;
		cursor: pointer;
		transition:
			box-shadow 0.2s,
			border-color 0.2s;
		&:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
		}
		&.selected {
			border-color: #1677ff;
		}
	}
	.material-cover {
		position: relative;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fafafa;
	}
	.material-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.material-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		color: rgba(0, 0, 0, 0.35);
	}
	.material-icon {
		font-size: 40px;
	}
	.material-placeholder-tip {
		font-size: 12px;
	}
	.material-check {
		position: absolute;
		top: 8px;
		left: 8px;
	}
	.material-info {
		padding: 10px 12px;
	}
	.material-name {
		font-size: 13px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.material-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 6px;
		color: rgba(0, 0, 0, 0.45);
		font-size: 12px;
	}
	.material-suffix {
		margin-inline-end: 0;
	}
	.material-actions {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid #f5f5f5;
		font-size: 12px;
		a {
			color: #1677ff;
		}
	}
	.material-danger {
		color: #ff4d4f !important;
	}
	.material-pagination {
		margin-top: 16px;
		display: flex;
		justify-content: flex-end;
	}
	.media-video {
		width: 100%;
		max-height: 70vh;
		background: #000;
	}
	.media-audio {
		width: 100%;
	}
</style>
