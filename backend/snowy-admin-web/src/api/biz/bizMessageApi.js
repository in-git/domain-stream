import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/message/` + url, ...arg)

/**
 * 留言Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/19 11:32
 **/
export default {
	// 获取留言分页
	bizMessagePage(data) {
		return request('page', data, 'get')
	},
	// 提交留言表单 edit为true时为编辑，默认为新增
	bizMessageSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除留言
	bizMessageDelete(data) {
		return request('delete', data)
	},
	// 获取留言详情
	bizMessageDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载留言导入模板
    bizMessageDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入留言
	bizMessageImport(data) {
		return request('importData', data)
	},
	// 导出留言
	bizMessageExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
