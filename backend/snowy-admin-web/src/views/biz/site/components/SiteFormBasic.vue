<template>
	<div class="site-form-basic flex flex-col gap-4">
		<!-- 基本信息 -->
		<div class="space-y-3">
			<!-- 多图候选 -->
			<div v-if="false" class="flex gap-2 overflow-x-auto pb-1">
				<button
					v-for="(it, i) in LOGO_CANDIDATES"
					:key="i"
					class="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[#E5E5EA]"
					@click="props.formData.logo = it.url"
				>
					<img :src="it.url" class="h-full w-full object-cover" />
				</button>
			</div>

			<!-- 名称 -->
			<div>
				<label class="mb-1 block font-medium">
					网页名称 <span class="text-red-500">*</span>
				</label>
				<a-input
					v-model:value="props.formData.name"
					placeholder="请输入网页名称"
					:status="errors.name ? 'error' : ''"
				/>
				<div v-if="errors.name" class="mt-1 text-red-500">{{ errors.name }}</div>
			</div>

			<!-- 链接 + 一键获取 -->
			<div>
				<label class="mb-1 block font-medium">
					链接地址 <span class="text-red-500">*</span>
				</label>
				<div class="flex items-center gap-2">
					<a-auto-complete
						v-model:value="props.formData.link"
						:options="linkSuggestions"
						placeholder="https://"
						class="flex-1"
						:status="errors.link ? 'error' : ''"
						@change="onLinkChange"
					/>
					<a-button :loading="fetching" @click="handleFetch">
						<template #icon><ThunderboltOutlined /></template>
						一键获取
					</a-button>
				</div>
				<div v-if="errors.link" class="mt-1 text-red-500">{{ errors.link }}</div>
			</div>

			<!-- 描述 -->
			<div>
				<label class="mb-1 block font-medium">
					描述 <span class="text-red-500">*</span>
				</label>
				<a-textarea
					v-model:value="props.formData.des"
					placeholder="请输入描述"
					:auto-size="{ minRows: 2, maxRows: 4 }"
					:status="errors.des ? 'error' : ''"
				/>
				<div v-if="errors.des" class="mt-1 text-red-500">{{ errors.des }}</div>
			</div>

			<!-- 分类 -->
			<div>
				<label class="mb-1 block font-medium">
					分类 <span class="text-red-500">*</span>
				</label>
				<site-category-select
					v-model:value="props.formData.categoryIds"
					placeholder="请选择分类"
					:class="errors.categoryIds ? 'xn-ct-error' : ''"
				/>
				<div v-if="errors.categoryIds" class="mt-1 text-red-500">{{ errors.categoryIds }}</div>
			</div>

			<!-- 终端类型 -->
			<div>
				<label class="mb-1 block font-medium">
					终端类型 <span class="text-red-500">*</span>
				</label>
				<a-select
					v-model:value="props.formData.device"
					:options="DEVICE_OPTIONS"
					class="w-full"
					placeholder="请选择终端类型"
					:status="errors.device ? 'error' : ''"
				/>
				<div v-if="errors.device" class="mt-1 text-red-500">{{ errors.device }}</div>
			</div>

			<!-- 信号值 -->
			<div>
				<label class="mb-1 block font-medium">
					信号值 <span class="text-red-500">*</span>
				</label>
				<a-radio-group
					v-model:value="props.formData.signal"
					:options="SIGNAL_OPTIONS"
					:status="errors.signal ? 'error' : ''"
				/>
				<div v-if="errors.signal" class="mt-1 text-red-500">{{ errors.signal }}</div>
			</div>

			<!-- 排序档位 -->
			<div>
				<label class="mb-1 block font-medium">排序</label>
				<a-select
					v-model:value="props.formData.orderNum"
					:options="SORT_OPTIONS"
					class="w-full"
					placeholder="请选择排序档位"
				/>
			</div>

			<!-- 精选推荐 -->
			<div>
				<label class="mb-1 block font-medium">精选推荐</label>
				<a-radio-group v-model:value="props.formData.isRecommend">
					<a-radio value="Y">是</a-radio>
					<a-radio value="N">否</a-radio>
				</a-radio-group>
			</div>

			<!-- 背景色 -->
			<div>
				<label class="mb-1 block font-medium">卡片背景色</label>
				<div class="flex items-center gap-2">
					<input
						v-model="props.formData.background"
						type="color"
						class="h-8 w-10 cursor-pointer rounded border border-[#E5E5EA]"
					/>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="c in APPLE_COLORS"
							:key="c"
							class="h-8 w-8 rounded-full border border-[#E5E5EA]"
							:style="c === 'transparent' ? transparentBgStyle : { backgroundColor: c }"
							@click="props.formData.background = c"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { message } from 'ant-design-vue'
	import { ThunderboltOutlined } from '@ant-design/icons-vue'
	import { getApiBaseUrl } from '@/utils/request'
	import bizSitePublicApi from '@/api/biz/bizSitePublicApi'
	import SiteCategorySelect from './SiteCategorySelect.vue'

	const props = defineProps({
		formData: { type: Object, required: true },
		errors: { type: Object, required: true },
		categoryTree: { type: Array, default: () => [] },
		activeTab: { type: String, default: 'basic' },
	})
	const emit = defineEmits(['update:activeTab', 'clearPending'])

	// 终端类型：仅PC / 仅移动端 / 兼容
	const DEVICE_OPTIONS = [
		{ label: '仅PC', value: 'PC' },
		{ label: '仅移动端', value: 'MOBILE' },
		{ label: '兼容', value: 'COMPATIBLE' },
	]

	// 信号值：1-5
	const SIGNAL_OPTIONS = [
		{ label: '1', value: 1 },
		{ label: '2', value: 2 },
		{ label: '3', value: 3 },
		{ label: '4', value: 4 },
		{ label: '5', value: 5 },
	]

	// 排序档位：高/中/低/默认，对应值 1/10/100/200
	const SORT_OPTIONS = [
		{ label: '高', value: 1 },
		{ label: '中', value: 10 },
		{ label: '低', value: 100 },
		{ label: '默认', value: 200 }
	]

	// ---------- 常量（照抄 tsx） ----------
	const LOGO_CANDIDATES = [
		{ name: 'Apple HIG', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Code Dev', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&auto=format&fit=crop&q=80' },
		{ name: 'UI Design', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Analytics', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Gradient Art', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Abstract Blue', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Minimal', url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Neon', url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Geometric', url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Dark Mode', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Workspace', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=120&auto=format&fit=crop&q=80' },
		{ name: 'Data', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&auto=format&fit=crop&q=80' },
	]

	const APPLE_COLORS = [
		'#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF3B30', '#FF9500',
		'#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#8E8E93', '#1D1D1F', '#FFFFFF',
		'transparent',
	]

	// 透明色的棋盘格背景样式，便于用户识别"透明"选项
	const transparentBgStyle = {
		backgroundImage:
			'linear-gradient(45deg, #E5E5EA 25%, transparent 25%), linear-gradient(-45deg, #E5E5EA 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #E5E5EA 75%), linear-gradient(-45deg, transparent 75%, #E5E5EA 75%)',
		backgroundSize: '8px 8px',
		backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
		backgroundColor: '#FFFFFF'
	}

	const linkSuggestions = computed(() => [
		{ value: 'https://' },
		{ value: 'http://' },
		{ value: 'https://www.' },
	])

	// ---------- 工具函数 ----------
	const withBase = (value) => (value && value.startsWith('/') ? getApiBaseUrl() + value : value || '')

	// favicon 服务：根据站点域名生成默认图标
	const FAVICON_BASE = 'https://ad5b2b34e29aea588.app.workbuddy.link'
	const FAVICON_API = `${FAVICON_BASE}/api/favicon`
	// link 为空/无效时的兜底默认值
	const FAVICON_DEFAULT_URL = `${FAVICON_API}?url=api.suyanw.cn`

	// 从 link 中提取域名生成 favicon URL；无法解析时返回兜底默认值
	const getDefaultFavicon = (link = '') => {
		const trimmed = (link || '').trim()
		if (!trimmed || trimmed === 'https://') return FAVICON_DEFAULT_URL
		let host = ''
		try {
			host = new URL(trimmed).hostname
		} catch {
			host = trimmed.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
		}
		if (!host) return FAVICON_DEFAULT_URL
		return `${FAVICON_API}?url=${host}`
	}

	// link 变化时：若 LOGO 仍为默认图标（用户未手动设置），自动按域名生成 favicon
	const onLinkChange = () => {
		if (!props.formData.logo || props.formData.logo === FAVICON_DEFAULT_URL) {
			props.formData.logo = getDefaultFavicon(props.formData.link)
		}
	}

	// ---------- 一键获取 ----------
	const fetching = ref(false)
	const handleFetch = async () => {
		const link = (props.formData.link || '').trim()
		if (!link || link === 'https://') {
			props.errors.link = '请先填写网页链接'
			return
		}
		fetching.value = true
		try {
			const data = await bizSitePublicApi.bizSitePublicFetch({ link })
			if (data?.name) props.formData.name = data.name
			if (data?.des) props.formData.des = data.des
			if (data?.cover) props.formData.cover = withBase(data.cover)
			// LOGO：后端未返回时默认用 favicon 服务按域名生成
			props.formData.logo = data?.logo ? withBase(data.logo) : getDefaultFavicon(link)
		} catch (e) {
			message.error(e?.msg || e?.message || '获取网页信息失败')
		} finally {
			fetching.value = false
		}
	}

	// tab 切换采用 v-model:activeTab 双向绑定
	const activeTab = computed({
		get: () => props.activeTab,
		set: (v) => emit('update:activeTab', v),
	})
</script>

<style scoped>
	.site-form-basic {
		min-height: 0;
	}
	/* 控件整体调大（large 尺寸） */
	.site-form-basic :deep(.ant-input),
	.site-form-basic :deep(.ant-input-number),
	.site-form-basic :deep(.ant-input-affix-wrapper),
	.site-form-basic :deep(.ant-select-selector) {
		min-height: 40px;
		font-size: 15px;
	}
	.site-form-basic :deep(.ant-select-selector) {
		display: flex;
		align-items: center;
	}
	.site-form-basic :deep(.ant-input-number) {
		width: 100%;
	}
	.site-form-basic :deep(textarea.ant-input) {
		min-height: 88px;
		padding: 8px 11px;
	}
	/* 分类选择校验失败时的边框高亮 */
	.site-form-basic :deep(.xn-ct-error .xn-ct-trigger) {
		border-color: #ff4d4f;
	}
	.site-form-basic :deep(.xn-ct-error .xn-ct-trigger:hover) {
		border-color: #ff7875;
	}
</style>
