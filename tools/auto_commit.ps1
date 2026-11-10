# Đồng bộ kiến thức lên git (art lead 2026-11-10). Logic nằm ở tools/sync_knowledge.py (đọc đầu file đó để biết quy tắc nhánh).
#   Chạy bởi: Task Scheduler 17:30 "VFX_LIb Auto Commit" (phòng khi sửa ngoài Claude) và hook Stop của Claude (.claude/settings.json).
#   Chạy tay: powershell -NoProfile -ExecutionPolicy Bypass -File D:\Game_prj\VFX_LIb\tools\auto_commit.ps1 [-DryRun]
param([switch]$DryRun)
$py = Join-Path $PSScriptRoot 'sync_knowledge.py'
if ($DryRun) { python -I $py --dry-run } else { python -I $py }
exit $LASTEXITCODE
