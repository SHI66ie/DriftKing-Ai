# DriftKing AI - Data Access Guide

## 📊 Dataset Overview

This project uses **18+ GB** of Toyota GR Cup racing data, including:
- **46.5 million telemetry data points** from Barber and COTA tracks
- Race results from all 7 tracks (Barber, COTA, Indianapolis, Road America, Sebring, Sonoma, VIR)
- Weather conditions and lap times
- Telemetry data: speed, throttle, brake, steering, GPS coordinates, etc.

## 🌐 Data Storage

Due to the large size (18+ GB), the data is **NOT** stored in this Git repository. Instead, it's hosted on:

### **Google Drive**
- The complete dataset is available on Google Drive
- Contact the repository owner for access link
- Download and place in the `Data/` folder of your local clone

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
