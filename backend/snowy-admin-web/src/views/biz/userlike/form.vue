<template>
	<xn-form-container
		:title="formData.id ? '编辑用户喜欢/点赞记录' : '增加用户喜欢/点赞记录'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="点赞用户ID，关联 CLIENT_USER.ID：" name="userId">
				<a-input v-model:value="formData.userId" placeholder="请输入点赞用户ID，关联 CLIENT_USER.ID" allow-clear />
			</a-form-item>
			<a-form-item label="目标内容ID：" name="targetId">
				<a-input v-model:value="formData.targetId" placeholder="请输入目标内容ID" allow-clear />
			</a-form-item>
			<a-form-item label="目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频：" name="targetType">
				<a-input v-model:value="formData.targetType" placeholder="请输入目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频" allow-clear />
			</a-form-item>
			<a-form-item label="喜欢状态：LIKED-已喜欢，UNLIKED-已取消：" name="status">
				<a-input v-model:value="formData.status" placeholder="请输入喜欢状态：LIKED-已喜欢，UNLIKED-已取消" allow-clear />
			</a-form-item>
			<a-form-item label="首次喜欢时间：" name="likeTime">
				<a-date-picker v-model:value="formData.likeTime" value-format="YYYY-MM-DD HH:mm:ss" show-time placeholder="请选择首次喜欢时间" style="width: 100%" />
			</a-form-item>
			<a-form-item label="备注：" name="remark">
				<a-input v-model:value="formData.remark" placeholder="请输入备注" allow-clear />
			</a-form-item>
		</a-form>
		<template #footer>
			<a-button style="margin-right: 8px" @click="onClose">关闭</a-button>
			<a-button type="primary" @click="onSubmit" :loading="submitLoading">保存</a-button>
		</template>
	</xn-form-container>
</template>

<script setup name="bizUserLikeForm">
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import bizUserLikeApi from '@/api/biz/bizUserLikeApi'
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
				bizUserLikeApi
					.bizUserLikeSubmitForm(formDataParam, formDataParam.id)
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
