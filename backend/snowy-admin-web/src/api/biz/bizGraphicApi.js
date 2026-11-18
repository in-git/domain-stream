import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/graphic/` + url, ...arg)

/**
 * 图文Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:05
 **/
export default {
	// 获取图文分页
	bizGraphicPage(data) {
		return request('page', data, 'get')
	},
	// 提交图文表单 edit为true时为编辑，默认为新增
	bizGraphicSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除图文
	bizGraphicDelete(data) {
		return request('delete', data)
	},
	// 获取图文详情
	bizGraphicDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载图文导入模板
    bizGraphicDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入图文
	bizGraphicImport(data) {
		return request('importData', data)
	},
	// 导出图文
	bizGraphicExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
