Add-Type -AssemblyName System.Drawing
$iconRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../assets/icons'))
$svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#3E6950"/><g transform="rotate(-12 256 256)"><rect x="102.4" y="102.4" width="307.2" height="307.2" rx="73.728" fill="#FFFFFF"/><g fill="#3E6950"><circle cx="169.984" cy="169.984" r="21.504"/><circle cx="342.016" cy="169.984" r="21.504"/><circle cx="256" cy="256" r="21.504"/><circle cx="169.984" cy="342.016" r="21.504"/><circle cx="342.016" cy="342.016" r="21.504"/></g></g></svg>'
[System.IO.File]::WriteAllText((Join-Path $iconRoot 'icon.svg'), $svg + "`n")
$scale = 4
$canvas = [System.Drawing.Bitmap]::new(512*$scale,512*$scale)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$green = [System.Drawing.ColorTranslator]::FromHtml('#3E6950')
$graphics.Clear($green)
$graphics.ScaleTransform($scale,$scale)
$graphics.TranslateTransform(256,256)
$graphics.RotateTransform(-12)
$graphics.TranslateTransform(-256,-256)
$shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
[float]$start = 102.4
[float]$edge = 409.6
[float]$diameter = 147.456
$shape.AddArc($start,$start,$diameter,$diameter,180,90)
$shape.AddArc($edge-$diameter,$start,$diameter,$diameter,270,90)
$shape.AddArc($edge-$diameter,$edge-$diameter,$diameter,$diameter,0,90)
$shape.AddArc($start,$edge-$diameter,$diameter,$diameter,90,90)
$shape.CloseFigure()
$graphics.FillPath([System.Drawing.Brushes]::White,$shape)
$brush = [System.Drawing.SolidBrush]::new($green)
foreach ($point in @(@(169.984,169.984),@(342.016,169.984),@(256,256),@(169.984,342.016),@(342.016,342.016))) {
 $graphics.FillEllipse($brush,[float]($point[0]-21.504),[float]($point[1]-21.504),[float]43.008,[float]43.008)
}
$exports = @{'icon-512.png'=512;'icon-maskable-512.png'=512;'icon-192.png'=192;'apple-touch-icon.png'=180;'favicon-48.png'=48;'favicon-32.png'=32;'favicon-16.png'=16}
foreach ($entry in $exports.GetEnumerator()) {
 $bitmap = [System.Drawing.Bitmap]::new($entry.Value,$entry.Value)
 $resizer = [System.Drawing.Graphics]::FromImage($bitmap)
 $resizer.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $resizer.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 $resizer.DrawImage($canvas,0,0,$entry.Value,$entry.Value)
 $bitmap.Save((Join-Path $iconRoot $entry.Key),[System.Drawing.Imaging.ImageFormat]::Png)
 $resizer.Dispose(); $bitmap.Dispose()
}
$stream = [System.IO.File]::Create((Join-Path $iconRoot 'favicon.ico'))
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]3)
$offset = 6+16*3
foreach ($size in @(16,32,48)) {
 $bytes = [System.IO.File]::ReadAllBytes((Join-Path $iconRoot "favicon-$size.png"))
 $writer.Write([byte]$size); $writer.Write([byte]$size); $writer.Write([byte]0); $writer.Write([byte]0)
 $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$bytes.Length); $writer.Write([uint32]$offset)
 $offset += $bytes.Length
}
foreach ($size in @(16,32,48)) { $writer.Write([System.IO.File]::ReadAllBytes((Join-Path $iconRoot "favicon-$size.png"))) }
$writer.Dispose(); $stream.Dispose(); $brush.Dispose(); $shape.Dispose(); $graphics.Dispose(); $canvas.Dispose()
Write-Output 'Generated SVG, seven PNG icons and multi-size favicon.ico.'
