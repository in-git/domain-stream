<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="文件类型">
				{{ formData.fileType }}
			</a-descriptions-item>
			<a-descriptions-item label="文件夹名称">
				{{ formData.name }}
			</a-descriptions-item>
			<a-descriptions-item label="类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享">
				{{ formData.type }}
			</a-descriptions-item>
			<a-descriptions-item label="拥有者用户id">
				{{ formData.ownerId }}
			</a-descriptions-item>
			<a-descriptions-item label="排序码">
				{{ formData.sortCode }}
			</a-descriptions-item>
			<a-descriptions-item label="是否为文件夹（Y 是 / N 否）">
				{{ formData.isFolder }}
			</a-descriptions-item>
			<a-descriptions-item label="是否已放入回收站（Y 是 / N 否）">
				{{ formData.isRecycled }}
			</a-descriptions-item>
			<a-descriptions-item label="逻辑删除">
				{{ formData.deleteFlag }}
			</a-descriptions-item>
		</a-descriptions>
	</xn-form-container>
</template>

<script setup name="devFileFolderDetail">
	import { cloneDeep } from 'lodash-es'
	import devFileFolderApi from '@/api/biz/devFileFolderApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		devFileFolderApi.devFileFolderDetail({ id: record.id }).then((data) => {
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
		window.open(url)
	}
	// 抛出函数
	defineExpose({
		onOpen
	})
</script>
