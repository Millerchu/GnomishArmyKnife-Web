$ErrorActionPreference = "Stop"

$scriptDirectory = $PSScriptRoot
$frontendRoot = Split-Path -Parent $scriptDirectory
$pidFile = Join-Path $scriptDirectory ".frontend.pid"
$logDirectory = Join-Path $frontendRoot "logs"
$outputLog = Join-Path $logDirectory "frontend.log"
$errorLog = Join-Path $logDirectory "frontend-error.log"

function Get-ManagedFrontendProcessId {
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

    return $managedProcessId
}

function Test-FrontendPort {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connectResult = $client.BeginConnect("127.0.0.1", 5173, $null, $null)
        if (-not $connectResult.AsyncWaitHandle.WaitOne(250, $false)) {
            return $false
        }
        $client.EndConnect($connectResult)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

$existingProcessId = Get-ManagedFrontendProcessId
if ($null -ne $existingProcessId) {
    Write-Host "Frontend is already running (PID $existingProcessId)."
    return
}

if (Test-Path -LiteralPath $pidFile) {
    Remove-Item -LiteralPath $pidFile -Force
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

if (-not (Test-Path -LiteralPath (Join-Path $frontendRoot "node_modules"))) {
    throw "Frontend dependencies are missing. Run npm install in $frontendRoot first."
}

if ($null -eq (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm.cmd was not found in PATH."
}

if (Test-FrontendPort) {
    throw "Frontend cannot start: port 5173 is already in use."
}

$frontendProcess = Start-Process `
    -FilePath $env:ComSpec `
    -ArgumentList @("/d", "/c", "npm run dev -- --host 127.0.0.1 --strictPort") `
    -WorkingDirectory $frontendRoot `
    -RedirectStandardOutput $outputLog `
    -RedirectStandardError $errorLog `
    -PassThru

Set-Content -LiteralPath $pidFile -Value $frontendProcess.Id -NoNewline
$startupDeadline = (Get-Date).AddSeconds(30)
$startupConfirmed = $false
do {
    Start-Sleep -Milliseconds 500
    $startedProcessId = Get-ManagedFrontendProcessId
    if ($null -eq $startedProcessId) {
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        throw "Frontend process exited during startup. See $errorLog"
    }

    if (Test-FrontendPort) {
        $startupConfirmed = $true
    }
} while (-not $startupConfirmed -and (Get-Date) -lt $startupDeadline)

if (-not $startupConfirmed) {
    & taskkill.exe /PID $frontendProcess.Id /T /F 2>&1 | Out-Null
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
    throw "Frontend did not listen on port 5173 within 30 seconds. See $outputLog"
}

Write-Host "Frontend started (PID $startedProcessId)."
