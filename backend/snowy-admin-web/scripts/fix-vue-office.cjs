/**
 * 补齐 @vue-office/* 的入口文件（幂等，可重复执行）
 * ------------------------------------------------------------------
 * @vue-office/docx 与 @vue-office/excel 的 package.json 声明
 *   "main": "lib/index.js"
 * 但 lib/index.js / lib/index.css 并不随包发布，而是由包自身的
 * postinstall 脚本按当前 Vue 版本从 lib/v2、lib/v3 复制生成。
 *
 * 以下情况该脚本会被跳过或执行过早，导致 Vite 报
 *   "Failed to resolve entry for package \"@vue-office/docx\"":
 *   - npm install 加了 --ignore-scripts
 *   - node_modules 来自拷贝 / CI 缓存
 *   - 并行安装时 postinstall 先于 vue 落盘，require('vue') 失败
 *
 * 本脚本作为项目级 postinstall，在所有依赖安装完成后执行，
 * 复用各包自带的 postinstall 逻辑补齐入口；不改动任何业务代码。
 */
const fs = require('fs')
const path = require('path')

const nodeModules = path.resolve(__dirname, '..', 'node_modules')
const packages = ['@vue-office/docx', '@vue-office/excel']

// 确认 Vue 主版本，供日志与异常场景判断
let vueVersion = '3'
try {
	const pkg = require(path.join(nodeModules, 'vue', 'package.json'))
	vueVersion = String(pkg.version || '3').split('.')[0]
} catch {
	console.warn('[fix-vue-office] 未找到 vue，按 Vue 3 处理')
}

for (const name of packages) {
	const script = path.join(nodeModules, name, 'lib', 'script', 'postinstall.js')
	if (!fs.existsSync(script)) {
		continue // 依赖尚未安装，交给 npm install 自身处理
	}
	try {
		require(script)
		const lib = path.join(nodeModules, name, 'lib')
		const ok = fs.existsSync(path.join(lib, 'index.js'))
		console.log(
			`[fix-vue-office] ${name} (Vue ${vueVersion}) ${ok ? '入口已就绪' : '入口缺失，请检查安装日志'}`
		)
	} catch (err) {
		console.warn(`[fix-vue-office] ${name} 处理失败：${err && err.message}`)
	}
}
