<template>
	<div class="site-form-cover flex flex-col gap-4">
		<!-- 1. Live Card Preview -->
		<div>
			<div class="mb-2 font-semibold uppercase tracking-wider text-[#86868B]">
				1. 实时卡片渲染预览
			</div>
			<div class="apple-shadow overflow-hidden rounded-[12px] border border-[#E5E5EA] bg-white">
				<div
					class="relative flex items-center justify-center overflow-hidden"
					:style="{ backgroundColor: formData.background || 'transparent' }"
					>
					<img
						v-if="coverDisplaySrc"
						:src="coverDisplaySrc"
						alt="Cover"
						class="h-full w-full object-cover aspect-[16/9]"
					/>
					<span v-else class="text-[20px] font-bold text-white">
						{{ (formData.name || 'W').charAt(0) }}
					</span>
					<span
						v-if="formData.isRecommend === 'Y'"
						class="absolute right-2 top-2 rounded-full bg-[#FF9500] px-2 py-0.5 font-semibold text-white shadow"
					>
						精选推荐
					</span>
				</div>
				<div class="p-3">
					<div class="mb-1 flex items-center gap-2">
						<div
							v-if="logoDisplaySrc"
							class="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-[#E5E5EA]"
							:style="{ backgroundColor: formData.background || 'transparent' }"
							>
							<img :src="logoDisplaySrc" alt="logo" class="h-full w-full object-cover" />
						</div>
						<div
							v-else
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded font-bold text-white"
							:style="{ backgroundColor: formData.background || 'transparent' }"
							>
							{{ (formData.name || 'W').charAt(0) }}
						</div>
						<h4 class="truncate font-bold text-[#1D1D1F]">
							{{ formData.name || '网页标题名称' }}
						</h4>
					</div>
					<div class="mb-2 truncate font-mono text-[#86868B]">
						{{ formData.link }}
					</div>
					<p class="line-clamp-2 min-h-[32px] text-[#6E6E73]">
						{{ formData.des || '在此处查看添加的描述文字...' }}
					</p>
				</div>
			</div>
		</div>

		<!-- 2. iframe Live Web Preview -->
		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<span class="font-semibold uppercase tracking-wider text-[#86868B]">
					2. iframe 内置网页预览区域
				</span>
				<a
					v-if="formData.link && formData.link.startsWith('http')"
					:href="formData.link"
					target="_blank"
					rel="noreferrer"
					class="flex items-center gap-1 text-[#007AFF] hover:underline"
				>
					<span>新窗口测试</span>
					<ExportOutlined />
				</a>
			</div>
			<div class="apple-shadow relative flex h-48 flex-col overflow-hidden rounded-[12px] border border-[#E5E5EA] bg-white sm:h-52">
				<iframe
					v-if="formData.link && formData.link !== 'https://'"
					:src="formData.link"
					title="Modal Web Live Preview"
					class="h-full w-full border-none"
					sandbox="allow-scripts allow-same-origin"
					@error="onIframeError"
				></iframe>
				<div
					v-else
					class="flex flex-1 flex-col items-center justify-center bg-[#F5F5F7] p-4 text-center text-[#86868B]"
				>
					<GlobalOutlined class="mb-1 text-[#007AFF]/40" />
					<span>请输入有效 URL 以激活内置 iframe 网页预览</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref, computed } from 'vue'
	import { GlobalOutlined } from '@ant-design/icons-vue'

	const props = defineProps({
		formData: { type: Object, required: true },
		errors: { type: Object, required: true },
		pendingCover: { type: String, default: '' },
		pendingLogo: { type: String, default: '' },
	})
	const emit = defineEmits(['clearPending', 'convertRemote'])

	const iframeError = ref(false)

	const onIframeError = () => {
		iframeError.value = true
	}

	// logo 显示源：优先使用裁剪暂存（pendingLogo），其次 formData.logo，附加时间戳避免浏览器缓存导致图片不刷新
	const logoVersion = ref(0)
	const logoDisplaySrc = computed(() => {
		const logo = props.pendingLogo || props.formData.logo || ''
		if (!logo) return ''
		if (logo.startsWith('data:')) return logo
		const sep = logo.includes('?') ? '&' : '?'
		return `${logo}${sep}v=${logoVersion.value}`
	})

	// 封面显示源：优先使用裁剪暂存
	const coverDisplaySrc = computed(() => props.pendingCover || props.formData.cover || '')

	defineExpose({ iframeError })
</script>

<style scoped>
	.site-form-cover {
		min-height: 0;
	}
</style>
