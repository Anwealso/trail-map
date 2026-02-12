#!/usr/bin/env python3
"""
Convert GeoTIFF DEM to grayscale heightmap (8-bit PNG)
Normalizes elevation values to 0-255 range for visualization
"""

import numpy as np
import rasterio
from PIL import Image
import sys

def dem_to_heightmap(input_file, output_file):
    """Convert DEM GeoTIFF to grayscale heightmap PNG"""
    
    # Read the DEM
    with rasterio.open(input_file) as src:
        elevation = src.read(1)
        profile = src.profile
    
    # Get min/max values (excluding nodata)
    nodata = profile.get('nodata', -32768)
    valid_data = elevation[elevation != nodata]
    
    min_elev = valid_data.min()
    max_elev = valid_data.max()
    
    print(f"Elevation range: {min_elev} to {max_elev} meters")
    
    # Normalize to 0-255 range
    heightmap = np.zeros_like(elevation, dtype=np.uint8)
    
    # Normalize valid data
    mask = elevation != nodata
    heightmap[mask] = ((elevation[mask] - min_elev) / (max_elev - min_elev) * 255).astype(np.uint8)
    
    # Save as PNG using PIL
    img = Image.fromarray(heightmap, mode='L')
    img.save(output_file)
    
    print(f"Heightmap saved to {output_file}")
    print(f"Size: {heightmap.shape[1]}x{heightmap.shape[0]} pixels")
    print(f"Grayscale range: 0-255 (mapped from {min_elev}m to {max_elev}m)")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 dem_to_heightmap.py <input.tif> <output.png>")
        sys.exit(1)
    
    dem_to_heightmap(sys.argv[1], sys.argv[2])
