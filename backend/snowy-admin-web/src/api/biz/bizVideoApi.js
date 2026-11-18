import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/video/` + url, ...arg)

/**
 * 视频Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:03
 **/
export default {
	// 获取视频分页
	bizVideoPage(data) {
		return request('page', data, 'get')
	},
	// 提交视频表单 edit为true时为编辑，默认为新增
	bizVideoSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除视频
	bizVideoDelete(data) {
		return request('delete', data)
	},
	// 获取视频详情
	bizVideoDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载视频导入模板
    bizVideoDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入视频
	bizVideoImport(data) {
		return request('importData', data)
	},
	// 导出视频
	bizVideoExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
