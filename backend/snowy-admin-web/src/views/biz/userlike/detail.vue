<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="点赞用户ID，关联 CLIENT_USER.ID">
				{{ formData.userId }}
			</a-descriptions-item>
			<a-descriptions-item label="目标内容ID">
				{{ formData.targetId }}
			</a-descriptions-item>
			<a-descriptions-item label="目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频">
				{{ formData.targetType }}
			</a-descriptions-item>
			<a-descriptions-item label="喜欢状态：LIKED-已喜欢，UNLIKED-已取消">
				{{ formData.status }}
			</a-descriptions-item>
			<a-descriptions-item label="首次喜欢时间">
				{{ formData.likeTime }}
			</a-descriptions-item>
			<a-descriptions-item label="备注">
				{{ formData.remark }}
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

<script setup name="bizUserLikeDetail">
	import { cloneDeep } from 'lodash-es'
	import bizUserLikeApi from '@/api/biz/bizUserLikeApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		bizUserLikeApi.bizUserLikeDetail({ id: record.id }).then((data) => {
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
