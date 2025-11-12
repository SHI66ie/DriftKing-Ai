# Data Source Configuration

## Overview
The RaceMind AI dashboard now fetches Toyota GR Cup racing data directly from **trddev.com** instead of storing files locally. This eliminates GitHub LFS limitations and ensures the app can handle large telemetry files (some exceeding 3 GB).

## How It Works

### 1. Remote ZIP Fetching
- Data is hosted at `https://trddev.com/hackathon-2025/`
- Each track has a ZIP file containing all race data (CSV files)
- ZIPs are fetched on-demand when data is requested

### 2. In-Memory Caching
- Once a ZIP is downloaded and extracted, all CSV files are cached in memory
- Subsequent requests for the same track are served instantly from cache
- Cache persists until the server restarts

### 3. API Route
- **Endpoint**: `/api/data/[track]/[...path]`
- **Example**: `/api/data/COTA/Race 1/26_Weather_Race 1_Anonymized.CSV`
- The route handles multiple path formats automatically

### Available Tracks
- `barber` → barber-motorsports-park.zip
- `cota`/`COTA` → circuit-of-the-americas.zip
- `indianapolis` → indianapolis.zip
- `road-america` → road-america.zip
- `sebring` → sebring.zip
- `sonoma`/`Sonoma` → sonoma.zip
- `vir`/`virginia-international-raceway` → virginia-international-raceway.zip

## Benefits

✅ **No GitHub LFS limits** - Files can be any size  
✅ **No local storage needed** - Data is fetched on-demand  
✅ **Fast after first load** - In-memory caching makes subsequent requests instant  
✅ **Always up-to-date** - Can easily point to updated ZIP files  
✅ **No git tracking** - The large `Data/extracted/` folder can be removed from the repo

## Migration Steps

1. ✅ Install `adm-zip` for ZIP extraction
2. ✅ Update API route to fetch from trddev.com
3. ✅ Add in-memory caching mechanism
4. ✅ Handle multiple path formats (case variations, folder structures)
5. ⏳ Test with actual data loading
6. ⏳ Remove local `Data/extracted/` folder from git
7. ⏳ Update `.gitignore` to exclude Data folder

## Testing

To verify data loading works:
1. Start the dev server: `npm run dev`
2. Navigate to the dashboard
3. Select a track (e.g., COTA)
4. Check browser console/network tab for ZIP download
5. Verify race results, weather, and lap time data loads correctly

## Debugging

If files aren't loading:
- Check server console logs for "Fetching ZIP from..."
- Look for "Cached X files for [track]" message
- Use `/api/debug/zip-contents?track=barber` to inspect ZIP structure
- Check that requested file paths match the ZIP internal structure
