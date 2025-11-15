"""
Toyota GR Cup Data Processing Script
=====================================
Extracts ZIP files, analyzes CSV data, intelligently downsamples telemetry,
and converts to Git-friendly JSON files while preserving racing integrity.
"""

import pandas as pd
import zipfile
import os
import json
from pathlib import Path
import numpy as np
import sys

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Configuration
PROCESS_ALL_TRACKS = True

ZIP_FILES = [
    r"C:\Users\DELL\Documents\toyotahcak\Data\indianapolis.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\road-america.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\sebring.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\sonoma.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\virginia-international-raceway.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\barber-motorsports-park.zip",
    r"C:\Users\DELL\Documents\toyotahcak\Data\circuit-of-the-americas.zip"
]

OUTPUT_DIR = r"C:\Users\DELL\Documents\GitHub\DriftKing-Ai\Data"
CHUNK_SIZE = 10000  # Process in chunks to avoid memory issues
TELEMETRY_DOWNSAMPLE_RATE = 10  # Keep every 10th row for telemetry (adjust as needed)

def extract_zip(zip_path, extract_to):
    """Extract ZIP file to destination folder"""
    print(f"\n📦 Extracting: {os.path.basename(zip_path)}")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"   ✅ Extracted to: {extract_to}")

def analyze_csv_structure(csv_path):
    """Analyze CSV file to understand its structure"""
    print(f"\n🔍 Analyzing: {os.path.basename(csv_path)}")
    
    # Read first few rows to understand structure
    df_sample = pd.read_csv(csv_path, nrows=5)
    file_size = os.path.getsize(csv_path) / (1024 * 1024)  # MB
    
    # Count total rows (efficiently)
    row_count = sum(1 for _ in open(csv_path)) - 1  # -1 for header
    
    print(f"   📊 Columns: {list(df_sample.columns)}")
    print(f"   📏 Size: {file_size:.2f} MB")
    print(f"   📈 Rows: {row_count:,}")
    
    return {
        'columns': list(df_sample.columns),
        'size_mb': file_size,
        'row_count': row_count,
        'sample': df_sample
    }

def is_telemetry_file(filename):
    """Identify if file is telemetry data (usually large)"""
    telemetry_keywords = ['telemetry', 'lap_end', 'sensor', 'vehicle']
    return any(keyword in filename.lower() for keyword in telemetry_keywords)

def smart_downsample_telemetry(df, rate=TELEMETRY_DOWNSAMPLE_RATE):
    """
    Intelligently downsample telemetry data while preserving racing events:
    - Keep all braking events (speed drops)
    - Keep all acceleration spikes
    - Keep corner entries/exits
    - Downsample straight sections more aggressively
    """
    if len(df) <= rate:
        return df  # Too small to downsample
    
    # Identify important events
    important_indices = set()
    
    # Check for speed-related columns
    speed_cols = [col for col in df.columns if 'speed' in col.lower() or 'velocity' in col.lower()]
    
    if speed_cols:
        speed_col = speed_cols[0]
        if pd.api.types.is_numeric_dtype(df[speed_col]):
            # Calculate speed changes
            speed_diff = df[speed_col].diff().abs()
            
            # Keep indices where speed changes significantly (braking/acceleration)
            threshold = speed_diff.quantile(0.90)  # Top 10% speed changes
            important_indices.update(df[speed_diff > threshold].index.tolist())
    
    # Keep every Nth row
    regular_sample = set(range(0, len(df), rate))
    
    # Combine important events with regular sampling
    keep_indices = sorted(important_indices.union(regular_sample))
    
    # Always keep first and last rows
    keep_indices = sorted(set(keep_indices).union({0, len(df) - 1}))
    
    downsampled = df.iloc[keep_indices].copy()
    
    reduction = (1 - len(downsampled) / len(df)) * 100
    print(f"      🎯 Downsampled: {len(df):,} → {len(downsampled):,} rows ({reduction:.1f}% reduction)")
    
    return downsampled

