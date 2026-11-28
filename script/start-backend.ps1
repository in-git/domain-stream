param(
    [switch]$Build
)

# 一键启动后端：停掉占用端口的旧进程 -> 可选重新打包 -> 启动 jar -> 等待端口就绪
$ErrorActionPreference = 'Stop'

# 脚本位于 script 目录，项目根目录取其上一级
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $root 'backend\snowy-web-app'))) {
    throw "未找到后端目录：$root\backend\snowy-web-app"
}
$backendDir = Join-Path $root 'backend'
$appDir = Join-Path $backendDir 'snowy-web-app'
$jar = Join-Path $appDir 'target\snowy-web-app-3.0.0.jar'
$log = Join-Path $appDir 'target\run.log'
$port = 82

Write-Host "==> 后端目录: $appDir"

# 1. 停掉占用端口的旧进程（只处理 java，避免误杀）
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($listener) {
    $old = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($old -and $old.ProcessName -eq 'java') {
        Write-Host "==> 停止旧的 java 进程 PID=$($old.Id)"
        Stop-Process -Id $old.Id -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "!! 端口 $port 被非 java 进程占用（PID=$($listener.OwningProcess)），请先手动处理" -ForegroundColor Red
        exit 1
    }
}

# 2. 需要时重新打包（jar 被占用会失败，所以放在停止进程之后）
if ($Build -or -not (Test-Path $jar)) {
    Write-Host '==> 开始打包后端（mvn package）...'
    Push-Location $backendDir
    try {
        & mvn -o package -DskipTests -q
        if ($LASTEXITCODE -ne 0) {
            throw "mvn package 失败（退出码 $LASTEXITCODE）"
        }
    } finally {
        Pop-Location
    }
    Write-Host '==> 打包完成'
}

# 3. 启动 jar
Write-Host '==> 启动后端...'
$process = Start-Process -FilePath 'java' `
    -ArgumentList '-jar', $jar `
    -WorkingDirectory $appDir `
    -RedirectStandardOutput $log `
    -RedirectStandardError "$log.err" `
    -PassThru

# 4. 等待端口就绪
$deadline = (Get-Date).AddSeconds(180)
while ((Get-Date) -lt $deadline) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "==> 后端已启动: http://localhost:$port (PID=$($process.Id))" -ForegroundColor Green
        exit 0
    }
    if ($process.HasExited) {
        Write-Host "!! 后端启动失败，退出码 $($process.ExitCode)，日志: $log" -ForegroundColor Red
        Get-Content $log -Tail 30 -ErrorAction SilentlyContinue
        exit 1
    }
    Start-Sleep -Seconds 2
}

Write-Host "!! 等待超时，请查看日志: $log" -ForegroundColor Red
exit 1
