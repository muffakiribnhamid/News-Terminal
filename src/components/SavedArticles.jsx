import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiShare2, FiSearch, FiFilter, FiGrid, FiList, FiTag, FiStar, FiDownload, FiClock, FiArchive, FiExternalLink } from 'react-icons/fi';
import './SavedArticles.css';

const SavedArticles = () => {
  const [savedArticles, setSavedArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const searchDebounceRef = useRef(null);

  // Load saved articles from localStorage
  useEffect(() => {
    const loadSavedArticles = () => {
      try {
        const saved = localStorage.getItem('savedArticles');
        const parsed = saved ? JSON.parse(saved) : [];
        setSavedArticles(parsed);
        setFilteredArticles(parsed);
        
        // Extract unique tags
        const uniqueTags = [...new Set(parsed.flatMap(article => article.tags || []))];
        setTags(uniqueTags);
      } catch (error) {
        showNotification('Error loading saved articles', 'error');
      }
    };

    loadSavedArticles();
    window.addEventListener('storage', loadSavedArticles);
    return () => window.removeEventListener('storage', loadSavedArticles);
  }, []);

  // Filter and sort articles
  useEffect(() => {
    let filtered = [...savedArticles];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter(article =>
        article.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.savedAt) - new Date(a.savedAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'source':
          return a.source.name.localeCompare(b.source.name);
        default:
          return 0;
      }
    });

    setFilteredArticles(filtered);
  }, [savedArticles, searchTerm, selectedTags, sortBy]);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  const handleSearch = (event) => {
    const { value } = event.target;
    setSearchTerm(value);

    // Debounce search
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 300);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleDelete = useCallback((articleId) => {
    setSavedArticles(prev => {
      const updated = prev.filter(article => article.id !== articleId);
      localStorage.setItem('savedArticles', JSON.stringify(updated));
      showNotification('Article removed from saved items', 'success');
      return updated;
    });
  }, []);

  const handleShare = async (article) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: article.url
        });
        showNotification('Article shared successfully', 'success');
      } else {
        await navigator.clipboard.writeText(article.url);
        showNotification('Link copied to clipboard', 'success');
      }
    } catch (error) {
      showNotification('Error sharing article', 'error');
    }
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(savedArticles, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'saved-articles.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification('Articles exported successfully', 'success');
    } catch (error) {
      showNotification('Error exporting articles', 'error');
    }
  };

  const articleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="saved-articles-container">
      <header className="saved-articles-header">
        <h1>Saved Articles</h1>
        <div className="header-actions">
          <button className="view-mode-btn" onClick={() => setViewMode(prev => prev === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <FiList /> : <FiGrid />}
          </button>
          <button className="export-btn" onClick={handleExport}>
            <FiDownload /> Export
          </button>
        </div>
      </header>

      <div className="search-filter-container">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search saved articles..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="filter-sort-container">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="source">Sort by Source</option>
          </select>
        </div>
      </div>

      <div className="tags-container">
        {tags.map(tag => (
          <button
            key={tag}
            className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
            onClick={() => handleTagToggle(tag)}
          >
            <FiTag /> {tag}
          </button>
        ))}
      </div>

      <AnimatePresence>
        <div className={`articles-grid ${viewMode}`}>
          {filteredArticles.map(article => (
            <motion.article
              key={article.id}
              className="article-card"
              variants={articleVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {article.urlToImage && (
                <div className="article-image">
                  <img src={article.urlToImage} alt={article.title} loading="lazy" />
                </div>
              )}
              <div className="article-content">
                <h2>{article.title}</h2>
                <p className="article-description">{article.description}</p>
                <div className="article-metadata">
                  <span className="source">
                    <FiArchive /> {article.source.name}
                  </span>
                  <span className="date">
                    <FiClock /> {new Date(article.savedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="article-tags">
                  {article.tags?.map(tag => (
                    <span key={tag} className="tag">
                      <FiTag /> {tag}
                    </span>
                  ))}
                </div>
                <div className="article-actions">
                  <button onClick={() => handleDelete(article.id)} className="action-btn delete">
                    <FiTrash2 /> Remove
                  </button>
                  <button onClick={() => handleShare(article)} className="action-btn share">
                    <FiShare2 /> Share
                  </button>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="action-btn read">
                    <FiExternalLink /> Read
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </AnimatePresence>

      {filteredArticles.length === 0 && (
        <div className="empty-state">
          <FiStar className="empty-icon" />
          <h2>No saved articles found</h2>
          <p>Articles you save will appear here</p>
        </div>
      )}

      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default SavedArticles;
