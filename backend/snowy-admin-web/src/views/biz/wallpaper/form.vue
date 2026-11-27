<template>
	<xn-form-container
		:title="formData.id ? '编辑壁纸库' : '增加壁纸库'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="壁纸标题：" name="title">
				<a-input v-model:value="formData.title" placeholder="请输入壁纸标题" allow-clear />
			</a-form-item>
			<a-form-item label="分辨率：" name="resolution">
				<a-input v-model:value="formData.resolution" placeholder="请输入分辨率" allow-clear />
			</a-form-item>
			<a-form-item label="宽高比：" name="aspectRatio">
				<a-input v-model:value="formData.aspectRatio" placeholder="请输入宽高比" allow-clear />
			</a-form-item>
			<a-form-item label="壁纸图片地址：" name="imageUrl">
				<a-input v-model:value="formData.imageUrl" placeholder="请输入壁纸图片地址" allow-clear />
			</a-form-item>
			<a-form-item label="标签：" name="tag">
				<a-input v-model:value="formData.tag" placeholder="请输入标签" allow-clear />
			</a-form-item>
			<a-form-item label="文件大小：" name="fileSize">
				<a-input v-model:value="formData.fileSize" placeholder="请输入文件大小" allow-clear />
			</a-form-item>
			<a-form-item label="分类标签：" name="categoryTag">
				<a-input v-model:value="formData.categoryTag" placeholder="请输入分类标签" allow-clear />
			</a-form-item>
			<a-form-item label="下载次数：" name="downloadsCount">
				<a-input v-model:value="formData.downloadsCount" placeholder="请输入下载次数" allow-clear />
			</a-form-item>
			<a-form-item label="点赞次数：" name="likesCount">
				<a-input v-model:value="formData.likesCount" placeholder="请输入点赞次数" allow-clear />
			</a-form-item>
		</a-form>
		<template #footer>
			<a-button style="margin-right: 8px" @click="onClose">关闭</a-button>
			<a-button type="primary" @click="onSubmit" :loading="submitLoading">保存</a-button>
		</template>
	</xn-form-container>
</template>

<script setup name="bizWallpaperForm">
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import bizWallpaperApi from '@/api/biz/bizWallpaperApi'
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
				bizWallpaperApi
					.bizWallpaperSubmitForm(formDataParam, formDataParam.id)
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
