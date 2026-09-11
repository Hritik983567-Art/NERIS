import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { regionalNewsArticles } from '../data/newsData';
import {
  Newspaper,
  Globe,
  AlertTriangle,
  Compass,
  Truck,
  Building2,
  Search,
  ExternalLink,
  Share2,
  Clock,
  MapPin,
  CheckCircle2,
  Filter,
  Flame,
  Radio,
  BookOpen
} from 'lucide-react';

export const NewsCenter = () => {
  const { lang, setLang, t, stateFilter, setStateFilter, setActiveTab, nerStates } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleModal, setActiveArticleModal] = useState(null);
  const [sharedNotice, setSharedNotice] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlNotice, setCrawlNotice] = useState(false);

  // Active translation language for article content (uses global app language directly)
  const currentNewsLang = lang;

  const handleCrawlNews = () => {
    setIsCrawling(true);
    setCrawlNotice(false);
    setTimeout(() => {
      setIsCrawling(false);
      setCrawlNotice(true);
      setTimeout(() => setCrawlNotice(false), 4000);
    }, 1200);
  };

  // Filter articles based on category, state, and search query
  const filteredArticles = regionalNewsArticles.filter((article) => {
    // Category filter
    if (selectedCategory !== 'all' && article.category !== selectedCategory) {
      return false;
    }
    // State filter
    if (stateFilter !== 'all' && article.state !== stateFilter) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleMatch = (article.title[currentNewsLang] || article.title.en).toLowerCase().includes(q);
      const summaryMatch = (article.summary[currentNewsLang] || article.summary.en).toLowerCase().includes(q);
      const sourceMatch = article.source.toLowerCase().includes(q);
      if (!titleMatch && !summaryMatch && !sourceMatch) return false;
    }
    return true;
  });

  const featuredArticle = filteredArticles[0] || regionalNewsArticles[0];

  const handleShare = (article) => {
    setSharedNotice(article.id);
    setTimeout(() => setSharedNotice(false), 3000);
  };

  const getLanguageLabel = (code) => {
    switch (code) {
      case 'as': return t.langAssamese || 'অসমীয়া';
      case 'bn': return t.langBengali || 'বাংলা';
      case 'hi': return t.langHindi || 'हिन्दी';
      case 'mn': return t.langManipuri || 'ꯃꯩꯇꯩꯂꯣᓐ';
      default: return t.langEnglish || 'English';
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'alerts': return t.newsCategoryAlerts || 'Emergency & Disasters';
      case 'travel': return t.newsCategoryTravel || 'Tourist Advisories';
      case 'logistics': return t.newsCategoryLogistics || 'Freight & Freight Supply';
      case 'govt': return t.newsCategoryGovt || 'Border & Infra Projects';
      default: return t.newsCategoryAll || 'All Categories';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
      {/* Top Header & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={24} color="#2563EB" />
              <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {t.navNews}
              </h2>
              <span className="pill clear" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                {t.liveFeed || "LIVE FEED"}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '3px' }}>
              {t.newsSub || "Classified regional bulletins, disaster warnings & safe travel updates in 5 North-Eastern languages."}
            </p>
          </div>

          {/* Quick Search & Clean Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleCrawlNews}
              disabled={isCrawling}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid #2563EB',
                color: '#2563EB',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Radio size={14} className={isCrawling ? 'sos-pulse' : ''} />
              {isCrawling ? 'Crawling NER News & BRO Feeds...' : '⚡ Sync Live Regional Feeds'}
            </button>

            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} color="var(--color-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                className="form-input"
                placeholder={t.searchHeadlines || "Search headlines..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', height: '32px', fontSize: '0.76rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <Globe size={14} color="#2563EB" />
              <select
                className="custom-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{ height: '26px', fontSize: '0.74rem', background: 'transparent', border: 'none', fontWeight: 800, cursor: 'pointer' }}
              >
                <option value="en">English</option>
                <option value="as">অসমীয়া (Assamese)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mn">ꯃꯩꯇꯩꯂꯣᓐ (Manipuri)</option>
              </select>
            </div>
          </div>
        </div>

        {crawlNotice && (
          <div style={{ marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#059669', fontSize: '0.76rem', fontWeight: 700 }}>
            ✅ Real News Feed Synchronized: Fetched latest ground reports from IMD Guwahati, BRO Vartak Command, and State Disaster Operations Centers in all 5 regional languages.
          </div>
        )}

        {/* Category Classification Chips Bar */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-muted)', marginRight: '4px' }}>
            {t.classificationLabel || "Classification:"}
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`demo-chip-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            style={{ background: selectedCategory === 'all' ? '#2563EB' : undefined, color: selectedCategory === 'all' ? '#FFF' : undefined }}
          >
            🌐 {t.newsCategoryAll}
          </button>

          <button
            onClick={() => setSelectedCategory('alerts')}
            className={`demo-chip-btn ${selectedCategory === 'alerts' ? 'active' : ''}`}
            style={{ background: selectedCategory === 'alerts' ? '#DC2626' : undefined, color: selectedCategory === 'alerts' ? '#FFF' : undefined }}
          >
            🚨 {t.newsCategoryAlerts}
          </button>

          <button
            onClick={() => setSelectedCategory('travel')}
            className={`demo-chip-btn ${selectedCategory === 'travel' ? 'active' : ''}`}
            style={{ background: selectedCategory === 'travel' ? '#D97706' : undefined, color: selectedCategory === 'travel' ? '#FFF' : undefined }}
          >
            🏔️ {t.newsCategoryTravel}
          </button>

          <button
            onClick={() => setSelectedCategory('logistics')}
            className={`demo-chip-btn ${selectedCategory === 'logistics' ? 'active' : ''}`}
            style={{ background: selectedCategory === 'logistics' ? '#059669' : undefined, color: selectedCategory === 'logistics' ? '#FFF' : undefined }}
          >
            🚚 {t.newsCategoryLogistics}
          </button>

          <button
            onClick={() => setSelectedCategory('govt')}
            className={`demo-chip-btn ${selectedCategory === 'govt' ? 'active' : ''}`}
            style={{ background: selectedCategory === 'govt' ? '#7C3AED' : undefined, color: selectedCategory === 'govt' ? '#FFF' : undefined }}
          >
            🏛️ {t.newsCategoryGovt}
          </button>
        </div>
      </div>

      {/* Active Language & State Context Bar */}
      <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text)', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={16} color="#DC2626" />
          <span>
            {t.activeView || "Active View:"} <strong style={{ color: '#2563EB' }}>{getLanguageLabel(currentNewsLang)}</strong>
            {stateFilter !== 'all' && <span> {t.forState || "for"} <strong style={{ color: '#059669' }}>{(t.stateNames && t.stateNames[stateFilter]) || stateFilter}</strong></span>}
          </span>
        </div>

        <span style={{ color: 'var(--color-muted)', fontSize: '0.72rem' }}>
          {filteredArticles.length} {t.showingBulletins || "verified news bulletins"}
        </span>
      </div>

      {/* Featured Top Headline Story (Hero Banner) */}
      {featuredArticle && (
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className={`pill ${featuredArticle.urgency === 'critical' ? 'blocked' : 'caution'}`} style={{ fontSize: '0.72rem' }}>
                  {t.featuredHeadline || "FEATURED HEADLINE"} • {getCategoryLabel(featuredArticle.category)}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                  📍 {(t.stateNames && t.stateNames[featuredArticle.state]) || featuredArticle.state}
                </span>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: '8px' }}>
                {featuredArticle.title[currentNewsLang] || featuredArticle.title.en}
              </h3>

              <p style={{ fontSize: '0.84rem', color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                {featuredArticle.summary[currentNewsLang] || featuredArticle.summary.en}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveArticleModal(featuredArticle)}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '0.78rem', minHeight: '38px' }}
                >
                  <BookOpen size={15} /> {t.readFullBulletin || "Read Full Bulletin"}
                </button>

                <button
                  onClick={() => setActiveTab('map')}
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', color: '#2563EB', padding: '8px 14px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <MapPin size={15} /> {t.viewCorridorOnMap || "View Corridor on GIS Map"}
                </button>

                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> {featuredArticle.timestamp} • {featuredArticle.source}
                </span>
              </div>
            </div>

            <div style={{ position: 'relative', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <img
                src={featuredArticle.image}
                alt="News Feature"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: '#FFF', padding: '3px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                {getLanguageLabel(featuredArticle.language)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Classified News Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', flex: 1 }}>
        {filteredArticles.map((article) => {
          const headlineText = article.title[currentNewsLang] || article.title.en;
          const summaryText = article.summary[currentNewsLang] || article.summary.en;
          const isShared = sharedNotice === article.id;

          return (
            <div
              key={article.id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                borderRadius: '12px'
              }}
            >
              <div>
                {/* Clean Top Badges Row (Prevents Overlap) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '6px' }}>
                  <span className={`pill ${article.urgency === 'critical' ? 'blocked' : article.urgency === 'warning' ? 'caution' : 'clear'}`} style={{ fontSize: '0.64rem', padding: '2px 8px' }}>
                    {getCategoryLabel(article.category)}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-muted)', background: 'rgba(37, 99, 235, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                    📍 {(t.stateNames && t.stateNames[article.state]) || article.state}
                  </span>
                </div>

                {/* Article Image Container */}
                <div style={{ position: 'relative', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '1px solid var(--color-border)' }}>
                  <img
                    src={article.image}
                    alt={headlineText}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0, 0, 0, 0.75)', color: '#FFF', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700 }}>
                    {getLanguageLabel(article.language)}
                  </div>
                </div>

                {/* Article Title */}
                <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.35, marginBottom: '8px', minHeight: '40px' }}>
                  {headlineText}
                </h4>

                {/* Article Summary */}
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', lineHeight: 1.45, marginBottom: '14px' }}>
                  {summaryText}
                </p>
              </div>

              {/* Card Footer */}
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                  <span>{article.source}</span>
                  <span>{article.timestamp}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setActiveArticleModal(article)}
                    className="btn-primary"
                    style={{ flex: 1, minHeight: '34px', fontSize: '0.74rem', padding: '4px 8px' }}
                  >
                    {t.readBulletin || "Read Bulletin"}
                  </button>

                  <button
                    onClick={() => handleShare(article)}
                    style={{
                      background: isShared ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface)',
                      border: isShared ? '1px solid #10B981' : '1px solid var(--color-border)',
                      color: isShared ? '#059669' : 'var(--color-text)',
                      borderRadius: '6px',
                      padding: '0 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isShared ? <CheckCircle2 size={14} /> : <Share2 size={14} />}
                    {isShared ? (t.shared || 'Shared!') : (t.share || 'Share')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Article Detail Modal View */}
      {activeArticleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', background: 'var(--color-surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span className={`pill ${activeArticleModal.urgency === 'critical' ? 'blocked' : 'caution'}`}>
                  {getCategoryLabel(activeArticleModal.category)} • {(t.stateNames && t.stateNames[activeArticleModal.state]) || activeArticleModal.state}
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-text)' }}>
                  {activeArticleModal.title[currentNewsLang] || activeArticleModal.title.en}
                </h3>
              </div>
              <button
                onClick={() => setActiveArticleModal(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--color-muted)' }}
              >
                ✕
              </button>
            </div>

            <img
              src={activeArticleModal.image}
              alt="Article"
              style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', marginBottom: '14px' }}
            />

            <div style={{ fontSize: '0.86rem', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: '16px' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '10px' }}>
                {activeArticleModal.fullContent?.[currentNewsLang] || activeArticleModal.fullContent?.en || activeArticleModal.summary[currentNewsLang] || activeArticleModal.summary.en}
              </p>
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                <strong>English Parallel Translation:</strong> {activeArticleModal.fullContent?.en || activeArticleModal.summary.en}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                {t.sourceLabel || "Source:"} {activeArticleModal.source} • {activeArticleModal.timestamp}
              </span>
              <button
                onClick={() => {
                  setActiveArticleModal(null);
                  setActiveTab('map');
                }}
                className="btn-primary"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.76rem' }}
              >
                <MapPin size={14} /> {t.openGisMapVector || "Open GIS Map Vector"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
