import React from 'react';

interface LogViewerProps {
  logs: string[];
}

const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '350px',
      height: '200px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: '#0f0',
      fontFamily: 'monospace',
      fontSize: '12px',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column-reverse', // Zobrazuje nejnovější logy nahoře
      overflowY: 'scroll'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
        {logs.map((log, index) => (
          <div key={index} style={{ borderBottom: '1px solid #333', paddingBottom: '2px', marginBottom: '2px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogViewer;
