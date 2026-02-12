# Mount Tibrogargan Elevation Data

## Overview
This directory contains topographical data for Mount Tibrogargan in the Glass House Mountains, Queensland, Australia.

## Data Source
- **Source**: NASA SRTM (Shuttle Radar Topography Mission) GL1
- **Resolution**: 1 arc-second (~30 meters)
- **Tile**: S27E152 (covers 152°E to 153°E, -27°S to -26°S)
- **Format**: Originally HGT, converted to GeoTIFF

## Files

### 1. S27E152.hgt (25 MB)
- Raw SRTM elevation data in HGT format
- Downloaded from: https://s3.amazonaws.com/elevation-tiles-prod/skadi/S27/S27E152.hgt.gz
- 3601×3601 pixels, 16-bit signed integers
- Elevation range: -5m to 884m

### 2. mount_tibrogargan_srtm.tif (13 MB)
- GeoTIFF format with full georeferencing
- CRS: EPSG:4326 (WGS84)
- Bounds: 152.0°E to 153.0°E, -27.0°S to -26.0°S
- Resolution: ~30 meters per pixel
- Compression: LZW
- Elevation data: 16-bit signed integers

### 3. mount_tibrogargan_heightmap.png (3.6 MB)
- Grayscale heightmap for visualization
- 8-bit PNG (0-255 grayscale values)
- Elevation normalized: -5m (black) to 884m (white)
- Ready to use for terrain visualization

## Mount Tibrogargan Location
- **Coordinates**: -26.933°S, 152.950°E
- **Elevation**: 364 meters above sea level
- **Location**: Glass House Mountains National Park, Queensland, Australia

## Processing Scripts

### hgt_to_geotiff.py
Converts SRTM HGT files to GeoTIFF format with proper georeferencing.

Usage:
```bash
python hgt_to_geotiff.py S27E152.hgt mount_tibrogargan_srtm.tif
```

### dem_to_heightmap.py
Converts GeoTIFF DEM to grayscale heightmap PNG.

Usage:
```bash
python dem_to_heightmap.py mount_tibrogargan_srtm.tif mount_tibrogargan_heightmap.png
```

## Python Environment
A virtual environment (`.venv`) is included with required packages:
- numpy
- rasterio
- Pillow

Activate with:
```bash
source .venv/bin/activate
```

## Next Steps
To crop to just Mount Tibrogargan area:
```bash
gdal_translate -projwin 152.85 -26.85 152.99 -27.0 mount_tibrogargan_srtm.tif mount_tibrogargan_cropped.tif
```

Or use the heightmap in your application for terrain rendering.
