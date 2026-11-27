<template>
	<XnResizablePanel direction="row" :initial-size="300" :min-size="200" :max-size="500" :md="0">
		<template #left>
			<div ref="treeContainerRef" style="height: 100%; display: flex; flex-direction: column">
				<a-input-search
					v-model:value="treeSearchKey"
					placeholder="搜索"
					allow-clear
					style="margin-bottom: 8px; flex-shrink: 0"
					@search="onTreeSearch"
				/>
				<div style="flex: 1; overflow: hidden">
					<xn-tree-skeleton v-if="treeLoading && treeData.length === 0" />
					<a-spin v-else-if="treeData.length > 0" :spinning="treeLoading">
						<a-tree
							v-model:expandedKeys="defaultExpandedKeys"
							v-model:loadedKeys="treeLoadedKeys"
							v-model:selectedKeys="selectedTreeKeys"
							:show-line="{ showLeafIcon: false }"
							:tree-data="treeData"
							:field-names="treeFieldNames"
							:load-data="searchMode ? undefined : onLoadData"
							:height="treeHeight"
							@select="treeSelect"
						/>
					</a-spin>
					<a-empty v-else :image="Empty.PRESENTED_IMAGE_SIMPLE" />
				</div>
			</div>
		</template>
		<template #right>
			<a-form ref="searchFormRef" :model="searchFormState">
				<a-row :gutter="10">
					<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
						<a-form-item label="文件类型" name="fileType">
							<a-input v-model:value="searchFormState.fileType" placeholder="请输入文件类型" />
						</a-form-item>
					</a-col>
					<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
						<a-form-item label="文件夹名称" name="name">
							<a-input v-model:value="searchFormState.name" placeholder="请输入文件夹名称" />
						</a-form-item>
					</a-col>
					<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
						<a-form-item label="类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享" name="type">
							<a-input v-model:value="searchFormState.type" placeholder="请输入类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享" />
						</a-form-item>
					</a-col>
					<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					    <a-form-item>
					        <a-space>
					            <a-button type="primary" @click="tableRef.refresh(true)">
					                <template #icon><SearchOutlined /></template>
					                查询
					            </a-button>
					            <a-button @click="reset">
					                <template #icon><redo-outlined /></template>
					                 重置
					            </a-button>
	                        </a-space>
	                    </a-form-item>
	                </a-col>
	            </a-row>
			</a-form>
			<s-table
				ref="tableRef"
				:columns="columns"
				:data="loadData"
				:alert="options.alert.show"
				bordered
				:row-key="(record) => record.id"
				:tool-config="toolConfig"
				:row-selection="options.rowSelection"
				:scroll="{ x: 'max-content' }"
			>
				<template #operator>
					<a-space>
						<a-button type="primary" @click="formRef.onOpen(undefined, searchFormState.parentId)" v-if="hasPerm('devFileFolderAdd')">
							<template #icon><plus-outlined /></template>
							新增
						</a-button>
						<a-button :loading="uploadFolderLoading" @click="triggerUploadFolder" v-if="hasPerm('devFileFolderAdd')">
							<template #icon><folder-open-outlined /></template>
							<span>上传文件夹</span>
						</a-button>
						<input
							ref="folderInputRef"
							type="file"
							webkitdirectory
							directory
							multiple
							style="display: none"
							@change="onFolderSelected"
						/>
						<a-button @click="importModelRef.onOpen()" v-if="hasPerm('devFileFolderImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
	                    <a-button @click="exportData" v-if="hasPerm('devFileFolderExport')">
	                        <template #icon><export-outlined /></template>
	                        <span>导出</span>
	                    </a-button>
						<xn-batch-button
						v-if="hasPerm('devFileFolderBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchDevFileFolder"
					/>
					</a-space>
				</template>
				<template #bodyCell="{ column, record }">
					<template v-if="column.dataIndex === 'action'">
						<a-space>
							<a @click="detailRef.onOpen(record)" v-if="hasPerm('devFileFolderDetail')">详情</a>
							<a-divider type="vertical" v-if="hasPerm(['devFileFolderDetail', 'devFileFolderEdit'], 'and')" />
							<a @click="formRef.onOpen(record)" v-if="hasPerm('devFileFolderEdit')">编辑</a>
							<a-divider type="vertical" v-if="hasPerm(['devFileFolderEdit', 'devFileFolderDelete'], 'and')" />
							<a-popconfirm title="确定要删除吗？" @confirm="deleteDevFileFolder(record)">
								<a-button type="link" danger size="small" v-if="hasPerm('devFileFolderDelete')">删除</a-button>
							</a-popconfirm>
						</a-space>
					</template>
				</template>
			</s-table>
		</template>
	</XnResizablePanel>
	<ImportModel ref="importModelRef" />
	<Form ref="formRef" @successful="onFormSuccess" />
	<Detail ref="detailRef" />
