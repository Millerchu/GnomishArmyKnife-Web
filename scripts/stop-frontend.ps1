$ErrorActionPreference = "Stop"

$scriptDirectory = $PSScriptRoot
$pidFile = Join-Path $scriptDirectory ".frontend.pid"

function Get-ManagedFrontendProcess {
    if (-not (Test-Path -LiteralPath $pidFile)) {
        return $null
    }

    $pidText = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    [int]$managedProcessId = 0
    if (-not [int]::TryParse($pidText, [ref]$managedProcessId)) {
        return $null
    }

    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $managedProcessId" -ErrorAction SilentlyContinue
    if ($null -eq $processInfo -or [string]::IsNullOrWhiteSpace($processInfo.CommandLine)) {
        return $null
    }

    $commandLine = [string]$processInfo.CommandLine
    if ($commandLine -notmatch "npm(?:\.cmd)?\s+run\s+dev" -or $commandLine -notmatch "--host\s+127\.0\.0\.1") {
        return $null
    }

    return $processInfo
}

$managedProcess = Get-ManagedFrontendProcess
if ($null -eq $managedProcess) {
    if (Test-Path -LiteralPath $pidFile) {
        Remove-Item -LiteralPath $pidFile -Force
        Write-Host "Frontend PID file was stale; no unrelated process was stopped."
    }
    else {
        Write-Host "Frontend is not running."
    }
    return
}

Write-Host "Stopping frontend process tree (PID $($managedProcess.ProcessId))..."
$taskKillOutput = & taskkill.exe /PID $managedProcess.ProcessId /T /F 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Frontend process tree could not be stopped: $($taskKillOutput -join ' ')"
}

$deadline = (Get-Date).AddSeconds(10)
do {
    Start-Sleep -Milliseconds 250
    $stillRunning = Get-CimInstance Win32_Process -Filter "ProcessId = $($managedProcess.ProcessId)" -ErrorAction SilentlyContinue
} while ($null -ne $stillRunning -and (Get-Date) -lt $deadline)

if ($null -ne $stillRunning) {
    throw "Frontend process $($managedProcess.ProcessId) did not stop."
}

Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "Frontend stopped."
