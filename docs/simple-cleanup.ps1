# Simple AxieStudio Cleanup Script
Write-Host "Starting Langflow to AxieStudio replacement..." -ForegroundColor Green

# Get all MDX files
$files = Get-ChildItem -Path "docs" -Include "*.mdx" -Recurse

$totalFiles = 0
$updatedFiles = 0

foreach ($file in $files) {
    $totalFiles++
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    # Replace Langflow with AxieStudio
    $content = $content -replace "Langflow", "AxieStudio"
    $content = $content -replace "langflow", "axiestudio"
    
    # Replace specific phrases
    $content = $content -replace "third-party integrations with AxieStudio", "third-party integrations with AxieStudio"
    $content = $content -replace "AxieStudio's", "AxieStudio's"
    $content = $content -replace "in AxieStudio", "in AxieStudio"
    $content = $content -replace "with AxieStudio", "with AxieStudio"
    $content = $content -replace "to AxieStudio", "to AxieStudio"
    $content = $content -replace "from AxieStudio", "from AxieStudio"
    $content = $content -replace "using AxieStudio", "using AxieStudio"
    $content = $content -replace "Use AxieStudio", "Use AxieStudio"
    $content = $content -replace "connect AxieStudio", "connect AxieStudio"
    $content = $content -replace "your AxieStudio", "your AxieStudio"
    $content = $content -replace "the AxieStudio", "the AxieStudio"
    
    # Replace environment variables
    $content = $content -replace "LANGFLOW_", "AXIESTUDIO_"
    
    # Replace import statements
    $content = $content -replace "from axiestudio", "from axiestudio"
    $content = $content -replace "import axiestudio", "import axiestudio"
    $content = $content -replace "axiestudio\.", "axiestudio."
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
        $updatedFiles++
    }
}

Write-Host "Completed! Updated $updatedFiles out of $totalFiles files." -ForegroundColor Cyan
