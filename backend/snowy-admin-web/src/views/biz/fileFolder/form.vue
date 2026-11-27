<template>
	<xn-form-container
		:title="formData.id ? '编辑文件文件夹' : '增加文件文件夹'"
		:width="700"
		v-model:open="open"
		:destroy-on-close="true"
		@close="onClose"
	>
		<a-form ref="formRef" :model="formData" :rules="formRules" layout="vertical">
			<a-form-item label="父文件夹id（0 表示根目录）：" name="parentId">
				<xn-tree-select
					ref="parentTreeSelectRef"
					v-model:value="formData.parentId"
					:tree-api="(param) => devFileFolderApi.devFileFolderTree(param)"
					:ancestor-api="(ids) => devFileFolderApi.devFileFolderGetAncestorNodes(ids)"
					:top-node="{ key: '0', title: '顶级' }"
					:field-names="{ children: 'children', label: 'title', key: 'key', value: 'key' }"
					parent-id-key="parentId"
					placeholder="请选择上级"
				/>
			</a-form-item>
			<a-form-item label="文件类型：" name="fileType">
				<a-input v-model:value="formData.fileType" placeholder="请输入文件类型" allow-clear />
			</a-form-item>
			<a-form-item label="文件夹名称：" name="name">
				<a-input v-model:value="formData.name" placeholder="请输入文件夹名称" allow-clear />
			</a-form-item>
			<a-form-item label="类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享：" name="type">
				<a-input v-model:value="formData.type" placeholder="请输入类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享" allow-clear />
			</a-form-item>
			<a-form-item label="拥有者用户id：" name="ownerId">
				<a-input v-model:value="formData.ownerId" placeholder="请输入拥有者用户id" allow-clear />
			</a-form-item>
			<a-form-item label="排序码：" name="sortCode">
				<a-input v-model:value="formData.sortCode" placeholder="请输入排序码" allow-clear />
			</a-form-item>
			<a-form-item label="是否为文件夹（Y 是 / N 否）：" name="isFolder">
				<a-input v-model:value="formData.isFolder" placeholder="请输入是否为文件夹（Y 是 / N 否）" allow-clear />
			</a-form-item>
			<a-form-item label="是否已放入回收站（Y 是 / N 否）：" name="isRecycled">
				<a-input v-model:value="formData.isRecycled" placeholder="请输入是否已放入回收站（Y 是 / N 否）" allow-clear />
			</a-form-item>
		</a-form>
		<template #footer>
			<a-button style="margin-right: 8px" @click="onClose">关闭</a-button>
			<a-button type="primary" @click="onSubmit" :loading="submitLoading">保存</a-button>
		</template>
	</xn-form-container>
</template>

<script setup name="devFileFolderForm">
	import { nextTick } from 'vue'
	import { cloneDeep } from 'lodash-es'
	import { required } from '@/utils/formRules'
	import devFileFolderApi from '@/api/biz/devFileFolderApi'
	// 抽屉状态
	const open = ref(false)
	const emit = defineEmits({ successful: null })
	const formRef = ref()
	// 表单数据
	const formData = ref({})
	const submitLoading = ref(false)

	// 上级树选择器引用
	const parentTreeSelectRef = ref()

	// 打开抽屉
	const onOpen = (record, parentId) => {
		open.value = true
		if (record) {
			let recordData = cloneDeep(record)
			formData.value = Object.assign({}, recordData)
			nextTick(() => {
				const pid = recordData.parentId
				if (pid && pid !== '0') {
					parentTreeSelectRef.value.echo([pid])
				} else {
					parentTreeSelectRef.value.init()
				}
			})
		} else if (parentId) {
			formData.value = { parentId: parentId }
			nextTick(() => {
				if (parentId !== '0') {
					parentTreeSelectRef.value.echo([parentId])
				} else {
					parentTreeSelectRef.value.init()
				}
			})
		} else {
			nextTick(() => {
				parentTreeSelectRef.value.init()
			})
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
		parentId: [required('请输入父文件夹id（0 表示根目录）')],
	}
	// 验证并提交数据
	const onSubmit = () => {
		formRef.value
			.validate()
			.then(() => {
				submitLoading.value = true
				const formDataParam = cloneDeep(formData.value)
				devFileFolderApi
					.devFileFolderSubmitForm(formDataParam, formDataParam.id)
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
