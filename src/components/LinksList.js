import React, { useState, useEffect } from 'react';
import linksData from '../data/links.json';
import githubApi from '../services/githubApi';

const LinksList = () => {
  const [currentView, setCurrentView] = useState('main');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', description: '' });
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [githubToken, setGithubToken] = useState('');

  // Parse URL path for folder navigation
  useEffect(() => {
    const path = window.location.pathname;
    const pathSegments = path.split('/').filter(segment => segment);
    
    if (pathSegments.length === 0) {
      // Root path - show main page
      setCurrentView('main');
      setCurrentFolder(null);
      setBreadcrumb([]);
    } else {
      // Navigate to folder based on path
      navigateToPath(pathSegments);
    }
  }, []);

  const navigateToPath = (pathSegments) => {
    let currentData = linksData;
    let currentPath = [];
    let folderData = null;

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = decodeURIComponent(pathSegments[i]);
      const folder = currentData.find(item => 
        item.folder && item.name.toLowerCase() === segment.toLowerCase()
      );
      
      if (folder) {
        currentPath.push({ name: folder.name, path: pathSegments.slice(0, i + 1).join('/') });
        currentData = folder.folder;
        folderData = folder;
      } else {
        // Folder not found, redirect to main
        window.history.pushState({}, '', '/');
        setCurrentView('main');
        setCurrentFolder(null);
        setBreadcrumb([]);
        return;
      }
    }

    setCurrentView('folder');
    setCurrentFolder(folderData);
    setBreadcrumb(currentPath);
  };

  const handleFolderClick = (folder) => {
    const newPath = currentView === 'main' 
      ? `/${encodeURIComponent(folder.name)}`
      : `${window.location.pathname}/${encodeURIComponent(folder.name)}`;
    
    window.history.pushState({}, '', newPath);
    
    // Parse the new path
    const pathSegments = newPath.split('/').filter(segment => segment);
    navigateToPath(pathSegments);
  };

  const handleBackClick = () => {
    if (breadcrumb.length > 1) {
      // Go back one level
      const newPath = `/${breadcrumb.slice(0, -1).map(item => item.path.split('/').pop()).join('/')}`;
      window.history.pushState({}, '', newPath);
      const pathSegments = newPath.split('/').filter(segment => segment);
      navigateToPath(pathSegments);
    } else {
      // Go back to main
      window.history.pushState({}, '', '/');
      setCurrentView('main');
      setCurrentFolder(null);
      setBreadcrumb([]);
    }
    setShowAddForm(false);
  };

  const handleHomeClick = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('main');
    setCurrentFolder(null);
    setBreadcrumb([]);
    setShowAddForm(false);
  };

  const handleAddNew = () => {
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setFormData({ name: '', url: '', description: '' });
  };

  const handleSaveNew = async () => {
    if (!formData.name || !formData.description) {
      alert('Name and description are required');
      return;
    }

    // Check if user is authenticated
    if (!githubApi.hasToken()) {
      setShowAuthForm(true);
      return;
    }

    try {
      // Create new item
      const newItem = {
        name: formData.name,
        description: formData.description
      };

      // If URL is provided, it's a link; otherwise it's a folder
      if (formData.url.trim()) {
        newItem.url = formData.url;
      } else {
        newItem.folder = [];
      }

      // Get current path for folder location
      const currentPath = breadcrumb.map(item => item.name);
      
      // Add item via GitHub API
      const result = await githubApi.addNewItem(newItem, currentPath);
      
      alert(result.message + '\n\nThe page will reload automatically when GitHub Pages rebuilds (1-2 minutes).');
      
      // Reset form
      handleCancelAdd();
      
      // Optionally reload the page after a delay to show updated content
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error saving new item:', error);
      alert(`Error saving new item: ${error.message}`);
    }
  };

  const handleAuthSubmit = async () => {
    if (!githubToken.trim()) {
      alert('Please enter a GitHub token');
      return;
    }

    try {
      githubApi.setToken(githubToken);
      const testResult = await githubApi.testConnection();
      
      if (testResult.success) {
        alert(`Successfully authenticated! Found ${testResult.itemCount} items in your repository.`);
        setShowAuthForm(false);
        setGithubToken('');
        // Try to save the item again
        handleSaveNew();
      } else {
        alert(`Authentication failed: ${testResult.message}`);
        githubApi.removeToken();
      }
    } catch (error) {
      alert(`Authentication failed: ${error.message}`);
      githubApi.removeToken();
    }
  };

  const handleSignOut = () => {
    githubApi.removeToken();
    alert('Signed out from GitHub');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFavicon = (url) => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=20`;
    } catch (error) {
      return 'https://via.placeholder.com/20x20/cccccc/666666?text=?';
    }
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/20x20/cccccc/666666?text=?';
  };

  const itemsToDisplay = currentView === 'main' ? linksData : currentFolder.folder;

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Unified Header Bar */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e1e5e9',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {currentView === 'main' ? (
            <div>
              <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '600' }}>Links</h1>
              <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Your bookmark collection</p>
            </div>
          ) : (
            <div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: '600' }}>
                {currentFolder.name}
              </h2>
              <p style={{ margin: '0', color: '#666', fontSize: '12px' }}>
                {currentFolder.description}
              </p>
            </div>
          )}
        </div>
        
        {/* GitHub Authentication Status & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* GitHub Auth Status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontSize: '12px',
            color: '#666'
          }}>
            {githubApi.hasToken() ? (
              <>
                <span style={{ color: '#28a745' }}>✓ GitHub Connected</span>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: 'none',
                    border: '1px solid #dc3545',
                    color: '#dc3545',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <span style={{ color: '#ffc107' }}>⚠ GitHub Not Connected</span>
            )}
          </div>
          
          {/* Navigation */}
          {currentView === 'folder' && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={handleHomeClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007acc',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline'
                }}
              >
                Home
              </button>
              {breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  <span style={{ color: '#666', margin: '0 5px' }}>/</span>
                  <span style={{ 
                    color: index === breadcrumb.length - 1 ? '#333' : '#007acc',
                    cursor: index === breadcrumb.length - 1 ? 'default' : 'pointer',
                    textDecoration: index === breadcrumb.length - 1 ? 'none' : 'underline',
                    fontSize: '14px'
                  }}>
                    {item.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ 
        display: 'grid',
        gridTemplateRows: 'repeat(auto-fit, 60px)',
        gridAutoFlow: 'column',
        gap: '2px', 
        padding: '10px 20px',
        height: 'calc(100vh - 120px)', // Adjusted for unified header
        overflow: 'auto',
        gridAutoColumns: '1fr'
      }}>
        {itemsToDisplay.map((item, index) => {
          const isFolder = item.folder !== undefined;
          
          if (isFolder) {
            // Render folder
            return (
              <div
                key={index}
                onClick={() => handleFolderClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  backgroundColor: '#e8e8e8',
                  border: '1px solid #d0d0d0',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  height: '60px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#d0d0d0';
                  e.target.style.borderColor = '#007acc';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#e8e8e8';
                  e.target.style.borderColor = '#d0d0d0';
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  marginRight: '12px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  📁
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.name} ({item.folder.length})
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '400',
                    color: '#666666',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.2',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.description}
                  </span>
                </div>
              </div>
            );
          } else {
            // Render link
            return (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e1e5e9',
                  textDecoration: 'none',
                  color: '#333333',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                  height: '60px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#007acc';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.borderColor = '#e1e5e9';
                }}
              >
                <img
                  src={getFavicon(item.url)}
                  alt={`${item.name} icon`}
                  style={{
                    width: '20px',
                    height: '20px',
                    marginRight: '12px',
                    flexShrink: 0
                  }}
                  onError={handleImageError}
                />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.name}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '400',
                    color: '#666666',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    lineHeight: '1.2',
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.description}
                  </span>
                </div>
              </a>
            );
          }
        })}
        
        {/* Add New Item Cell */}
        <div
          onClick={handleAddNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            backgroundColor: '#f0f8ff',
            border: '2px dashed #007acc',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            height: '60px',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#e6f3ff';
            e.target.style.borderColor = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#f0f8ff';
            e.target.style.borderColor = '#007acc';
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            marginRight: '12px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#007acc'
          }}>
            +
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.2',
              color: '#007acc'
            }}>
              Add New
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '400',
              color: '#0056b3',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.2',
              marginTop: '2px'
            }}>
              Create link or folder
            </span>
          </div>
        </div>
      </div>
      
      {/* Add New Item Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Add New {formData.url.trim() ? 'Link' : 'Folder'}
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                URL <span style={{ color: '#666', fontWeight: '400' }}>(leave empty to create folder)</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description"
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCancelAdd}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#007acc',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* GitHub Authentication Modal */}
      {showAuthForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              GitHub Authentication Required
            </h3>
            
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '14px', 
              color: '#666',
              lineHeight: '1.5'
            }}>
              To add new links/folders, you need to authenticate with GitHub. 
              Create a <strong>Personal Access Token</strong> with <code>Contents: Write</code> permission for this repository.
            </p>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                GitHub Personal Access Token *
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ 
              marginBottom: '20px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666'
            }}>
              <strong>How to create a token:</strong><br/>
              1. Go to GitHub Settings → Developer settings → Personal access tokens<br/>
              2. Generate new token → Fine-grained personal access tokens<br/>
              3. Select this repository and grant "Contents: Write" permission
            </div>
            
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowAuthForm(false);
                  setGithubToken('');
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAuthSubmit}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  backgroundColor: '#007acc',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Authenticate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinksList;
