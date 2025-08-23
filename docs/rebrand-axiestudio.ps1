# AxieStudio Documentation Rebranding Script
# Senior Developer Approach - Systematic and Logical

Write-Host "🎯 AxieStudio Documentation Rebranding - Senior Developer Script" -ForegroundColor Green
Write-Host "📋 Systematic rebranding of all Langflow references to AxieStudio" -ForegroundColor Yellow

# Define replacement mappings with logical context awareness
$replacements = @{
    # Core product name replacements
    "Langflow" = "AxieStudio"
    "langflow" = "axiestudio"
    
    # URL replacements
    "https://docs.langflow.org" = "https://docs.axiestudio.se"
    "https://www.langflow.org" = "https://www.axiestudio.se"
    "langflow.org" = "axiestudio.se"
    
    # Docker image replacements
    "langflowai/langflow" = "axiestudio/axiestudio"
    "langflow:latest" = "axiestudio:latest"
    
    # Package and module references
    "langflow-docs" = "axiestudio-docs"
    
    # File and directory references (be careful with these)
    "luna-for-langflow" = "enterprise-support-axiestudio"
    "welcome-to-langflow" = "welcome-to-axiestudio"
    "about-langflow" = "about-axiestudio"
    
    # GitHub and repository references
    "langflowai" = "axiestudio"
    
    # Desktop application references
    "Langflow Desktop" = "AxieStudio Desktop"
    "langflow application" = "axiestudio application"
}

# File extensions to process
$fileExtensions = @("*.mdx", "*.md", "*.json", "*.js", "*.ts")

# Directories to process (excluding build and cache directories)
$directories = @(
    "docs",
    "static"
)

# Function to safely replace content in files
function Update-FileContent {
    param(
        [string]$FilePath,
        [hashtable]$Replacements
    )
    
    try {
        $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
        $originalContent = $content
        $changed = $false
        
        foreach ($find in $Replacements.Keys) {
            $replace = $Replacements[$find]
            if ($content -match [regex]::Escape($find)) {
                $content = $content -replace [regex]::Escape($find), $replace
                $changed = $true
            }
        }
        
        if ($changed) {
            Set-Content -Path $FilePath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "✅ Updated: $FilePath" -ForegroundColor Green
            return $true
        }
        
        return $false
    }
    catch {
        Write-Host "❌ Error updating $FilePath : $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main processing logic
$totalFiles = 0
$updatedFiles = 0

Write-Host "🔍 Scanning for files to rebrand..." -ForegroundColor Cyan

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        foreach ($extension in $fileExtensions) {
            $files = Get-ChildItem -Path $directory -Filter $extension -Recurse | Where-Object {
                # Exclude build, cache, and node_modules directories
                $_.FullName -notmatch "\\(build|\.docusaurus|node_modules|\.git)\\"
            }
            
            foreach ($file in $files) {
                $totalFiles++
                if (Update-FileContent -FilePath $file.FullName -Replacements $replacements) {
                    $updatedFiles++
                }
            }
        }
    }
}

Write-Host "`n🎉 Rebranding Complete!" -ForegroundColor Green
Write-Host "📊 Statistics:" -ForegroundColor Yellow
Write-Host "   Total files scanned: $totalFiles" -ForegroundColor White
Write-Host "   Files updated: $updatedFiles" -ForegroundColor White
Write-Host "   Files unchanged: $($totalFiles - $updatedFiles)" -ForegroundColor White

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Review changes in your editor" -ForegroundColor White
Write-Host "   2. Test the documentation site" -ForegroundColor White
Write-Host "   3. Update any remaining manual references" -ForegroundColor White
Write-Host "   4. Update logos and images" -ForegroundColor White

Write-Host "`n✨ AxieStudio documentation rebranding completed successfully!" -ForegroundColor Green
