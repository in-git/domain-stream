import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/wallpaper/` + url, ...arg)
const publicRequest = (url, ...arg) => baseRequest(`/public/wallpaper/` + url, ...arg)

/**
 * 壁纸库Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/08/07 00:11
 **/
export default {
	// 获取壁纸库分页
	bizWallpaperPage(data) {
		return request('page', data, 'get')
	},
	// 获取壁纸分类列表(公开, 从业务字典动态读取)
	bizWallpaperCategoryList() {
		return publicRequest('categoryList', {}, 'get')
	},
	// 获取壁纸库详情(公开, 返回高清图)
	bizWallpaperPublicDetail(data) {
		return publicRequest('detail', data, 'get')
	},
	// 壁纸下载计数+1(公开)
	bizWallpaperPublicDownload(data) {
		return publicRequest('download', data, 'get')
	},
	// 提交壁纸库表单 edit为true时为编辑，默认为新增
	bizWallpaperSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除壁纸库
	bizWallpaperDelete(data) {
		return request('delete', data)
	},
	// 获取壁纸库详情
	bizWallpaperDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载壁纸库导入模板
    bizWallpaperDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入壁纸库
	bizWallpaperImport(data) {
		return request('importData', data)
	},
	// 导出壁纸库
	bizWallpaperExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
	// 批量上传壁纸文件并入库（FormData提交：file 为文件数组，categoryTag 为分类标签）
	bizWallpaperSaveByUrls(data) {
		return request('saveByUrls', data)
	},
}
