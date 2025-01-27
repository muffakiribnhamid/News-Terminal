import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiSave, FiHeart, FiShare2, FiBookmark, FiTrash2, FiSearch, FiRefreshCw, FiFilter } from 'react-icons/fi';
import { BiTerminal } from 'react-icons/bi';
import SavedArticles from './components/SavedArticles';
import './App.css';

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const terminalAnimation = {
  initial: { scaleY: 0 },
  animate: { scaleY: 1 },
  transition: { duration: 0.3 }
};

const typingAnimation = {
  hidden: { width: '0%' },
  visible: { width: '100%', transition: { duration: 1, ease: 'easeOut' } }
};

function MainContent() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedArticles, setSavedArticles] = useState(() => {
    const saved = localStorage.getItem('savedArticles');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('general');
  const [viewMode, setViewMode] = useState('articles');
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [showCommandLine, setShowCommandLine] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const commandInputRef = useRef(null);

  const categories = [
    'general', 'business', 'technology', 'entertainment', 'health', 'science', 'sports'
  ];

  useEffect(() => {
    localStorage.setItem('savedArticles', JSON.stringify(savedArticles));
  }, [savedArticles]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const fetchNews = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = searchQuery ? 'search' : 'top-headlines';
      const params = {
        apikey: import.meta.env.VITE_GNEWS_API_KEY,
        lang: 'en',
        country: 'us',
        max: 50
      };

      if (searchQuery) {
        params.q = searchQuery;
      } else if (category !== 'general') {
        params.category = category;
      }

      const response = await axios.get(`https://gnews.io/api/v4/${endpoint}`, { params });
      
      const formattedArticles = response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedAt: article.publishedAt,
        source: { name: article.source.name },
        author: article.source.name,
        content: article.content
      }));

      setArticles(formattedArticles);
      setCurrentIndex(0);
      addNotification(`Loaded ${formattedArticles.length} articles`, 'success');
    } catch (error) {
      setError('Failed to fetch news. Please try again later.');
      console.error('Error fetching news:', error);
      addNotification('Failed to fetch news', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, addNotification]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    fetchNews(searchTerm);
  }, [fetchNews, searchTerm]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, articles.length - 1));
  }, [articles.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const handleSave = useCallback(() => {
    const article = articles[currentIndex];
    if (!article) return;

    const isAlreadySaved = savedArticles.some(saved => saved.title === article.title);
    if (isAlreadySaved) {
      addNotification('Article already saved', 'info');
      return;
    }

    const articleToSave = {
      ...article,
      id: Date.now(),
      savedAt: new Date().toISOString(),
      tags: []
    };

    setSavedArticles(prev => [...prev, articleToSave]);
    addNotification('Article saved successfully', 'success');
  }, [articles, currentIndex, savedArticles, addNotification]);

  const handleShare = useCallback(async (article) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: article.url
        });
        addNotification('Article shared successfully', 'success');
      } else {
        await navigator.clipboard.writeText(article.url);
        addNotification('Link copied to clipboard', 'success');
      }
    } catch (error) {
      addNotification('Error sharing article', 'error');
    }
  }, [addNotification]);

  const handleRemoveSaved = useCallback((index) => {
    setSavedArticles(prev => prev.filter((_, i) => i !== index));
    addNotification('Article removed from saved items', 'success');
  }, [addNotification]);

  const handleCommandSubmit = useCallback((e) => {
    e.preventDefault();
    if (!currentCommand.trim()) return;

    setCommandHistory(prev => [...prev, currentCommand]);
    const command = currentCommand.toLowerCase().trim();

    switch (command) {
      case 'help':
        addNotification('Available commands: help, next, prev, save, clear', 'info');
        break;
      case 'next':
        handleNext();
        break;
      case 'prev':
      case 'previous':
        handlePrevious();
        break;
      case 'save':
        handleSave();
        break;
      case 'clear':
        setCommandHistory([]);
        addNotification('Command history cleared', 'success');
        break;
      default:
        addNotification('Unknown command. Type "help" for available commands', 'error');
    }

    setCurrentCommand('');
  }, [currentCommand, handleNext, handlePrevious, handleSave, addNotification]);

  const currentArticle = articles[currentIndex];

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-left">
          <h1>Newsssss.....</h1>
          <div className="categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${category === cat ? 'active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <button 
            className="saved-articles-btn"
            onClick={() => navigate('/saved')}
          >
            <FiBookmark /> Saved Articles
          </button>
        </div>
      </nav>

      <motion.div 
        className="terminal"
        initial="initial"
        animate="animate"
        variants={terminalAnimation}
      >
        <div className="terminal-header">
          <div className="terminal-buttons">
            <motion.span 
              className="terminal-button red"
              whileHover={{ scale: 1.2 }}
            />
            <motion.span 
              className="terminal-button yellow"
              whileHover={{ scale: 1.2 }}
            />
            <motion.span 
              className="terminal-button green"
              whileHover={{ scale: 1.2 }}
            />
          </div>
          <motion.div 
            className="terminal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            NewsTerminal v2.0 <BiTerminal />
          </motion.div>
        </div>
        
        <div className="terminal-content">
          <div className="command-bar">
            <form onSubmit={handleSearch} className="search-form">
              <FiSearch />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search news..."
                className="search-input"
              />
            </form>
            
            <div className="category-filter">
              <FiFilter />
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="category-select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                className="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FiRefreshCw className="loading-icon" />
                Loading news... <span className="cursor">▋</span>
              </motion.div>
            ) : error ? (
              <motion.div 
                className="error-message"
                variants={pageTransition}
              >
                {error}
              </motion.div>
            ) : (
              <motion.div
                key={currentIndex}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="article-info">
                  <motion.p 
                    className="prompt"
                    variants={typingAnimation}
                    initial="hidden"
                    animate="visible"
                  >
                    $ cat current_article.txt
                  </motion.p>
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {currentArticle?.title}
                  </motion.h2>
                  <motion.p 
                    className="source"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Source: {currentArticle?.source.name}
                  </motion.p>
                  <motion.p 
                    className="description"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {currentArticle?.description}
                  </motion.p>
                  <motion.p 
                    className="published"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Published: {new Date(currentArticle?.publishedAt).toLocaleString()}
                  </motion.p>
                  <motion.div
                    className="article-actions"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <a 
                      href={currentArticle?.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="read-more"
                    >
                      [Read Full Article]
                    </a>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(currentArticle)}
                      className="icon-button"
                    >
                      <FiShare2 />
                    </motion.button>
                  </motion.div>
                </div>

                <div className="controls">
                  <motion.button 
                    onClick={handlePrevious} 
                    disabled={currentIndex === 0}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <FiChevronLeft /> Previous
                  </motion.button>
                  <motion.button 
                    onClick={handleSave}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="save-button"
                  >
                    <FiBookmark /> Save Article
                  </motion.button>
                  <motion.button 
                    onClick={handleNext} 
                    disabled={currentIndex === articles.length - 1}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    Next <FiChevronRight />
                  </motion.button>
                </div>

                <motion.div 
                  className="saved-articles"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.p 
                    className="prompt"
                    variants={typingAnimation}
                    initial="hidden"
                    animate="visible"
                  >
                    $ ls saved_articles/
                  </motion.p>
                  <AnimatePresence>
                    {savedArticles.map((article, index) => (
                      <motion.div 
                        key={index}
                        className="saved-article"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <span className="saved-article-title">
                          {index + 1}. {article.title}
                        </span>
                        <div className="saved-article-actions">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleShare(article)}
                            className="icon-button"
                          >
                            <FiShare2 />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleRemoveSaved(index)}
                            className="icon-button delete"
                          >
                            <FiTrash2 />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="command-line">
            <form onSubmit={handleCommandSubmit}>
              <span className="prompt">$</span>
              <input
                ref={commandInputRef}
                type="text"
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                placeholder="Type a command (help for list of commands)"
                className="command-input"
              />
            </form>
          </div>

          <AnimatePresence>
            {notifications.map(({ id, message, type }) => (
              <motion.div
                key={id}
                className={`notification ${type}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
              >
                {message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/saved" element={<SavedArticles />} />
      </Routes>
    </Router>
  );
}

export default App;