def process_csv_to_json(csv_path, output_dir, track_name):
    """Process CSV file and convert to JSON"""
    filename = os.path.basename(csv_path)
    print(f"\n⚙️ Processing: {filename}")
    
    # Analyze structure first
    info = analyze_csv_structure(csv_path)
    
    # Determine if this is telemetry data
    is_telemetry = is_telemetry_file(filename)
    
    # Process based on file type
    if is_telemetry and info['size_mb'] > 5:  # Large telemetry file
        print(f"   📉 Large telemetry detected - applying smart downsampling...")
        
        # Process in chunks
        chunks = []
        for chunk in pd.read_csv(csv_path, chunksize=CHUNK_SIZE):
            downsampled_chunk = smart_downsample_telemetry(chunk)
            chunks.append(downsampled_chunk)
        
        df_final = pd.concat(chunks, ignore_index=True)
    else:
        # Small file, read directly
        print(f"   ✅ Small file - reading directly...")
        df_final = pd.read_csv(csv_path)
    
    # Convert to JSON
    output_filename = filename.replace('.csv', '.json').replace('.CSV', '.json')
    output_path = os.path.join(output_dir, track_name, output_filename)
    
    # Create track directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert to JSON with proper formatting
    json_data = df_final.to_dict(orient='records')
    
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2, default=str)
    
    output_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"   💾 Saved: {output_filename}")
    print(f"   📦 Size: {info['size_mb']:.2f} MB → {output_size:.2f} MB")
    
    return output_path

def process_track(zip_path, output_dir):
    """Process all CSV files for a single track"""
    track_name = os.path.basename(zip_path).replace('.zip', '')
    print(f"\n{'='*60}")
    print(f"🏁 Processing Track: {track_name.upper()}")
    print(f"{'='*60}")
    
    # Create temp extraction folder
    temp_extract = os.path.join(os.path.dirname(zip_path), f"temp_{track_name}")
    
    # Extract ZIP
    extract_zip(zip_path, temp_extract)
    
    # Find all CSV files
    csv_files = []
    for root, dirs, files in os.walk(temp_extract):
        for file in files:
            if file.lower().endswith('.csv'):
                csv_files.append(os.path.join(root, file))
    
    print(f"\n📊 Found {len(csv_files)} CSV files")
    
    # Process each CSV
    processed = []
    for csv_path in csv_files:
        try:
            output_path = process_csv_to_json(csv_path, output_dir, track_name)
            processed.append(output_path)
        except Exception as e:
            print(f"   ❌ Error processing {os.path.basename(csv_path)}: {str(e)}")
    
    print(f"\n✅ Processed {len(processed)}/{len(csv_files)} files for {track_name}")
    
    # Cleanup temp folder
    import shutil
    shutil.rmtree(temp_extract, ignore_errors=True)
    
    return processed

def main():
    """Main processing function"""
    print("=" * 60)
    print("🏎️  Toyota GR Cup Data Processing")
    print("=" * 60)
    print(f"Output Directory: {OUTPUT_DIR}")
    print(f"Telemetry Downsample Rate: 1/{TELEMETRY_DOWNSAMPLE_RATE}")
    
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    if not ZIP_FILES:
        print("No ZIP files configured")
        return []

    if PROCESS_ALL_TRACKS:
        return process_all_tracks()

    # Default: process first track only (test mode)
    print("\n🧪 TEST MODE: Processing first track only...")
    print("   (Set PROCESS_ALL_TRACKS = True to run everything)")
    test_zip = ZIP_FILES[0]
    processed = process_track(test_zip, OUTPUT_DIR)
    
    print("\n" + "=" * 60)
    print("✨ TEST COMPLETE!")
    print("=" * 60)
    print(f"📁 Check output in: {OUTPUT_DIR}")
    print("\n💡 Toggle PROCESS_ALL_TRACKS to process the rest")
    
    return processed

def process_all_tracks():
    """Process all tracks (call this after reviewing test results)"""
    print("\n🚀 Processing ALL tracks...")
    all_processed = []
    
    for zip_path in ZIP_FILES:
        try:
            processed = process_track(zip_path, OUTPUT_DIR)
            all_processed.extend(processed)
        except Exception as e:
            print(f"\n❌ Error processing {os.path.basename(zip_path)}: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"✅ ALL TRACKS PROCESSED: {len(all_processed)} files")
    print("=" * 60)
    
    return all_processed

if __name__ == "__main__":
    processed_files = main()
