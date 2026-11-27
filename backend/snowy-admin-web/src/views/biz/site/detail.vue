<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="网页名称">
				{{ formData.name }}
			</a-descriptions-item>
			<a-descriptions-item label="LOGO">
				{{ formData.logo }}
			</a-descriptions-item>
			<a-descriptions-item label="描述">
				{{ formData.des }}
			</a-descriptions-item>
			<a-descriptions-item label="链接">
				{{ formData.link }}
			</a-descriptions-item>
			<a-descriptions-item label="点击量">
				{{ formData.count }}
			</a-descriptions-item>
			<a-descriptions-item label="是否可见(Y|N)">
				{{ formData.visible }}
			</a-descriptions-item>
			<a-descriptions-item label="背景颜色">
				{{ formData.background }}
			</a-descriptions-item>
			<a-descriptions-item label="删除标志">
				{{ formData.deleteFlag }}
			</a-descriptions-item>
			<a-descriptions-item label="是否推荐(Y|N)">
				{{ formData.isRecommend }}
			</a-descriptions-item>
			<a-descriptions-item label="封面">
				{{ formData.cover }}
			</a-descriptions-item>
			<a-descriptions-item label="排序号">
				{{ formData.orderNum }}
			</a-descriptions-item>
			<a-descriptions-item label="终端类型">
				{{ DEVICE_LABEL[formData.device] || formData.device }}
			</a-descriptions-item>
			<a-descriptions-item label="信号值">
				{{ formData.signal }}
			</a-descriptions-item>
			<a-descriptions-item label="创建时间">
				{{ formData.createTime }}
			</a-descriptions-item>
			<a-descriptions-item label="更新时间">
				{{ formData.updateTime }}
			</a-descriptions-item>
			<a-descriptions-item label="创建的用户">
				{{ formData.createUser }}
			</a-descriptions-item>
		</a-descriptions>
	</xn-form-container>
</template>

<script setup name="bizSiteDetail">
	import { cloneDeep } from 'lodash-es'
	import bizSiteApi from '@/api/biz/bizSiteApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})
	// 终端类型标签映射
	const DEVICE_LABEL = {
		PC: '仅PC',
		MOBILE: '仅移动端',
		COMPATIBLE: '兼容'
	}

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		bizSiteApi.bizSiteDetail({ id: record.id }).then((data) => {
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
