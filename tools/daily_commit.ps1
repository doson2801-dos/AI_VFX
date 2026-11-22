# Daily knowledge commit for Game_AI. Runs from Task Scheduler at 18:00.
# Only ever pushes game-ai-prototype. The main branch has its own schedule elsewhere.
# Manual run: powershell -NoProfile -ExecutionPolicy Bypass -File tools\daily_commit.ps1 [-DryRun]
param([switch]$DryRun)

$ErrorActionPreference = 'Continue'
$Branch = 'game-ai-prototype'
$Git = 'C:\Program Files\Git\cmd\git.exe'
$Repo = Split-Path $PSScriptRoot -Parent
$LogFile = Join-Path $PSScriptRoot 'daily_commit.log'
$LockFile = Join-Path $PSScriptRoot '.daily_commit.lock'
$Scope = @('CLAUDE.md', 'docs', '.claude/agents', '.claude/rules', '.claude/skills', 'tools/daily_commit.ps1')

# Never wait for a login window in a background task.
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

function Write-RunLog([string]$Message) {
    $line = '{0:yyyy-MM-dd HH:mm:ss}  {1}' -f (Get-Date), $Message
    Write-Output $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Stop-Run([string]$Message) {
    Write-RunLog "STOPPED: $Message"
    exit 1
}

try {
    $lock = [IO.File]::Open($LockFile, 'OpenOrCreate', 'ReadWrite', 'None')
} catch {
    Write-RunLog 'Skipped: another run is in progress.'
    exit 0
}

try {
    $current = & $Git -C $Repo symbolic-ref --short HEAD
    if ($current -ne $Branch) { Stop-Run "current branch is '$current', expected '$Branch'." }

    & $Git -C $Repo fetch -q origin "+refs/heads/${Branch}:refs/remotes/origin/$Branch"
    if ($LASTEXITCODE -ne 0) { Stop-Run 'fetch failed.' }

    $behind = [int](& $Git -C $Repo rev-list --count "HEAD..origin/$Branch")
    if ($behind -gt 0) { Stop-Run "remote branch has $behind commit(s) not on this PC. Pull first." }

    $paths = @($Scope | Where-Object { Test-Path (Join-Path $Repo $_) })
    $changes = @(& $Git -C $Repo status --porcelain -uall -- $paths)

    if ($DryRun) {
        Write-RunLog "Dry run: $($changes.Count) knowledge file(s) would be committed."
        $changes | ForEach-Object { Write-Output $_ }
        exit 0
    }

    if ($changes.Count -gt 0) {
        & $Git -C $Repo add -- $paths
        if ($LASTEXITCODE -ne 0) { Stop-Run 'git add failed.' }
        $message = 'Auto {0:yyyy-MM-dd HH:mm}: knowledge ({1} files)' -f (Get-Date), $changes.Count
        & $Git -C $Repo commit -q -m $message -- $paths
        if ($LASTEXITCODE -ne 0) { Stop-Run 'git commit failed.' }
        Write-RunLog "Committed: $message"
    } else {
        Write-RunLog 'No knowledge changes.'
    }

    $ahead = [int](& $Git -C $Repo rev-list --count "origin/$Branch..HEAD")
    if ($ahead -gt 0) {
        & $Git -C $Repo push -q origin "refs/heads/${Branch}:refs/heads/$Branch"
        if ($LASTEXITCODE -ne 0) { Stop-Run 'push failed. GitHub login may have expired.' }
        Write-RunLog "Pushed $ahead commit(s) to $Branch."
    }
    exit 0
} finally {
    $lock.Dispose()
}
