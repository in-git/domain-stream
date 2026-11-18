<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="父级ID，顶级为0">
				{{ formData.parentId }}
			</a-descriptions-item>
			<a-descriptions-item label="分类名称">
				{{ formData.name }}
			</a-descriptions-item>
			<a-descriptions-item label="分类编码，业务表CATEGORY字段关联此编码">
				{{ formData.code }}
			</a-descriptions-item>
			<a-descriptions-item label="分类图片">
				{{ formData.image }}
			</a-descriptions-item>
			<a-descriptions-item label="分类图标">
				{{ formData.icon }}
			</a-descriptions-item>
			<a-descriptions-item label="适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用">
				{{ formData.module }}
			</a-descriptions-item>
			<a-descriptions-item label="分类描述">
				{{ formData.description }}
			</a-descriptions-item>
			<a-descriptions-item label="状态：ENABLE启用/DISABLE禁用">
				{{ formData.status }}
			</a-descriptions-item>
			<a-descriptions-item label="排序">
				{{ formData.sortCode }}
			</a-descriptions-item>
			<a-descriptions-item label="备注">
				{{ formData.remark }}
			</a-descriptions-item>
			<a-descriptions-item label="扩展信息">
				{{ formData.extJson }}
			</a-descriptions-item>
			<a-descriptions-item label="删除标志：NOT_DELETE正常/DELETED删除">
				{{ formData.deleteFlag }}
			</a-descriptions-item>
			<a-descriptions-item label="创建时间">
				{{ formData.createTime }}
			</a-descriptions-item>
			<a-descriptions-item label="创建用户">
				{{ formData.createUser }}
			</a-descriptions-item>
			<a-descriptions-item label="更新时间">
				{{ formData.updateTime }}
			</a-descriptions-item>
			<a-descriptions-item label="更新用户">
				{{ formData.updateUser }}
			</a-descriptions-item>
		</a-descriptions>
	</xn-form-container>
</template>

<script setup name="bizCategoryDetail">
	import { cloneDeep } from 'lodash-es'
	import bizCategoryApi from '@/api/biz/bizCategoryApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		bizCategoryApi.bizCategoryDetail({ id: record.id }).then((data) => {
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
