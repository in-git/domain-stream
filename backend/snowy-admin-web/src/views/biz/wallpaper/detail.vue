<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="壁纸标题">
				{{ formData.title }}
			</a-descriptions-item>
			<a-descriptions-item label="分辨率">
				{{ formData.resolution }}
			</a-descriptions-item>
			<a-descriptions-item label="宽高比">
				{{ formData.aspectRatio }}
			</a-descriptions-item>
			<a-descriptions-item label="壁纸预览（缩略图）">
				<img v-if="formData.thumbnailUrl" :src="formData.thumbnailUrl" style="max-height: 160px; object-fit: contain; border-radius: 4px" />
				<span v-else>-</span>
			</a-descriptions-item>
			<a-descriptions-item label="高清原图">
				<img v-if="formData.imageUrl" :src="formData.imageUrl" style="max-width: 100%; object-fit: contain; border-radius: 4px" />
				<span v-else>-</span>
			</a-descriptions-item>
			<a-descriptions-item label="标签">
				{{ formData.tag }}
			</a-descriptions-item>
			<a-descriptions-item label="文件大小">
				{{ formData.fileSize }}
			</a-descriptions-item>
			<a-descriptions-item label="配色数组">
				{{ formData.colorPalette }}
			</a-descriptions-item>
			<a-descriptions-item label="适配设备数组(JSON)">
				{{ formData.deviceCompat }}
			</a-descriptions-item>
			<a-descriptions-item label="分类标签">
				{{ formData.categoryTag }}
			</a-descriptions-item>
			<a-descriptions-item label="下载次数">
				{{ formData.downloadsCount }}
			</a-descriptions-item>
			<a-descriptions-item label="点赞次数">
				{{ formData.likesCount }}
			</a-descriptions-item>
			<a-descriptions-item label="逻辑删除">
				{{ formData.deleteFlag }}
			</a-descriptions-item>
		</a-descriptions>
		<a-space style="margin-top: 16px">
			<a-button type="primary" @click="downloadWallpaper">
				<template #icon><download-outlined /></template>
				下载（计数+1）
			</a-button>
			<a-button @click="downloadFile(formData.imageUrl)">打开高清图</a-button>
		</a-space>
	</xn-form-container>
</template>

<script setup name="bizWallpaperDetail">
	import { cloneDeep } from 'lodash-es'
	import bizWallpaperApi from '@/api/biz/bizWallpaperApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉: 默认先用列表里的缩略图占位, 再调用公开详情接口拉取高清原图
	const onOpen = (record) => {
		open.value = true
		formData.value = {
			...record,
			imageUrl: ''
		}
		bizWallpaperApi.bizWallpaperPublicDetail({ id: record.id }).then((data) => {
			formData.value = data
		})
	}
	// 关闭抽屉
	const onClose = () => {
		formData.value = {}
		open.value = false
	}
	// 下载文件
	const downloadFile = (url) => {
		if (url) {
			window.open(url)
		}
	}
	// 下载并计数: 调用公开接口使 downloadsCount +1
	const downloadWallpaper = () => {
		if (!formData.value.id) {
			return
		}
		bizWallpaperApi.bizWallpaperPublicDownload({ id: formData.value.id }).then(() => {
			formData.value.downloadsCount = (formData.value.downloadsCount || 0) + 1
		})
	}
	// 抛出函数
	defineExpose({
		onOpen
	})
</script>
