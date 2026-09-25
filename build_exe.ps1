Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host ""
Write-Host "=== Icon Copy Table : build EXE ==="
Write-Host ""

$py = $null
foreach ($candidate in @("py -3", "python", "python3")) {
  try {
    $null = Invoke-Expression "$candidate -c ""import sys; print(sys.version)"""
    $py = $candidate
    break
  } catch {
    $py = $null
  }
}
if (-not $py) {
  Write-Error "Python 3.11+ was not found."
  exit 1
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Invoke-Expression "$py -m venv .venv"
}

$vpy = ".venv\Scripts\python.exe"
& $vpy -m pip install -U pip
& $vpy -m pip install -r requirements.txt -r requirements-build.txt
& $vpy -c "from aio_logo import write_build_icon; write_build_icon('icon.ico')"
& $vpy -m PyInstaller --noconfirm --clean IconCopyTable.spec
Write-Host "EXE: $((Get-Location).Path)\dist\IconCopyTable.exe"
