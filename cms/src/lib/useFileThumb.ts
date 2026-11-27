/**
 * 文件缩略图地址解析
 * ------------------------------------------------------------------
 * 后端缩略图接口受 sa-token 保护，普通 <img src> 无法携带 token，
 * 直接使用会返回 401 并显示为裂图。这里先带 token 拉取二进制，
 * 再转成 object URL 供 <img> 使用，组件卸载时释放。
 *
 * 非后端缩略图地址（外链、data: 等）原样返回；
 * 拉取失败或内容不是图片时回退到 fallbackUrl（通常是原图地址）。
 */
import { useEffect, useState } from 'react';
import { fetchThumbnailBlob, thumbnailFetchPath, type DevFile } from './fileCenter.ts';

export function useFileThumbSrc(file: DevFile, fallbackUrl = ''): string {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setSrc('');

    if (!thumbnailFetchPath(file.thumbnail)) {
      setSrc(file.thumbnail || fallbackUrl);
      return () => {};
    }

    void fetchThumbnailBlob(file)
      .then((blob) => {
        if (cancelled) return;
        if (!blob.size || (blob.type && !blob.type.startsWith('image/'))) {
          setSrc(fallbackUrl);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(fallbackUrl);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, file.thumbnail, fallbackUrl]);

  return src;
}
