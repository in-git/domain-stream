/**
 * 画布滤镜处理器
 * ------------------------------------------------------------------
 * @leafer-in/filter 目前只提供滤镜渲染管线，具体滤镜需要自己注册
 * （官方文档：https://www.leaferjs.com/ui/plugin/in/filter）。
 *
 * 这里注册一个通用处理器 `dsFilter`：参数里的 `css` 就是一段标准
 * CSS filter 字符串（如 "sepia(0.5) contrast(1.2)"），渲染时把已画好的
 * 元素内容按 worldBounds 自拷贝一次完成调色。与客户端 CSS filter
 * 语法完全一致，保证编辑器预览和前台渲染效果相同。
 */
import { Filter } from 'leafer-ui';
import '@leafer-in/filter';

Filter.register('dsFilter', {
  apply(filter: { type: string; css?: string }, _ui, worldBounds, currentCanvas) {
    const css = (filter.css || '').trim();
    if (!css) return;
    currentCanvas.filter = css;
    currentCanvas.resetTransform();
    // "copy" 混合：只在元素渲染区域内替换，避免污染画布其它内容
    currentCanvas.copyWorld(currentCanvas, worldBounds, worldBounds, 'copy');
    currentCanvas.filter = 'none';
  },
  getSpread() {
    // 调色不扩散边界，无需扩大渲染范围
    return 0;
  },
});
