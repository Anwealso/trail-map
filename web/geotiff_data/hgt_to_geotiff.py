#!/usr/bin/env python3
"""
Convert SRTM HGT file to GeoTIFF format
SRTM HGT files are 16-bit signed integers in big-endian format
"""

import numpy as np
import rasterio
from rasterio.transform import from_origin
import sys

def hgt_to_geotiff(hgt_file, output_file):
    """Convert SRTM HGT file to GeoTIFF"""
    
    # Parse tile coordinates from filename (e.g., S27E152.hgt)
    filename = hgt_file.split('/')[-1].replace('.hgt', '')
    
    # Extract latitude and longitude
    lat_dir = filename[0]  # N or S
    lat_val = int(filename[1:3])
    lon_dir = filename[3]  # E or W
    lon_val = int(filename[4:7])
    
    # Calculate bounds
    if lat_dir == 'S':
        south = -lat_val
        north = -lat_val + 1
    else:
        south = lat_val
        north = lat_val + 1
        
    if lon_dir == 'W':
        west = -lon_val
        east = -lon_val + 1
    else:
        west = lon_val
        east = lon_val + 1
    
    # SRTM1 is 1-arcsecond resolution: 3601 x 3601 pixels
    nrows = 3601
    ncols = 3601
    
    # Read the HGT file
    # Data is 16-bit signed integers, big-endian
    data = np.fromfile(hgt_file, dtype='>i2')
    
    # Reshape to 2D array
    elevation = data.reshape((nrows, ncols))
    
    # Flip vertically (SRTM data is stored south to north)
    elevation = np.flipud(elevation)
    
    # Convert to native byte order (required by rasterio)
    elevation = elevation.astype(np.int16)
    
    # Calculate pixel size
    pixel_width = (east - west) / ncols
    pixel_height = (north - south) / nrows
    
    # Create transform (Affine transformation)
    transform = from_origin(west, north, pixel_width, pixel_height)
    
    # Write to GeoTIFF
    with rasterio.open(
        output_file,
        'w',
        driver='GTiff',
        height=nrows,
        width=ncols,
        count=1,
        dtype=elevation.dtype,
        crs='EPSG:4326',  # WGS84
        transform=transform,
        compress='lzw',
        tiled=True,
        nodata=-32768  # SRTM nodata value
    ) as dst:
        dst.write(elevation, 1)
    
    print(f"Successfully converted {hgt_file} to {output_file}")
    print(f"Bounds: {west}, {south}, {east}, {north}")
    print(f"Resolution: {pixel_width:.6f} degrees (~30m)")
    print(f"Data range: {elevation.min()} to {elevation.max()} meters")

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 hgt_to_geotiff.py <input.hgt> <output.tif>")
        sys.exit(1)
    
    hgt_to_geotiff(sys.argv[1], sys.argv[2])
