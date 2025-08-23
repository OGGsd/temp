import React, { useState, useEffect } from 'react';

interface ComponentInfo {
  name: string;
  path: string;
  type: string;
  category: string;
  size?: number;
  lines_of_code?: number;
  has_hooks?: boolean;
  is_functional?: boolean;
}

interface ShowcaseData {
  total_components: number;
  components_by_type: Record<string, number>;
  components: Record<string, ComponentInfo[]>;
  categories: Record<string, number>;
  statistics: {
    total_lines_of_code: number;
    functional_components: number;
    class_components: number;
    components_with_hooks: number;
    average_lines_per_component: number;
  };
  status: string;
}

const Showcase: React.FC = () => {
  const [showcaseData, setShowcaseData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchShowcaseData();
  }, []);

  const fetchShowcaseData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/showcase/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setShowcaseData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch showcase data');
      console.error('Showcase fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredComponents = () => {
    if (!showcaseData || selectedCategory === 'all') {
      return showcaseData?.components || {};
    }

    const filtered: Record<string, ComponentInfo[]> = {};
    Object.entries(showcaseData.components).forEach(([type, components]) => {
      const categoryComponents = components.filter(comp => comp.category === selectedCategory);
      if (categoryComponents.length > 0) {
        filtered[type] = categoryComponents;
      }
    });
    return filtered;
  };

  if (loading) {
    return (
      <div className="showcase-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading component showcase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="showcase-container">
        <div className="error-state">
          <h2>❌ Error Loading Showcase</h2>
          <p>{error}</p>
          <button onClick={fetchShowcaseData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!showcaseData) {
    return (
      <div className="showcase-container">
        <div className="no-data-state">
          <h2>No showcase data available</h2>
        </div>
      </div>
    );
  }

  const filteredComponents = getFilteredComponents();
  const totalFiltered = Object.values(filteredComponents).reduce(
    (sum, components) => sum + components.length, 
    0
  );

  return (
    <div className="showcase-container">
      <header className="showcase-header">
        <h1>🎭 AxieStudio Component Showcase</h1>
        <p className="showcase-subtitle">
          Enterprise React/TypeScript Component Library
        </p>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{showcaseData.total_components.toLocaleString()}</h3>
            <p>Total Components</p>
          </div>
          <div className="stat-card">
            <h3>{showcaseData.statistics.total_lines_of_code.toLocaleString()}</h3>
            <p>Lines of Code</p>
          </div>
          <div className="stat-card">
            <h3>{showcaseData.statistics.functional_components}</h3>
            <p>Functional Components</p>
          </div>
          <div className="stat-card">
            <h3>{showcaseData.statistics.components_with_hooks}</h3>
            <p>Components with Hooks</p>
          </div>
        </div>
      </header>

      <div className="showcase-controls">
        <div className="category-filter">
          <label htmlFor="category-select">Filter by Category:</label>
          <select 
            id="category-select"
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            <option value="all">All Categories ({showcaseData.total_components})</option>
            {Object.entries(showcaseData.categories).map(([category, count]) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="components-section">
        <h2>
          Components {selectedCategory !== 'all' && `- ${selectedCategory}`}
          <span className="component-count">({totalFiltered} components)</span>
        </h2>

        <div className="component-types">
          {Object.entries(filteredComponents).map(([type, components]) => (
            <div key={type} className="component-type-section">
              <h3 className="component-type-header">
                {type.toUpperCase()} Files ({components.length})
              </h3>
              
              <div className="components-grid">
                {components.slice(0, 50).map((component, index) => (
                  <div key={`${component.path}-${index}`} className="component-card">
                    <div className="component-header">
                      <h4 className="component-name">{component.name}</h4>
                      <span className="component-type-badge">{component.type}</span>
                    </div>
                    
                    <div className="component-details">
                      <p className="component-path">{component.path}</p>
                      <div className="component-meta">
                        <span className="category-badge">{component.category}</span>
                        {component.lines_of_code && (
                          <span className="lines-badge">{component.lines_of_code} lines</span>
                        )}
                        {component.has_hooks && (
                          <span className="hooks-badge">🪝 Hooks</span>
                        )}
                        {component.is_functional && (
                          <span className="functional-badge">⚡ Functional</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {components.length > 50 && (
                  <div className="more-components-card">
                    <p>+ {components.length - 50} more {type} components</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="showcase-footer">
        <div className="footer-stats">
          <h3>📊 Component Statistics</h3>
          <div className="footer-stats-grid">
            <div>
              <strong>Average Lines per Component:</strong> {showcaseData.statistics.average_lines_per_component}
            </div>
            <div>
              <strong>Functional vs Class:</strong> {showcaseData.statistics.functional_components} / {showcaseData.statistics.class_components}
            </div>
            <div>
              <strong>Status:</strong> {showcaseData.status}
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        .showcase-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .showcase-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .showcase-header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
          color: #2c3e50;
        }

        .showcase-subtitle {
          font-size: 1.2rem;
          color: #7f8c8d;
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }

        .stat-card h3 {
          font-size: 2rem;
          margin: 0 0 5px 0;
        }

        .stat-card p {
          margin: 0;
          opacity: 0.9;
        }

        .showcase-controls {
          margin-bottom: 30px;
        }

        .category-filter {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .category-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
        }

        .components-section h2 {
          color: #2c3e50;
          margin-bottom: 20px;
        }

        .component-count {
          color: #7f8c8d;
          font-weight: normal;
          font-size: 0.9em;
        }

        .component-type-section {
          margin-bottom: 40px;
        }

        .component-type-header {
          color: #34495e;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }

        .components-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 15px;
        }

        .component-card {
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 15px;
          background: white;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .component-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .component-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 10px;
        }

        .component-name {
          margin: 0;
          color: #2c3e50;
          font-size: 1.1rem;
        }

        .component-type-badge {
          background: #3498db;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .component-path {
          color: #7f8c8d;
          font-size: 0.9rem;
          margin: 0 0 10px 0;
          font-family: monospace;
        }

        .component-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .category-badge, .lines-badge, .hooks-badge, .functional-badge {
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: bold;
        }

        .category-badge {
          background: #e74c3c;
          color: white;
        }

        .lines-badge {
          background: #f39c12;
          color: white;
        }

        .hooks-badge {
          background: #9b59b6;
          color: white;
        }

        .functional-badge {
          background: #27ae60;
          color: white;
        }

        .more-components-card {
          border: 2px dashed #bdc3c7;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          color: #7f8c8d;
          background: #f8f9fa;
        }

        .showcase-footer {
          margin-top: 50px;
          padding: 30px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .footer-stats h3 {
          margin-bottom: 15px;
          color: #2c3e50;
        }

        .footer-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .loading-state, .error-state, .no-data-state {
          text-align: center;
          padding: 50px;
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .retry-button {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
        }

        .retry-button:hover {
          background: #2980b9;
        }
      `}</style>
    </div>
  );
};

export default Showcase;
