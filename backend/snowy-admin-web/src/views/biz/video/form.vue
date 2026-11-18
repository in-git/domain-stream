<template>
	<xn-form-container
		:title="formData.id ? '编辑视频' : '增加视频'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="标题：" name="title">
				<a-input v-model:value="formData.title" placeholder="请输入标题" allow-clear />
			</a-form-item>
			<a-form-item label="封面图：" name="cover">
				<a-input v-model:value="formData.cover" placeholder="请输入封面图" allow-clear />
			</a-form-item>
			<a-form-item label="视频地址：" name="videoUrl">
				<a-input v-model:value="formData.videoUrl" placeholder="请输入视频地址" allow-clear />
			</a-form-item>
			<a-form-item label="时长：" name="duration">
				<a-input v-model:value="formData.duration" placeholder="请输入时长" allow-clear />
			</a-form-item>
			<a-form-item label="简介：" name="summary">
				<a-input v-model:value="formData.summary" placeholder="请输入简介" allow-clear />
			</a-form-item>
			<a-form-item label="分类编码，关联 BIZ_CATEGORY.CODE：" name="category">
				<a-input v-model:value="formData.category" placeholder="请输入分类编码，关联 BIZ_CATEGORY.CODE" allow-clear />
			</a-form-item>
			<a-form-item label="标签，多个以逗号分隔：" name="tags">
				<a-input v-model:value="formData.tags" placeholder="请输入标签，多个以逗号分隔" allow-clear />
			</a-form-item>
			<a-form-item label="状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架：" name="status">
				<a-input v-model:value="formData.status" placeholder="请输入状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架" allow-clear />
			</a-form-item>
			<a-form-item label="发布时间：" name="publishTime">
				<a-date-picker v-model:value="formData.publishTime" value-format="YYYY-MM-DD HH:mm:ss" show-time placeholder="请选择发布时间" style="width: 100%" />
			</a-form-item>
			<a-form-item label="播放量：" name="viewCount">
				<a-input v-model:value="formData.viewCount" placeholder="请输入播放量" allow-clear />
			</a-form-item>
			<a-form-item label="点赞量：" name="likeCount">
				<a-input v-model:value="formData.likeCount" placeholder="请输入点赞量" allow-clear />
			</a-form-item>
			<a-form-item label="评论量：" name="commentCount">
				<a-input v-model:value="formData.commentCount" placeholder="请输入评论量" allow-clear />
			</a-form-item>
			<a-form-item label="是否置顶：Y是/N否：" name="isTop">
				<a-input v-model:value="formData.isTop" placeholder="请输入是否置顶：Y是/N否" allow-clear />
			</a-form-item>
			<a-form-item label="是否推荐：Y是/N否：" name="isRecommend">
				<a-input v-model:value="formData.isRecommend" placeholder="请输入是否推荐：Y是/N否" allow-clear />
			</a-form-item>
			<a-form-item label="排序：" name="sortCode">
				<a-input v-model:value="formData.sortCode" placeholder="请输入排序" allow-clear />
			</a-form-item>
			<a-form-item label="备注：" name="remark">
				<a-input v-model:value="formData.remark" placeholder="请输入备注" allow-clear />
			</a-form-item>
			<a-form-item label="扩展信息：" name="extJson">
				<a-input v-model:value="formData.extJson" placeholder="请输入扩展信息" allow-clear />
			</a-form-item>
		</a-form>
		<template #footer>
			<a-button style="margin-right: 8px" @click="onClose">关闭</a-button>
			<a-button type="primary" @click="onSubmit" :loading="submitLoading">保存</a-button>
		</template>
	</xn-form-container>
</template>

<script setup name="bizVideoForm">
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import bizVideoApi from '@/api/biz/bizVideoApi'
	// 抽屉状态
	const open = ref(false)
	const emit = defineEmits({ successful: null })
	const formRef = ref()
	// 表单数据
	const formData = ref({})
	const submitLoading = ref(false)

	// 打开抽屉
	const onOpen = (record) => {
		open.value = true
		if (record) {
			let recordData = cloneDeep(record)
			formData.value = Object.assign({}, recordData)
		}
	}
	// 关闭抽屉
	const onClose = () => {
		formRef.value.resetFields()
		formData.value = {}
		open.value = false
	}
	// 默认要校验的
	const formRules = {
	}
	// 验证并提交数据
	const onSubmit = () => {
		formRef.value
			.validate()
			.then(() => {
				submitLoading.value = true
				const formDataParam = cloneDeep(formData.value)
				bizVideoApi
					.bizVideoSubmitForm(formDataParam, formDataParam.id)
					.then(() => {
						onClose()
						emit('successful')
					})
					.finally(() => {
						submitLoading.value = false
					})
			})
			.catch(() => {})
	}
	// 抛出函数
	defineExpose({
		onOpen
	})
</script>
