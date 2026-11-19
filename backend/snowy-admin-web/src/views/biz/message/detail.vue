<template>
	<xn-form-container
		title="详情"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-descriptions :column="1" bordered size="small">
			<a-descriptions-item label="留言人昵称">
				{{ formData.nickname }}
			</a-descriptions-item>
			<a-descriptions-item label="留言人头像">
				{{ formData.avatar }}
			</a-descriptions-item>
			<a-descriptions-item label="邮箱">
				{{ formData.email }}
			</a-descriptions-item>
			<a-descriptions-item label="联系电话">
				{{ formData.phone }}
			</a-descriptions-item>
			<a-descriptions-item label="留言内容">
				{{ formData.content }}
			</a-descriptions-item>
			<a-descriptions-item label="状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝">
				{{ formData.status }}
			</a-descriptions-item>
			<a-descriptions-item label="管理员回复内容">
				{{ formData.reply }}
			</a-descriptions-item>
			<a-descriptions-item label="回复时间">
				{{ formData.replyTime }}
			</a-descriptions-item>
			<a-descriptions-item label="回复人">
				{{ formData.replyUser }}
			</a-descriptions-item>
			<a-descriptions-item label="留言IP">
				{{ formData.ip }}
			</a-descriptions-item>
			<a-descriptions-item label="浏览器UA">
				{{ formData.userAgent }}
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

<script setup name="bizMessageDetail">
	import { cloneDeep } from 'lodash-es'
	import bizMessageApi from '@/api/biz/bizMessageApi'

	// 抽屉状态
	const open = ref(false)
	// 表单数据
	const formData = ref({})

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		bizMessageApi.bizMessageDetail({ id: record.id }).then((data) => {
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
