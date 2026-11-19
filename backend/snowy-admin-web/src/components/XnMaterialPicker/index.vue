<template>
	<a-modal
		:open="open"
		:title="title"
		:width="900"
		:destroy-on-close="true"
		:mask-closable="false"
		@cancel="onCancel"
		@ok="onOk"
	>
		<div class="picker-toolbar">
			<a-radio-group v-if="showCategoryTabs" v-model:value="activeCategory" size="small" button-style="solid">
				<a-radio-button v-for="item in visibleCategoryOptions" :key="item.value" :value="item.value">
					{{ item.label }}
				</a-radio-button>
			</a-radio-group>
			<a-input-search
				v-model:value="searchKey"
				size="small"
				placeholder="搜索素材名称"
				class="picker-search"
				allow-clear
				@search="onSearch"
			/>
			<a-upload :accept="uploadAccept" :show-upload-list="false" :custom-request="customRequest">
				<a-button size="small" type="primary" :loading="uploading">
					<UploadOutlined />
					上传
				</a-button>
			</a-upload>
		</div>
		<a-spin :spinning="loading">
			<a-empty v-if="!records.length" description="暂无素材" class="picker-empty" />
			<a-row v-else :gutter="[12, 12]" class="picker-grid">
				<a-col v-for="record in records" :key="record.id" :span="6">
					<div class="picker-card" :class="{ selected: isSelected(record) }" @click="toggleSelect(record)">
						<div class="picker-cover">
							<img
								v-if="record.category === 'IMAGE' && record.thumbnail"
								:src="record.thumbnail"
								class="picker-thumb"
							/>
							<div v-else class="picker-placeholder">
								<component :is="iconOf(record)" class="picker-icon" />
							</div>
							<CheckCircleFilled v-if="isSelected(record)" class="picker-check" />
						</div>
						<div class="picker-name" :title="record.name">{{ record.name }}</div>
					</div>
				</a-col>
			</a-row>
			<div class="picker-pagination">
				<a-pagination
					v-model:current="pageData.current"
					:page-size="pageData.size"
					:total="pageData.total"
					size="small"
					show-total="(total) => `共 ${total} 条`"
					@change="fetchPage"
				/>
			</div>
		</a-spin>
		<template #footer>
			<div class="picker-footer">
				<span class="picker-selected-tip"
					>已选 {{ selectedRecords.length }}{{ maxCount ? ` / ${maxCount}` : '' }} 个素材</span
				>
				<a-space>
					<a-button @click="onCancel">取消</a-button>
					<a-button type="primary" :disabled="!selectedRecords.length" @click="onOk">确定</a-button>
				</a-space>
			</div>
		</template>
	</a-modal>
</template>

