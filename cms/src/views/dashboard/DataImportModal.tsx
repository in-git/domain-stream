import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { SnowyAuthError } from '../../lib/snowy.ts';
import { showToast } from '../../components/AppToast.tsx';

type ImportMode = 'OVERWRITE' | 'APPEND';

interface ImportResult {
  success: boolean;
  message: string;
  count: number;
}

/** 数据导入模态框：ZIP 文件包可选覆盖/追加，SQL 备份固定完全覆盖 */
export function DataImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ImportMode>('APPEND');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const name = file?.name.toLowerCase() ?? '';
  const isZip = name.endsWith('.zip');
  const isSql = name.endsWith('.sql');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  function pickFile(next: File | null) {
    setFile(next);
    setMode('APPEND');
    setResult(null);
    setError(null);
  }

  async function handleImport() {
    if (!file) {
      setError('请先选择要导入的文件');
      return;
    }
    if (!isZip && !isSql) {
      setError('仅支持 .zip 文件资源包或 .sql 数据库备份');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const ticket = isSql
        ? await api.restoreDatabase(file)
        : await api.importFiles(file, mode);
      const deadline = Date.now() + 30 * 60 * 1000;
      let pollFailures = 0;
      while (Date.now() < deadline) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 600));
        // 轮询偶发失败不代表后台任务失败（后台仍在执行），连续多次失败才判定异常
        let status;
        try {
          status = await api.getImportStatus(ticket);
        } catch (pollErr) {
          if (pollErr instanceof SnowyAuthError) throw pollErr;
          if (++pollFailures >= 50) {
            throw new Error('无法获取导入进度，任务可能仍在后台执行，请稍后刷新查看结果');
          }
          continue;
        }
        pollFailures = 0;
        if (!status.done) continue;
        setResult({
          success: status.success,
          message: status.message,
          count: status.count,
        });
        showToast(
          status.success ? `导入完成：${status.message}` : status.message,
          status.success ? 'success' : 'danger'
        );
        return;
      }
      throw new Error('导入超时，请到服务器日志确认执行结果');
    } catch (err) {
      const message = err instanceof Error ? err.message : '导入失败';
      setError(message);
      showToast(message, 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="数据导入"
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_20px_60px_rgba(0,0,0,0.16)] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1D1D1F] truncate">数据导入</h2>
            <p className="mt-0.5 text-[12px] text-[#86868B]">
              导入由数据导出生成的文件包或数据库备份
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="关闭"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] disabled:opacity-40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] px-3.5 py-2.5 text-[12px] text-[#D70015]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-[#3A3A3C] mb-2" htmlFor="data-import-file">
              选择导入文件
            </label>
            <input
              id="data-import-file"
              type="file"
              accept=".zip,.sql"
              disabled={busy}
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
              className="w-full text-[13px] text-[#3A3A3C] file:mr-3 file:h-9 file:px-3 file:rounded-xl file:border-0 file:bg-[#F2F2F7] file:text-[12px] file:font-medium file:text-[#3A3A3C] hover:file:bg-[#E5E5EA]"
            />
            {file && (
              <p className="mt-2 text-[12px] text-[#86868B] truncate">
                已选择：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MB）
              </p>
            )}
          </div>

          {isZip && (
            <div>
              <div className="text-[12px] font-medium text-[#3A3A3C] mb-2">导入模式</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: 'OVERWRITE' as const,
                      title: '覆盖',
                      description: '导入后删除原有的用户文件',
                    },
                    {
                      value: 'APPEND' as const,
                      title: '追加',
                      description: '保留原有文件，仅添加包内文件',
                    },
                  ]
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={busy}
                    onClick={() => setMode(option.value)}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${
                      mode === option.value
                        ? 'border-[#0071E3] bg-[#0071E3]/5'
                        : 'border-[#E5E5EA] bg-white hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <div className="text-[13px] font-medium text-[#1D1D1F]">{option.title}</div>
                    <div className="mt-0.5 text-[11px] leading-4 text-[#86868B]">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSql && (
            <div className="rounded-xl bg-[#FFF7E6] border border-[#FFD591] px-3.5 py-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#874D00]">
                <AlertTriangle className="w-4 h-4" strokeWidth={1.8} />
                SQL 恢复：完全覆盖
              </div>
              <p className="mt-1.5 text-[12px] leading-5 text-[#874D00]/80">
                将按备份脚本重建数据库，现有全部表和数据会被替换，此操作不可撤销。请确认备份文件来自本系统的「导出数据库」。
              </p>
            </div>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-xl bg-[#F5F5F7] px-3.5 py-3 text-[12px] text-[#3A3A3C]">
              <Loader2 className="w-4 h-4 animate-spin text-[#0071E3]" />
              导入执行中，完成后会自动提示，请勿关闭页面
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl px-3.5 py-3 ${result.success ? 'bg-[#F0FDF4] border border-[#BBF7D0]' : 'bg-[#FFF1F0] border border-[#FFCCC7]'}`}
            >
              <div
                className={`flex items-center gap-2 text-[13px] font-medium ${result.success ? 'text-[#16A34A]' : 'text-[#D70015]'}`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                {result.success ? '导入完成' : '导入失败'}
              </div>
              <p className="mt-1.5 text-[12px] text-[#3A3A3C]">{result.message}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#F2F2F7] flex items-center justify-end gap-2 shrink-0 bg-[#FAFAFC]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={!file || busy || !!result}
            className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" strokeWidth={1.8} />}
            开始导入
          </button>
        </div>
      </div>
    </div>
  );
}
