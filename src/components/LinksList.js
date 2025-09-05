import React, { useState, useEffect } from 'react';

const LinksList = () => {
  const [links, setLinks] = useState([]);
  const [currentView, setCurrentView] = useState('main');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', description: '' });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load links from localStorage on component mount
  useEffect(() => {
    const savedLinks = localStorage.getItem('linksData');
    console.log('Loading from localStorage:', savedLinks ? 'found data' : 'no data');
    if (savedLinks && savedLinks !== 'undefined') {
      try {
        const parsedLinks = JSON.parse(savedLinks);
        console.log('Parsed links:', parsedLinks.length, 'items');
        if (Array.isArray(parsedLinks)) {
          setLinks(parsedLinks);
        } else {
          console.log('Invalid data format in localStorage, clearing...');
          setLinks([]);
        }
      } catch (error) {
        console.error('Error parsing saved links:', error);
        setLinks([]);
      }
    } else {
      console.log('No valid data in localStorage, starting with empty array');
      setLinks([]);
    }
    setIsInitialLoad(false);
  }, []);

  // Save links to localStorage whenever links change (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      console.log('Saving links to localStorage:', links.length, 'items');
      localStorage.setItem('linksData', JSON.stringify(links));
      setLastSaved(new Date());
    }
  }, [links, isInitialLoad]);

  // Parse URL path for folder navigation
  useEffect(() => {
    const path = window.location.pathname;
    // Remove the base path for GitHub Pages (/links)
    const basePath = process.env.NODE_ENV === 'production' ? '/links' : '';
    const relativePath = path.startsWith(basePath) ? path.slice(basePath.length) : path;
    const pathSegments = relativePath.split('/').filter(segment => segment);
    
    if (pathSegments.length === 0) {
      setCurrentView('main');
      setCurrentFolder(null);
      setBreadcrumb([]);
    } else {
      const folderName = decodeURIComponent(pathSegments[0]);
      const folder = links.find(item => item.folder && item.name === folderName);
      if (folder) {
        setCurrentView('folder');
        setCurrentFolder(folder);
        setBreadcrumb([{ name: folderName, folder: folder }]);
      } else {
        // Redirect to the correct base path
        const redirectPath = process.env.NODE_ENV === 'production' ? '/links/' : '/';
        window.history.pushState({}, '', redirectPath);
        setCurrentView('main');
        setCurrentFolder(null);
        setBreadcrumb([]);
      }
    }
  }, [links]);

  const handleFolderClick = (folder) => {
    const encodedName = encodeURIComponent(folder.name);
    const basePath = process.env.NODE_ENV === 'production' ? '/links' : '';
    window.history.pushState({}, '', `${basePath}/${encodedName}`);
    setCurrentView('folder');
    setCurrentFolder(folder);
    setBreadcrumb([{ name: folder.name, folder: folder }]);
    setShowAddForm(false);
  };

  const handleBackClick = () => {
    const basePath = process.env.NODE_ENV === 'production' ? '/links/' : '/';
    window.history.pushState({}, '', basePath);
    setCurrentView('main');
    setCurrentFolder(null);
    setBreadcrumb([]);
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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const uploadedData = JSON.parse(e.target.result);
          if (Array.isArray(uploadedData)) {
            console.log('Importing data:', uploadedData.length, 'items');
            setLinks(uploadedData);
            // Explicitly save to localStorage to ensure it persists
            localStorage.setItem('linksData', JSON.stringify(uploadedData));
            setShowUploadForm(false);
            alert('Links imported successfully!');
          } else {
            alert('Invalid JSON format. Please upload a valid links array.');
          }
        } catch (error) {
          alert('Error reading JSON file. Please check the file format.');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file.');
    }
  };

  const handleDownloadData = () => {
    const dataStr = JSON.stringify(links, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'links.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setLinks([]);
      localStorage.removeItem('linksData');
      setCurrentView('main');
      setCurrentFolder(null);
      setBreadcrumb([]);
      setShowAddForm(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Name and description are required');
      return;
    }

    if (!formData.url.trim()) {
      // Adding a folder
      const newFolder = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        folder: []
      };

      if (currentView === 'main') {
        setLinks([...links, newFolder]);
      } else if (currentView === 'folder' && currentFolder) {
        const updatedLinks = links.map(item => {
          if (item === currentFolder) {
            return {
              ...item,
              folder: [...item.folder, newFolder]
            };
          }
          return item;
        });
        setLinks(updatedLinks);
      }
    } else {
      // Adding a link
      const newLink = {
        name: formData.name.trim(),
        url: formData.url.trim(),
        description: formData.description.trim()
      };

      if (currentView === 'main') {
        setLinks([...links, newLink]);
      } else if (currentView === 'folder' && currentFolder) {
        const updatedLinks = links.map(item => {
          if (item === currentFolder) {
            return {
              ...item,
              folder: [...item.folder, newLink]
            };
          }
          return item;
        });
        setLinks(updatedLinks);
      }
    }

    setFormData({ name: '', url: '', description: '' });
    setShowAddForm(false);
  };

  const renderLinks = (items) => {
    if (!items || items.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666',
          fontSize: '18px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
          <p>No links yet!</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Upload a JSON file or start adding links manually
          </p>
        </div>
      );
    }

    return (
      <div style={{
        display: 'grid',
        gridTemplateRows: 'repeat(auto-fit, 60px)',
        gridAutoFlow: 'column',
        gap: '2px',
        padding: '10px 20px',
        height: 'calc(100vh - 120px)',
        overflow: 'auto',
        gridAutoColumns: '1fr'
      }}>
        {items.map((item, index) => {
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
                <div style={{
                  width: '20px',
                  height: '20px',
                  marginRight: '12px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={`https://www.google.com/s2/favicons?sz=64&domain=${new URL(item.url).hostname}`}
                    alt="Site icon"
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '2px'
                    }}
                    onError={(e) => {
                      // Fallback to chain icon if favicon fails to load
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <span style={{
                    display: 'none',
                    fontSize: '16px'
                  }}>🔗</span>
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
    );
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Left side - Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 
              onClick={handleHomeClick}
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '700',
                color: '#1f2937',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🔗 Links
            </h1>
            
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>→</span>
                {breadcrumb.map((crumb, index) => (
                  <span key={index} style={{
                    color: '#3b82f6',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}>
                    {crumb.name}
                  </span>
                ))}
              </nav>
            )}
          </div>

          {/* Right side - Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {links.length > 0 && (
              <>
                <button
                  onClick={handleDownloadData}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  💾 Export
                </button>
                {lastSaved && (
                  <span style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ✓ Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={handleClearData}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  🗑️ Clear
                </button>
              </>
            )}
            
            <button
              onClick={() => setShowUploadForm(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📂 Import
            </button>

            <button
              onClick={handleAddNew}
              style={{
                padding: '6px 12px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ➕ Add New
            </button>

            {currentView === 'folder' && (
              <button
                onClick={handleBackClick}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {currentView === 'main' && renderLinks(links)}
        {currentView === 'folder' && currentFolder && renderLinks(currentFolder.folder)}
      </main>

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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Add New {currentView === 'folder' ? `Item to ${currentFolder?.name}` : 'Item'}
            </h2>
            
            <form onSubmit={handleFormSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  URL (leave empty to create a folder)
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter description"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                  required
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', url: '', description: '' });
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Add {formData.url ? 'Link' : 'Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadForm && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Import Links from JSON File
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#f9fafb',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              <strong>Note:</strong> Importing will replace your current data. Make sure to export your current links first if you want to keep them.
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowUploadForm(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinksList;