<script setup name="XnMaterialPicker">
	import fileApi from '@/api/dev/fileApi'
	import {
		PictureOutlined,
		VideoCameraOutlined,
		CustomerServiceOutlined,
		FileTextOutlined,
		FileOutlined,
		UploadOutlined
	} from '@ant-design/icons-vue'
	import { message } from 'ant-design-vue'

	const props = defineProps({
		// 弹窗显示，v-model:open
		open: {
			type: Boolean,
			default: false,
			required: false
		},
		// 弹窗标题
		title: {
			type: String,
			default: '选择素材',
			required: false
		},
		// 限制可选的素材分类（IMAGE/VIDEO/AUDIO/DOC/OTHER），为空时全部可选
		accept: {
			type: Array,
			default: () => [],
			required: false
		},
		// 是否多选，单选时再次点击其他卡片会替换选中
		multiple: {
			type: Boolean,
			default: true,
			required: false
		},
		// 最多可选数量，0 不限制
		maxCount: {
			type: Number,
			default: 0,
			required: false
		}
	})
	const emit = defineEmits(['update:open', 'success'])

	// 全部分类选项
	const allCategoryOptions = [
		{ label: '全部', value: '' },
		{ label: '视频', value: 'VIDEO' },
		{ label: '音频', value: 'AUDIO' },
		{ label: '图片', value: 'IMAGE' },
		{ label: '文档', value: 'DOC' },
		{ label: '其他', value: 'OTHER' }
	]
	// 分类与上传 accept 的映射
	const ACCEPT_TYPE_MAP = {
		IMAGE: 'image/*',
		VIDEO: 'video/*',
		AUDIO: 'audio/*'
	}

	// 受限时只显示对应分类 Tab，不限制时显示全部（含"全部"）
	const visibleCategoryOptions = computed(() => {
		if (!props.accept.length) return allCategoryOptions
		return allCategoryOptions.filter((item) => !item.value || props.accept.includes(item.value))
	})
	const showCategoryTabs = computed(() => visibleCategoryOptions.value.length > 1)

	const activeCategory = ref(props.accept.length === 1 ? props.accept[0] : '')
	const searchKey = ref('')
	const loading = ref(false)
	const uploading = ref(false)
	const pageData = ref({ current: 1, size: 12, total: 0 })
	const records = ref([])
	// 已选记录完整信息，确认后回传给调用方
	const selectedRecords = ref([])
	// 上传文件类型限制，按分类映射拼接
	const uploadAccept = computed(() =>
		props.accept.length
			? props.accept
					.map((item) => ACCEPT_TYPE_MAP[item])
					.filter(Boolean)
					.join(',')
			: undefined
	)

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
	const isSelected = (record) => selectedRecords.value.some((item) => item.id === record.id)
	const toggleSelect = (record) => {
		if (isSelected(record)) {
			selectedRecords.value = selectedRecords.value.filter((item) => item.id !== record.id)
			return
		}
		// 单选时替换，多选时达到上限则提示
		if (!props.multiple) {
			selectedRecords.value = [record]
			return
		}
		if (props.maxCount && selectedRecords.value.length >= props.maxCount) {
			message.warning(`最多选择 ${props.maxCount} 个素材`)
			return
		}
		selectedRecords.value.push(record)
	}

	// 分页查询素材，当前分类在限制范围内才作为过滤条件
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
	const onSearch = () => {
		pageData.value.current = 1
		fetchPage()
	}
	watch(activeCategory, onSearch)
	// 打开时加载，关闭时清空选择
	watch(
		() => props.open,
		(open) => {
			if (open) {
				pageData.value.current = 1
				fetchPage()
			} else {
				selectedRecords.value = []
			}
		}
	)

	// 上传：返回id后取详情入列表，按当前分类过滤条件刷新
	const customRequest = (data) => {
		uploading.value = true
		const fileData = new FormData()
		fileData.append('file', data.file)
		fileApi
			.fileUploadDynamicReturnId(fileData)
			.then((fileId) => fileApi.fileDetail({ id: fileId }))
			.then((detail) => {
				// 上传后不在当前筛选范围时切回能看到的分类，避免用户以为没传上
				if (props.accept.length && !props.accept.includes(detail.category)) {
					message.warning(`已上传，但素材分类为「${detail.category}」，不在当前可选范围内`)
				}
				message.success('上传成功')
				onSearch()
			})
			.finally(() => {
				uploading.value = false
			})
	}

	// 确定选择，回传选中的完整文件记录（含id、downloadPath、thumbnail等）
	const onOk = () => {
		emit('success', [...selectedRecords.value])
		emit('update:open', false)
	}
	const onCancel = () => {
		emit('update:open', false)
	}
</script>

<style lang="less" scoped>
	.picker-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.picker-search {
		width: 200px;
	}
	.picker-grid {
		min-height: 200px;
	}
	.picker-empty {
		padding: 40px 0;
	}
	.picker-card {
		border: 1px solid #f0f0f0;
		border-radius: 6px;
		padding: 8px;
		cursor: pointer;
		transition: border-color 0.2s;
		&:hover {
			border-color: #d9d9d9;
		}
		&.selected {
			border-color: #1677ff;
		}
	}
	.picker-cover {
		position: relative;
		height: 90px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fafafa;
		border-radius: 4px;
		overflow: hidden;
	}
	.picker-thumb {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.picker-placeholder {
		color: rgba(0, 0, 0, 0.3);
	}
	.picker-icon {
		font-size: 28px;
	}
	.picker-check {
		position: absolute;
		top: 4px;
		right: 4px;
		font-size: 16px;
		color: #1677ff;
	}
	.picker-name {
		margin-top: 6px;
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.picker-pagination {
		margin-top: 12px;
		display: flex;
		justify-content: flex-end;
	}
	.picker-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.picker-selected-tip {
		color: rgba(0, 0, 0, 0.45);
		font-size: 12px;
	}
</style>
