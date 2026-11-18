<template>
	<xn-form-container
		:title="formData.id ? '编辑通用分类（文章/视频/图文）' : '增加通用分类（文章/视频/图文）'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="父级ID，顶级为0：" name="parentId">
				<a-input v-model:value="formData.parentId" placeholder="请输入父级ID，顶级为0" allow-clear />
			</a-form-item>
			<a-form-item label="分类名称：" name="name">
				<a-input v-model:value="formData.name" placeholder="请输入分类名称" allow-clear />
			</a-form-item>
			<a-form-item label="分类编码，业务表CATEGORY字段关联此编码：" name="code">
				<a-input v-model:value="formData.code" placeholder="请输入分类编码，业务表CATEGORY字段关联此编码" allow-clear />
			</a-form-item>
			<a-form-item label="分类图片：" name="image">
				<a-input v-model:value="formData.image" placeholder="请输入分类图片" allow-clear />
			</a-form-item>
			<a-form-item label="分类图标：" name="icon">
				<a-input v-model:value="formData.icon" placeholder="请输入分类图标" allow-clear />
			</a-form-item>
			<a-form-item label="适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用：" name="module">
				<a-input v-model:value="formData.module" placeholder="请输入适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用" allow-clear />
			</a-form-item>
			<a-form-item label="分类描述：" name="description">
				<a-input v-model:value="formData.description" placeholder="请输入分类描述" allow-clear />
			</a-form-item>
			<a-form-item label="状态：ENABLE启用/DISABLE禁用：" name="status">
				<a-input v-model:value="formData.status" placeholder="请输入状态：ENABLE启用/DISABLE禁用" allow-clear />
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

<script setup name="bizCategoryForm">
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import bizCategoryApi from '@/api/biz/bizCategoryApi'
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
				bizCategoryApi
					.bizCategorySubmitForm(formDataParam, formDataParam.id)
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
