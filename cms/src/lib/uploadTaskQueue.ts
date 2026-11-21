/**
 * 后台上传任务队列（全局单例）
 * ------------------------------------------------------------------
 * 点击「加入上传队列」后立即返回，任务在后台逐/并发执行：
 * 分片上传文件 → 可选的保存回调（如写入视频记录）→ 完成通知。
 * 用户可以继续新增下一个视频，进度在全局悬浮面板中展示。
 */
import { uploadFileChunked } from './chunkUpload.ts';

export interface UploadTask {
  id: string;
  /** 展示名称 */
  name: string;
  /** 任务描述（如「视频文件」「封面」） */
  kind: string;
  /** 字节大小 */
  size: number;
  status: 'queued' | 'uploading' | 'saving' | 'success' | 'error' | 'canceled';
  progress: number;
  error?: string;
  /** 上传完成后的地址 */
  url?: string;
  file: File;
  bizType?: 'USER' | 'MATERIAL';
  categoryCode?: string;
  /** 上传成功且（若有）保存回调完成后触发，用于刷新列表 */
  onDone?: (url: string) => Promise<void> | void;
}

type Listener = (tasks: UploadTask[]) => void;

/** 同时进行的上传任务数 */
const CONCURRENCY = 2;

class UploadTaskQueue {
  private tasks: UploadTask[] = [];
  private listeners = new Set<Listener>();
  private controllers = new Map<string, AbortController>();
  private active = 0;
  private seq = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.tasks]);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = [...this.tasks];
    this.listeners.forEach((l) => l(snapshot));
  }

  /** 入队一个上传任务；若提供 save 回调，上传完成后自动执行（如创建视频记录） */
  enqueue(input: {
    file: File;
    name?: string;
    kind?: string;
    bizType?: 'USER' | 'MATERIAL';
    categoryCode?: string;
    onDone?: (url: string) => Promise<void> | void;
  }): string {
    const id = `task-${Date.now()}-${this.seq++}`;
    const task: UploadTask = {
      id,
      name: input.name || input.file.name,
      kind: input.kind || '文件',
      size: input.file.size,
      status: 'queued',
      progress: 0,
      file: input.file,
      bizType: input.bizType,
      categoryCode: input.categoryCode,
      onDone: input.onDone,
    };
    this.tasks.unshift(task);
    this.emit();
    this.pump();
    return id;
  }

  /**
   * 入队一组任务（视频 + 封面等），全部成功后按传入顺序统一回调 URL。
   * 任一任务失败/取消则跳过回调，避免写入不完整的记录。
   */
  enqueueBatch(
    inputs: Array<{
      file: File;
      name?: string;
      kind?: string;
      bizType?: 'USER' | 'MATERIAL';
      categoryCode?: string;
    }>,
    onAllDone: (urls: string[]) => Promise<void> | void
  ): string[] {
    const urls = new Array<string>(inputs.length);
    let finished = 0;
    return inputs.map((input, index) =>
      this.enqueue({
        ...input,
        onDone: (url) => {
          urls[index] = url;
          finished++;
          // 失败/取消的任务不会触发 onDone，因此只有全部成功才会到达这里
          if (finished === inputs.length) void onAllDone(urls);
        },
      })
    );
  }

  cancel(id: string) {
    const controller = this.controllers.get(id);
    if (controller) controller.abort();
    const task = this.tasks.find((t) => t.id === id);
    if (task && (task.status === 'queued' || task.status === 'uploading' || task.status === 'saving')) {
      task.status = 'canceled';
      task.error = '已取消';
      this.emit();
    }
  }

  remove(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.emit();
  }

  clearFinished() {
    this.tasks = this.tasks.filter(
      (t) => t.status === 'success' || t.status === 'error' || t.status === 'canceled'
        ? false
        : true
    );
    this.emit();
  }

  private pump() {
    while (this.active < CONCURRENCY) {
      const next = this.tasks.find((t) => t.status === 'queued');
      if (!next) break;
      this.active++;
      void this.run(next);
    }
  }

  private async run(task: UploadTask) {
    const controller = new AbortController();
    this.controllers.set(task.id, controller);
    task.status = 'uploading';
    task.progress = 0;
    this.emit();

    try {
      const result = await uploadFileChunked(task.file, {
        bizType: task.bizType,
        categoryCode: task.categoryCode,
        signal: controller.signal,
        onProgress: (p) => {
          task.progress = p;
          this.emit();
        },
      });
      if (controller.signal.aborted) throw new DOMException('已取消', 'AbortError');
      task.url = result.url;
      if (task.onDone) {
        task.status = 'saving';
        this.emit();
        await task.onDone(result.url);
      }
      task.status = 'success';
      task.progress = 100;
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        task.status = 'canceled';
        task.error = '已取消';
      } else {
        task.status = 'error';
        task.error = err instanceof Error ? err.message : '上传失败';
      }
    } finally {
      this.controllers.delete(task.id);
      this.active--;
      this.emit();
      this.pump();
    }
  }
}

export const uploadTaskQueue = new UploadTaskQueue();
