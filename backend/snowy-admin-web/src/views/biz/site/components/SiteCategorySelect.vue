<template>
	<a-spin :spinning="loading" size="small">
		<a-tree-select
			v-model:value="modelValue"
			class="xn-wd"
			:dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
			:placeholder="props.placeholder"
			:allow-clear="props.allowClear"
			:disabled="props.disabled"
			:tree-checkable="props.multiple"
			:tree-check-strictly="props.multiple"
			:tree-data="treeData"
			v-model:tree-expanded-keys="expandedKeys"
			:field-names="{ label: 'name', value: 'id', children: 'children' }"
			:tree-node-filter-prop="'name'"
			showCheckedStrategy="SHOW_ALL"
			:label-in-value="false"
			show-search
			tree-line
			v-bind="$attrs"
			@change="handleChange"
		/>
	</a-spin>
</template>

<script setup name="SiteCategorySelect">
	/**
	 * 站点分类选择器（基于 Ant Design Vue 的 a-tree-select）
	 * 独立组件，仅用于站点模块，不混入全局组件库。
	 * 数据来源：公开免登录接口 bizSitePublicApi.bizSiteCategoryTree（返回完整嵌套树）
	 */
	import { ref, watch, onMounted } from 'vue'
	import bizSitePublicApi from '@/api/biz/bizSitePublicApi'

	const emit = defineEmits({ change: null, 'update:value': null })
	const props = defineProps({
		/** 选中值（v-model:value），多选时为 id 数组 */
		value: { type: [String, Array], default: undefined },
		/** 占位文本 */
		placeholder: { type: String, default: '请选择分类' },
		/** 允许清除 */
		allowClear: { type: Boolean, default: true },
		/** 禁用 */
		disabled: { type: Boolean, default: false },
		/** 多选（勾选）模式 */
		multiple: { type: Boolean, default: true }
	})

	const modelValue = ref(props.value)
	const treeData = ref([])
	const expandedKeys = ref([])
	const loading = ref(false)
	// 扁平节点列表，用于回显时回溯祖先展开路径
	const flatNodes = ref([])

	watch(
		() => props.value,
		(val) => {
			modelValue.value = val
		}
	)

	// 公开接口返回 id/name/parentId/children，映射为 Ant TreeSelect 所需结构并标记叶子
	const mapNode = (node) => {
		const children = node.children && node.children.length ? node.children.map(mapNode) : undefined
		return {
			id: node.id,
			name: node.name,
			parentId: node.parentId,
			children,
			isLeaf: !children
		}
	}

	// 根据当前选中值，沿 parentId 向上回溯，收集所有祖先作为展开 key
	const buildExpandKeys = (selectedIds) => {
		const pidMap = {}
		flatNodes.value.forEach((n) => (pidMap[n.id] = n.parentId))
		const keys = new Set()
		selectedIds.forEach((id) => {
			let cur = pidMap[id]
			while (cur) {
				keys.add(cur)
				cur = pidMap[cur]
			}
		})
		return [...keys]
	}

	const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : [])

	const loadTree = () => {
		loading.value = true
		return bizSitePublicApi
			.bizSiteCategoryTree({})
			.then((res) => {
				const nodes = (res || []).map(mapNode)
				treeData.value = nodes
				const flat = []
				const walk = (list) =>
					list.forEach((n) => {
						flat.push(n)
						if (n.children) walk(n.children)
					})
				walk(nodes)
				flatNodes.value = flat
				// 编辑回显：展开已选节点的祖先路径，使已选分类可见
				expandedKeys.value = buildExpandKeys(toArray(modelValue.value))
			})
			.finally(() => {
				loading.value = false
			})
	}

	onMounted(() => {
		loadTree()
	})

	const handleChange = (value) => {
		// 当开启 treeCheckStrictly 时，Antd 返回的对象或数组里可能是 { label, value } 格式或者 { checked: [] } 格式，这里统一提取纯 id 数组或纯 id
		let ids = value
		if (value && typeof value === 'object' && !Array.isArray(value) && value.checked) {
			ids = value.checked.map((v) => (typeof v === 'object' && v !== null ? v.value : v))
		} else if (Array.isArray(value)) {
			ids = value.map((v) => (typeof v === 'object' && v !== null ? v.value : v))
		} else if (typeof value === 'object' && value !== null && 'value' in value) {
			ids = value.value
		}
		modelValue.value = ids
		emit('update:value', ids)
		emit('change', ids)
	}

	defineExpose({ reload: loadTree })
</script>
