<template>
	<xn-form-container
		:title="formData.id ? '编辑留言' : '增加留言'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="用户ID：" name="userId">
				<a-input v-model:value="formData.userId" placeholder="请输入用户ID" allow-clear />
			</a-form-item>
			<a-form-item label="留言内容：" name="content">
				<a-input v-model:value="formData.content" placeholder="请输入留言内容" allow-clear />
			</a-form-item>
			<a-form-item label="状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝：" name="status">
				<a-input v-model:value="formData.status" placeholder="请输入状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝" allow-clear />
			</a-form-item>
			<a-form-item label="管理员回复内容：" name="reply">
				<a-input v-model:value="formData.reply" placeholder="请输入管理员回复内容" allow-clear />
			</a-form-item>
			<a-form-item label="回复时间：" name="replyTime">
				<a-date-picker v-model:value="formData.replyTime" value-format="YYYY-MM-DD HH:mm:ss" show-time placeholder="请选择回复时间" style="width: 100%" />
			</a-form-item>
			<a-form-item label="回复人：" name="replyUser">
				<a-input v-model:value="formData.replyUser" placeholder="请输入回复人" allow-clear />
			</a-form-item>
			<a-form-item label="留言IP：" name="ip">
				<a-input v-model:value="formData.ip" placeholder="请输入留言IP" allow-clear />
			</a-form-item>
			<a-form-item label="浏览器UA：" name="userAgent">
				<a-input v-model:value="formData.userAgent" placeholder="请输入浏览器UA" allow-clear />
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

<script setup name="bizMessageForm">
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import bizMessageApi from '@/api/biz/bizMessageApi'
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
				bizMessageApi
					.bizMessageSubmitForm(formDataParam, formDataParam.id)
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
