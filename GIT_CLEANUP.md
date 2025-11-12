# Git Repository Cleanup Guide

## Current Situation
Your repository has 5 local commits ahead of origin that include:
1. Large CSV files tracked with Git LFS (some exceeding 2 GB)
2. These files are now loaded remotely from trddev.com instead
3. The local `Data/extracted/` folder is no longer needed in the repository

## GitHub LFS Size Limit Issue
GitHub LFS has a **2 GB per-file limit**. Your repository has 5 telemetry CSV files exceeding this:
- `sonoma_telemetry_R1.csv` (3.6 GB)
- `R2_indianapolis_motor_speedway_telemetry.csv` (3.2 GB)
- `R1_indianapolis_motor_speedway_telemetry.csv` (3.0 GB)
- `R1_cota_telemetry_data.csv` (2.3 GB)
- `R2_cota_telemetry_data.csv` (2.2 GB)

## Cleanup Steps

### Option 1: Reset and Recommit (Simplest)
If you haven't shared these commits with others, reset to origin and commit only the code:

```bash
# Save your code changes
git stash

# Reset to match origin
git reset --hard origin/main

# Restore your code changes
git stash pop

# Remove the Data folder from git tracking
git rm -r --cached Data/

# Update .gitignore
echo "Data/" >> .gitignore

# Commit the clean code
git add .
git commit -m "feat: Load racing data from trddev.com instead of local files

- Add remote ZIP fetching with adm-zip
- Implement in-memory caching for extracted CSV files
- Remove local Data folder from repository
- Bypass GitHub LFS 2GB file size limits"

# Push to origin
git push
```

### Option 2: Keep History, Remove Large Files
If you want to keep commit history but remove the large files:

```bash
# Remove Data folder from the last 5 commits
git filter-branch --tree-filter 'rm -rf Data' HEAD~5..HEAD

# Update .gitignore
echo "Data/" >> .gitignore

# Commit the gitignore change
git add .gitignore
git commit -m "chore: Ignore Data folder"

# Force push (WARNING: Rewrites history)
git push --force-with-lease
```

### Option 3: BFG Repo Cleaner (Advanced)
For a thorough cleanup of Git history:

```bash
# Install BFG: https://rtyley.github.io/bfg-repo-cleaner/
# Or use: scoop install bfg (on Windows with Scoop)

# Clone a fresh copy
cd ..
git clone --mirror https://github.com/SHI66ie/DriftKing-Ai.git

# Remove the Data folder from all history
bfg --delete-folders Data DriftKing-Ai.git

# Clean up
cd DriftKing-Ai.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push the cleaned history
git push

# Update your local repo
cd ../DriftKing-Ai
git pull --force
```

## Recommended Approach

**Use Option 1** - It's the simplest and safest:

1. Your app now loads data from trddev.com ✅
2. No need to store 29 GB of data in git
3. Clean commit history without large file issues
4. Can push to GitHub without LFS problems

## After Cleanup

Once you've cleaned up and pushed successfully:

1. ✅ Delete your local `Data/extracted/` folder (optional, saves 29+ GB)
2. ✅ Verify the app still works (data loads from trddev.com)
3. ✅ Share the repository without storage concerns

## Verification

To verify the cleanup worked:

```bash
# Check repository size
git count-objects -vH

# Check for large files
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | sort -nr -k2 | head -20

# Verify push works
git push
```

## Notes

- The app will continue to work since it now fetches data remotely
- First load will be slower (ZIP download), subsequent loads are instant (cached)
- No more git tracking of large data files
- Easy to update data source by changing ZIP URLs
