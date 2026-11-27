<template>
    <a-modal :open="visible" title="上传壁纸" :width="700" :mask-closable="false" :destroy-on-close="true" :footer="null"
        @cancel="onClose">
        <a-alert type="info" show-icon style="margin-bottom: 16px">
            <template #message>
                <span>支持拖拽 / 选择多个图片文件批量上传，后端会自动生成缩略图并解析图片属性入库。</span>
            </template>
        </a-alert>
        <a-form layout="vertical">
            <a-form-item label="壁纸分类（必填）" required>
                <a-radio-group v-model:value="categoryTag">
                    <a-radio-button v-for="item in categoryOptions" :key="item.value" :value="item.value">
                        {{ item.label }}
                    </a-radio-button>
                </a-radio-group>
            </a-form-item>
            <a-form-item>
                <a-spin :spinning="uploadLoading">
                    <a-upload-dragger
                        name="file"
                        :multiple="true"
                        :show-upload-list="false"
                        :before-upload="beforeUpload"
                        :accept="uploadAccept"
                        :disabled="!categoryTag"
                    >
                        <p class="ant-upload-drag-icon">
                            <inbox-outlined />
                        </p>
                        <p class="ant-upload-text">单击或拖动图片文件到此区域进行批量上传</p>
                        <p class="ant-upload-hint">支持 jpg、jpeg、png、gif、bmp、webp 格式图片</p>
                    </a-upload-dragger>
                </a-spin>
                <div v-if="!categoryTag" style="color: #faad14; margin-top: 8px">
                    请先选择分类，再拖拽 / 点击上传
                </div>
            </a-form-item>
        </a-form>
    </a-modal>
</template>

<script setup name="wallpaperUploadModal">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import bizWallpaperApi from '@/api/biz/bizWallpaperApi'

const categoryOptions = ref([])
const visible = ref(false)
const categoryTag = ref(undefined)
const uploadLoading = ref(false)
const hasUploaded = ref(false)

const IMAGE_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
const uploadAccept = IMAGE_ALLOWED_EXT.join(',')

const emit = defineEmits(['successful'])

const onOpen = () => {
    visible.value = true
    categoryTag.value = undefined
    uploadLoading.value = false
    hasUploaded.value = false
    bizWallpaperApi.bizWallpaperCategoryList().then((data) => {
        categoryOptions.value = data || []
    })
}

const onClose = () => {
    visible.value = false
    if (hasUploaded.value) {
        emit('successful')
    }
}

// 收集待上传文件，所有文件收集完后再一次性批量提交，避免逐张疯狂触发上传接口
const pendingFiles = []
let batchTimer = null

// 拦截 ant-design-vue 的逐文件上传：仅做校验并收集文件，返回 false 阻止单文件请求
const beforeUpload = (file) => {
    if (!categoryTag.value) {
        message.warning('请先选择壁纸分类！')
        return false
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!IMAGE_ALLOWED_EXT.includes(ext)) {
        message.warning(`仅支持图片文件：jpg、jpeg、png、gif、bmp、webp（已忽略 ${file.name}）`)
        return false
    }
    pendingFiles.push(file)
    // 同一批选中的文件会在同一次事件循环内逐个回调，用定时器合并成一次批量请求
    clearTimeout(batchTimer)
    batchTimer = setTimeout(batchUpload, 0)
    return false
}

const batchUpload = () => {
    if (!pendingFiles.length) {
        return
    }
    const files = pendingFiles.splice(0, pendingFiles.length)
    uploadLoading.value = true
    const formData = new FormData()
    files.forEach((f) => formData.append('file', f))
    formData.append('categoryTag', categoryTag.value)

    bizWallpaperApi
        .bizWallpaperSaveByUrls(formData)
        .then((res) => {
            message.success(`成功上传入库 ${res ?? files.length} 张壁纸`)
            hasUploaded.value = true
        })
        .catch(() => {
            message.error('壁纸上传入库失败，请重试')
        })
        .finally(() => {
            uploadLoading.value = false
        })
}

defineExpose({
    onOpen
})
</script>
