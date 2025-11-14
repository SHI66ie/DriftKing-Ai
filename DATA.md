# DriftKing AI - Data Access Guide

## 📊 Dataset Overview

This project uses **18+ GB** of Toyota GR Cup racing data, including:
- **46.5 million telemetry data points** from Barber and COTA tracks
- Race results from all 7 tracks (Barber, COTA, Indianapolis, Road America, Sebring, Sonoma, VIR)
- Weather conditions and lap times
- Telemetry data: speed, throttle, brake, steering, GPS coordinates, etc.

## 🌐 Data Storage

Due to the large size (18+ GB), the data is **NOT** stored in this Git repository. Instead, it's hosted on:

### **Google Drive (Recommended)**
- **Direct Integration**: The app can load data directly from Google Drive
- **Download Link**: [Toyota GR Cup Data (18+ GB)](https://drive.google.com/drive/folders/1AvpoKZzY7CVtcSBX8wA7Oq8JfAWo-oou?usp=sharing)
- **Setup**: Configure Google Drive API (see below) or download manually

### **Local Storage (Alternative)**
- Download the complete dataset from Google Drive
- Extract/place files in the `Data/` folder of your local clone

## 📁 Local Data Structure

Once downloaded, your `Data/` folder should look like this:

```
Data/
├── barber/
│   ├── R1_barber_telemetry_data_chunk_0.json
│   ├── R1_barber_telemetry_data_chunk_1.json
│   ├── ... (1,156 chunk files)
│   ├── R1_barber_lap_time.json
│   ├── R1_barber_weather.json
│   └── race_results.json
├── COTA/
│   └── ... (similar structure)
├── extracted/
│   └── (CSV files if you extract from ZIPs)
└── *.zip (original ZIP files)
```

## 🔧 Google Drive API Setup (Recommended)

To enable direct loading from Google Drive:

### 1. **Get Google Drive API Key**
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable **Google Drive API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. **Configure Environment**
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Add your API key:
   ```env
   GOOGLE_DRIVE_API_KEY=your_actual_api_key_here
   ```

### 3. **Deploy with Google Drive**
- ✅ **Netlify/Vercel**: Add environment variable in dashboard
- ✅ **Local Development**: Use `.env.local` file
- ✅ **No Downloads**: Data loads directly from Google Drive
- ✅ **Always Updated**: Uses latest data from shared folder

## 🔄 Alternative: Convert from Source

If you have the original ZIP files from trddev.com/hackathon-2025, you can generate the JSON data locally:

```bash
# 1. Place ZIP files in Data/ folder
# 2. Extract and convert all data
npm run convert-all

# Or run steps individually:
npm run extract-zips        # Extract ZIP files
npm run convert-csv         # Convert small CSVs to JSON
npm run convert-large-csv   # Convert telemetry CSVs to chunked JSON (takes 2-4 hours)
```

## 📦 Data Files

### Small Files (~15 MB)
- Race results (official and provisional)
- Weather data (temperature, humidity, wind)
- Lap times with vehicle IDs
- Best lap analysis

### Large Telemetry Files (~18 GB)
- Split into 10,000-row chunks for efficient loading
- Each chunk is ~4 MB
- Index files describe total rows and chunks
- Format: `{track}_telemetry_data_chunk_{number}.json`

## 🚀 Using the Data

The app automatically loads data from the `Data/` folder when running locally:

```bash
npm run dev
# Navigate to http://localhost:3000
# Data loads from Data/ directory
```

## 📝 Data Format

All data is in JSON format for easy parsing:

**Telemetry Data Example:**
```json
{
  "lap": 5,
  "vehicle_id": "GR86-002-000",
  "timestamp": "2025-09-05T00:33:40.721Z",
  "telemetry_name": "Speed",
  "telemetry_value": 145.6
}
```

**Weather Data Example:**
```json
{
  "timestamp": "2025-09-05T00:30:00Z",
  "air_temp": 85.2,
  "humidity": 45,
  "wind_speed": 8.5
}
```

## 🔐 Data Privacy

All driver names and personal information have been anonymized in accordance with privacy requirements.

## 📞 Support

For access to the Google Drive data or questions about the dataset:
- Open an issue in this repository
- Contact the repository maintainer
kbshai cl id 917609267798-da6r1scqkm7kl1t0nus0pnf49h6f57tj.apps.googleusercontent.com

