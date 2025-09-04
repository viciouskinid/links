// GitHub API integration for updating links.json
class GitHubLinksManager {
  constructor() {
    this.repoOwner = 'cripp'; // Replace with your GitHub username
    this.repoName = 'links';  // Replace with your repository name
    this.filePath = 'src/data/links.json';
    this.apiBase = 'https://api.github.com';
  }

  // Get GitHub token from user (stored in localStorage)
  getToken() {
    return localStorage.getItem('github_token');
  }

  // Set GitHub token
  setToken(token) {
    localStorage.setItem('github_token', token);
  }

  // Remove GitHub token
  removeToken() {
    localStorage.removeItem('github_token');
  }

  // Check if user has provided a token
  hasToken() {
    return !!this.getToken();
  }

  // Validate data structure
  validateLinksData(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    return data.every(item => this.isValidItem(item));
  }

  // Validate individual item
  isValidItem(item) {
    if (!item.name || !item.description) {
      return false;
    }
    
    // Either URL or folder, not both
    if (item.url && item.folder) return false;
    if (!item.url && !item.folder) return false;
    
    // URL validation
    if (item.url) {
      try {
        new URL(item.url);
      } catch {
        return false;
      }
    }
    
    // Folder validation
    if (item.folder) {
      if (!Array.isArray(item.folder)) return false;
      return item.folder.every(subItem => this.isValidItem(subItem));
    }
    
    return true;
  }

  // Get current file content and SHA
  async getCurrentFile() {
    const token = this.getToken();
    if (!token) {
      throw new Error('GitHub token not found. Please authenticate first.');
    }

    const response = await fetch(
      `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your authentication.');
      }
      if (response.status === 404) {
        throw new Error('Repository or file not found. Please check repository settings.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    
    return {
      content,
      sha: data.sha
    };
  }

  // Update the links.json file
  async updateLinksFile(newData, commitMessage = 'Update links') {
    const token = this.getToken();
    if (!token) {
      throw new Error('GitHub token not found. Please authenticate first.');
    }

    // Validate data
    if (!this.validateLinksData(newData)) {
      throw new Error('Invalid data structure');
    }

    try {
      // Get current file SHA
      const { sha } = await this.getCurrentFile();
      
      // Update file
      const response = await fetch(
        `${this.apiBase}/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: commitMessage,
            content: btoa(JSON.stringify(newData, null, 2)),
            sha: sha
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update file: ${errorData.message || response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GitHub API Error:', error);
      throw error;
    }
  }

  // Add a new item to the appropriate location
  async addNewItem(newItem, currentPath = []) {
    try {
      const { content: currentData } = await this.getCurrentFile();
      
      let targetArray = currentData;
      let locationDescription = 'main page';
      
      // Navigate to the correct folder if we're in a subfolder
      if (currentPath.length > 0) {
        for (const pathSegment of currentPath) {
          const folder = targetArray.find(item => 
            item.folder && item.name === pathSegment
          );
          if (!folder) {
            throw new Error(`Folder not found: ${pathSegment}`);
          }
          targetArray = folder.folder;
          locationDescription = `folder: ${pathSegment}`;
        }
      }
      
      // Add the new item
      targetArray.push(newItem);
      
      // Update the file
      const commitMessage = `Add ${newItem.folder ? 'folder' : 'link'}: ${newItem.name} to ${locationDescription}`;
      await this.updateLinksFile(currentData, commitMessage);
      
      return {
        success: true,
        message: `Successfully added ${newItem.name} to ${locationDescription}`
      };
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  // Test GitHub connection
  async testConnection() {
    try {
      const { content } = await this.getCurrentFile();
      return {
        success: true,
        message: 'Successfully connected to GitHub',
        itemCount: content.length
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default new GitHubLinksManager();
