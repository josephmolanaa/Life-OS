# Prints the Windows clipboard as one JSON line for the Duckies shelf: copied files (name + size only),
# else an image (small PNG preview), else text. Must run with -STA for System.Windows.Forms.Clipboard.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$clip = [System.Windows.Forms.Clipboard]
$out = @{}
if ($clip::ContainsFileDropList()) {
  $out.files = @($clip::GetFileDropList() | Select-Object -First 12 | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | ForEach-Object {
    $item = Get-Item -LiteralPath $_
    @{ name = $item.Name; size = [int64]$item.Length }
  })
} elseif ($clip::ContainsImage()) {
  $image = $clip::GetImage()
  $full = New-Object System.IO.MemoryStream
  $image.Save($full, [System.Drawing.Imaging.ImageFormat]::Png)
  $width = [Math]::Min(160, $image.Width)
  $height = [Math]::Max(1, [int]($image.Height * $width / $image.Width))
  $thumb = New-Object System.Drawing.Bitmap $image, $width, $height
  $small = New-Object System.IO.MemoryStream
  $thumb.Save($small, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.image = @{ size = $full.Length; preview = 'data:image/png;base64,' + [Convert]::ToBase64String($small.ToArray()) }
} elseif ($clip::ContainsText()) {
  $text = $clip::GetText()
  $out.text = $text.Substring(0, [Math]::Min(2000, $text.Length))
}
[Console]::Out.Write(($out | ConvertTo-Json -Compress -Depth 4))
