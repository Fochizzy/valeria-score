Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$sourceIconPath = Join-Path $workspaceRoot 'assets\icon.png'
$androidResPath = Join-Path $workspaceRoot 'android\app\src\main\res'

if (-not (Test-Path -LiteralPath $sourceIconPath)) {
  throw "Source icon not found: $sourceIconPath"
}

$iconSizes = [ordered]@{
  'mipmap-mdpi'    = 48
  'mipmap-hdpi'    = 72
  'mipmap-xhdpi'   = 96
  'mipmap-xxhdpi'  = 144
  'mipmap-xxxhdpi' = 192
}

function New-LauncherBitmap {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Image]$SourceImage,
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [Parameter(Mandatory = $true)]
    [bool]$Round
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    if ($Round) {
      $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
      try {
        $clipPath.AddEllipse(0, 0, $Size - 1, $Size - 1)
        $graphics.SetClip($clipPath)
        $graphics.DrawImage($SourceImage, 0, 0, $Size, $Size)
      } finally {
        $clipPath.Dispose()
      }
    } else {
      $graphics.DrawImage($SourceImage, 0, 0, $Size, $Size)
    }

    return $bitmap
  } finally {
    $graphics.Dispose()
  }
}

$sourceImage = [System.Drawing.Image]::FromFile($sourceIconPath)

try {
  foreach ($resourceDirName in $iconSizes.Keys) {
    $resourceDirPath = Join-Path $androidResPath $resourceDirName
    if (-not (Test-Path -LiteralPath $resourceDirPath)) {
      New-Item -ItemType Directory -Path $resourceDirPath | Out-Null
    }

    foreach ($oldResourceName in @(
      'ic_launcher.webp',
      'ic_launcher_round.webp',
      'ic_launcher.png',
      'ic_launcher_round.png'
    )) {
      $oldResourcePath = Join-Path $resourceDirPath $oldResourceName
      if (Test-Path -LiteralPath $oldResourcePath) {
        Remove-Item -LiteralPath $oldResourcePath
      }
    }

    $size = [int]$iconSizes[$resourceDirName]

    $squareBitmap = New-LauncherBitmap -SourceImage $sourceImage -Size $size -Round:$false
    try {
      $squareBitmap.Save(
        (Join-Path $resourceDirPath 'ic_launcher.png'),
        [System.Drawing.Imaging.ImageFormat]::Png
      )
    } finally {
      $squareBitmap.Dispose()
    }

    $roundBitmap = New-LauncherBitmap -SourceImage $sourceImage -Size $size -Round:$true
    try {
      $roundBitmap.Save(
        (Join-Path $resourceDirPath 'ic_launcher_round.png'),
        [System.Drawing.Imaging.ImageFormat]::Png
      )
    } finally {
      $roundBitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}
