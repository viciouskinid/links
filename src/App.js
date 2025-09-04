import React from 'react';
import LinksList from './components/LinksList';

function App() {
  return (
    <div style={{
      height: '100vh',
      backgroundColor: '#f5f7fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <main style={{
        flex: 1,
        overflow: 'hidden'
      }}>
        <LinksList />
      </main>
    </div>
  );
}

export default App;