</template>

<script setup name="fileFolder">
	import { Empty } from 'ant-design-vue'
	import { ref, triggerRef, onMounted, onActivated, onUnmounted } from 'vue'
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import devFileFolderApi from '@/api/biz/devFileFolderApi'
	const searchFormState = ref({})
	const searchFormRef = ref()
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	const columns = [
		{
			title: '文件类型',
			dataIndex: 'fileType'
		},
		{
			title: '文件夹名称',
			dataIndex: 'name'
		},
		{
			title: '类型：PRIVATE 私有 / PUBLIC 公共 / SHARED 共享',
			dataIndex: 'type'
		},
		{
			title: '拥有者用户id',
			dataIndex: 'ownerId'
		},
		{
			title: '排序码',
			dataIndex: 'sortCode'
		},
		{
			title: '是否为文件夹（Y 是 / N 否）',
			dataIndex: 'isFolder'
		},
		{
			title: '是否已放入回收站（Y 是 / N 否）',
			dataIndex: 'isRecycled'
		},
	]
	// 操作栏通过权限判断是否显示
	if (hasPerm(['devFileFolderEdit', 'devFileFolderDelete', 'devFileFolderDetail'])) {
		columns.push({
			title: '操作',
			dataIndex: 'action',
			align: 'center',
			fixed: 'right'
		})
	}
	const selectedRowKeys = ref([])
	// 列表选择配置
	const options = {
		alert: {
			show: true,
			clear: () => {
				selectedRowKeys.value = ref([])
			}
		},
		rowSelection: {
			onChange: (selectedRowKey, selectedRows) => {
				selectedRowKeys.value = selectedRowKey
			}
		}
	}

	// 树相关
	const defaultExpandedKeys = ref([])
	const treeData = ref([])
	const treeFieldNames = { children: 'children', title: 'title', key: 'key' }
	const treeLoading = ref(true)
	const treeSearchKey = ref('')
	const searchMode = ref(false)
	const treeLoadedKeys = ref([])
	const selectedTreeKeys = ref([])
	// 树容器高度自适应
	const treeContainerRef = ref(null)
	const treeHeight = ref(0)
	let resizeObserver = null
	const calcTreeHeight = () => {
		if (treeContainerRef.value) {
			treeHeight.value = treeContainerRef.value.clientHeight - 40
		}
	}
	onMounted(() => {
		calcTreeHeight()
		if (treeContainerRef.value) {
			resizeObserver = new ResizeObserver(calcTreeHeight)
			resizeObserver.observe(treeContainerRef.value)
		}
	})
	onActivated(calcTreeHeight)
	onUnmounted(() => {
		if (resizeObserver) {
			resizeObserver.disconnect()
		}
	})

	// 收集树所有节点key，用于搜索时全部展开
	const collectTreeKeys = (nodes) => {
		const keys = []
		const traverse = (list) => {
			if (!list) return
			list.forEach((node) => {
				keys.push(node.key)
				if (node.children) traverse(node.children)
			})
		}
		traverse(nodes)
		return keys
	}
	// 树搜索
	const onTreeSearch = (value) => {
		if (!value || !value.trim()) {
			treeData.value = []
			defaultExpandedKeys.value = []
			treeLoadedKeys.value = []
			searchMode.value = false
			loadTreeData()
			return
		}
		treeLoading.value = true
		searchMode.value = true
		devFileFolderApi
			.devFileFolderTree({ searchKey: value.trim() })
			.then((res) => {
				if (res !== null) {
					treeData.value = res
					defaultExpandedKeys.value = collectTreeKeys(res)
				} else {
					treeData.value = []
				}
			})
			.finally(() => {
				treeLoading.value = false
			})
	}
	// 加载左侧的树
	const loadTreeData = () => {
		treeLoading.value = true
		devFileFolderApi
			.devFileFolderTree()
			.then((res) => {
				if (res !== null) {
					treeLoadedKeys.value = []
					defaultExpandedKeys.value = []
					treeData.value = res.map((item) => {
						return {
							...item,
							isLeaf: item.isLeaf === undefined ? false : item.isLeaf
						}
					})
					if (treeData.value.length === 1) {
						defaultExpandedKeys.value = [treeData.value[0].key]
					}
				}
			})
			.finally(() => {
				treeLoading.value = false
			})
	}
	loadTreeData()
	// 刷新树数据
	const refreshTreeData = () => {
		treeLoading.value = true
		devFileFolderApi
			.devFileFolderTree({ searchKey: '' })
			.then((res) => {
				if (res !== null) {
					treeData.value = res
				}
			})
			.finally(() => {
				treeLoading.value = false
			})
	}
	// 懒加载子节点
	const onLoadData = (treeNode) => {
		return new Promise((resolve) => {
			if (treeNode.dataRef.children || treeNode.dataRef.isLeaf) {
				resolve()
				return
			}
			devFileFolderApi
				.devFileFolderTree({
					parentId: treeNode.dataRef.key
				})
				.then((res) => {
					treeNode.dataRef.children = res.map((item) => {
						return {
							...item,
							isLeaf: item.isLeaf === undefined ? false : item.isLeaf
						}
					})
					triggerRef(treeData)
					resolve()
				})
		})
	}
	// 点击树查询
	const treeSelect = (selectedKeys) => {
		if (selectedKeys.length > 0) {
			searchFormState.value.parentId = selectedKeys.toString()
		} else {
			delete searchFormState.value.parentId
		}
		tableRef.value.refresh(true)
	}


	const loadData = (parameter) => {
		const searchFormParam = cloneDeep(searchFormState.value)
		return devFileFolderApi.devFileFolderPage(Object.assign(parameter, searchFormParam)).then((data) => {
			return data
		})
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		delete searchFormState.value.parentId
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteDevFileFolder = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		devFileFolderApi.devFileFolderDelete(params).then(() => {
			tableRef.value.refresh(true)
			refreshTreeData()
		})
	}
	// 导出
    const exportData = () => {
        if (selectedRowKeys.value.length > 0) {
            const params = selectedRowKeys.value.map((m) => {
                return {
                    id: m
                }
            })
            devFileFolderApi.devFileFolderExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            devFileFolderApi.devFileFolderExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 批量删除
	const deleteBatchDevFileFolder = (params) => {
		const paramList = params.map((m) => ({ id: m.id }))
		devFileFolderApi.devFileFolderDelete(paramList).then(() => {
			tableRef.value.clearRefreshSelected()
			refreshTreeData()
		})
	}
	// Form成功回调
	const onFormSuccess = () => {
		tableRef.value.refresh()
		refreshTreeData()
	}

	// 上传文件夹相关
	const folderInputRef = ref()
	const uploadFolderLoading = ref(false)
	// 触发隐藏的文件夹选择框
	const triggerUploadFolder = () => {
		folderInputRef.value.click()
	}
	// 文件夹选择后,按相对路径上传,保持目录结构
	const onFolderSelected = (e) => {
		const fileList = Array.from(e.target.files || [])
		if (fileList.length === 0) {
			return
		}
		const relativePaths = fileList.map((f) => f.webkitRelativePath || f.relativePath || f.name)
		uploadFolderLoading.value = true
		devFileFolderApi
			.devFileFolderUploadUnified(fileList, relativePaths)
			.then(() => {
				tableRef.value.refresh(true)
				refreshTreeData()
			})
			.finally(() => {
				uploadFolderLoading.value = false
				// 清空选择,允许重复选择同一文件夹
				e.target.value = ''
			})
	}
</script>
