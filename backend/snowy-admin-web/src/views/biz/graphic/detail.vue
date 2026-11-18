<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="标题">
				{{ formData.title }}
			</a-descriptions-item>
			<a-descriptions-item label="封面图">
				{{ formData.cover }}
			</a-descriptions-item>
			<a-descriptions-item label="图片列表，JSON数组">
				{{ formData.images }}
			</a-descriptions-item>
			<a-descriptions-item label="摘要">
				{{ formData.summary }}
			</a-descriptions-item>
			<a-descriptions-item label="图文内容">
				{{ formData.content }}
			</a-descriptions-item>
			<a-descriptions-item label="分类编码，关联 BIZ_CATEGORY.CODE">
				{{ formData.category }}
			</a-descriptions-item>
			<a-descriptions-item label="标签，多个以逗号分隔">
				{{ formData.tags }}
			</a-descriptions-item>
			<a-descriptions-item label="状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架">
				{{ formData.status }}
			</a-descriptions-item>
			<a-descriptions-item label="发布时间">
				{{ formData.publishTime }}
			</a-descriptions-item>
			<a-descriptions-item label="浏览量">
				{{ formData.viewCount }}
			</a-descriptions-item>
			<a-descriptions-item label="点赞量">
				{{ formData.likeCount }}
			</a-descriptions-item>
			<a-descriptions-item label="评论量">
				{{ formData.commentCount }}
			</a-descriptions-item>
			<a-descriptions-item label="是否置顶：Y是/N否">
				{{ formData.isTop }}
			</a-descriptions-item>
			<a-descriptions-item label="是否推荐：Y是/N否">
				{{ formData.isRecommend }}
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

<script setup name="bizGraphicDetail">
	import { cloneDeep } from 'lodash-es'
	import bizGraphicApi from '@/api/biz/bizGraphicApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		bizGraphicApi.bizGraphicDetail({ id: record.id }).then((data) => {
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
