# AxieStudio Documentation Rebranding Script
Write-Host "Starting AxieStudio rebranding..." -ForegroundColor Green

# Get all MDX and MD files
$files = Get-ChildItem -Path "docs" -Include "*.mdx", "*.md" -Recurse

$totalFiles = 0
$updatedFiles = 0

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Replace Langflow with AxieStudio
    $content = $content -replace "Langflow", "AxieStudio"
    $content = $content -replace "langflow", "axiestudio"
    
    # Replace URLs
    $content = $content -replace "https://docs\.langflow\.org", "https://docs.axiestudio.se"
    $content = $content -replace "https://www\.langflow\.org", "https://www.axiestudio.se"
    $content = $content -replace "langflow\.org", "axiestudio.se"
    
    # Replace Docker references
    $content = $content -replace "langflowai/langflow", "axiestudio/axiestudio"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.Name)" -ForegroundColor Yellow
        $updatedFiles++
    }
}

Write-Host "Rebranding complete!" -ForegroundColor Green
Write-Host "Total files: $totalFiles" -ForegroundColor White
Write-Host "Updated files: $updatedFiles" -ForegroundColor White
