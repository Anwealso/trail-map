import React from 'react';

export interface TopologyOption {
  id: string;
  name: string;
  file: string;
  description?: string;
  viewWorldSize?: number; // Span of the view in world km
  uCenter?: number; // Center of the view in heightmap image (0-1)
  vCenter?: number; // Center of the view in heightmap image (0-1)
  sourceWorldSizeX?: number; // Total world width of the source image in km
  sourceWorldSizeY?: number; // Total world height of the source image in km
}

interface TopologySelectorProps {
  options: TopologyOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export const TopologySelector: React.FC<TopologySelectorProps> = ({
  options,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1100,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        <label
          htmlFor="topology-select"
          style={{
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          Map Terrain
        </label>
        <select
          id="topology-select"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            fontFamily: 'monospace',
            borderRadius: '4px',
            border: '2px solid #ccc',
            backgroundColor: disabled ? '#f0f0f0' : 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            minWidth: '200px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = '#666';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#ccc';
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#4CAF50';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#ccc';
          }}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {disabled && (
          <div
            style={{
              marginTop: '5px',
              fontSize: '11px',
              color: '#666',
              fontStyle: 'italic',
            }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default TopologySelector;
