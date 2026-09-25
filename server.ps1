# VK CONTROLS Lightweight Local Web Server
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "⚡ VK CONTROLS is live at: http://localhost:$port/" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Cyan

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $req = $context.Request
            $res = $context.Response

            $rawPath = $req.Url.LocalPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($rawPath)) {
                $rawPath = "index.html"
            }

            $filePath = Join-Path $PSScriptRoot $rawPath

            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()

                switch ($ext) {
                    ".html" { $res.ContentType = "text/html; charset=utf-8" }
                    ".css"  { $res.ContentType = "text/css; charset=utf-8" }
                    ".js"   { $res.ContentType = "application/javascript; charset=utf-8" }
                    ".json" { $res.ContentType = "application/json; charset=utf-8" }
                    ".png"  { $res.ContentType = "image/png" }
                    ".jpg"  { $res.ContentType = "image/jpeg" }
                    ".svg"  { $res.ContentType = "image/svg+xml" }
                    default { $res.ContentType = "application/octet-stream" }
                }

                $res.ContentLength64 = $bytes.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            }
            else {
                $res.StatusCode = 404
                $err = [System.Text.Encoding]::UTF8.GetBytes("404 - Not Found")
                $res.ContentLength64 = $err.Length
                if ($req.HttpMethod -ne "HEAD") {
                    $res.OutputStream.Write($err, 0, $err.Length)
                }
            }
        }
        catch {
            Write-Host "Error serving request: $_" -ForegroundColor Red
        }
        finally {
            if ($context.Response) {
                try { $context.Response.Close() } catch {}
            }
        }
    }
}
finally {
    $listener.Stop()
}
