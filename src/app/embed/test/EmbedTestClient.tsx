'use client';

import { useState, useEffect, useCallback } from 'react';

export function EmbedTestClient() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const authToken = sessionStorage.getItem('embed-test-auth');
    if (authToken === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/embed/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        sessionStorage.setItem('embed-test-auth', 'authenticated');
        setIsAuthenticated(true);
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      setError('Authentication failed');
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          background: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '420px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🔐
            </div>
            <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#1f2937', letterSpacing: '-0.02em' }}>
              Access Required
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '16px', color: '#6b7280' }}>
              Enter your access code to continue
            </p>
          </div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                Access Code
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  outline: 'none'
                }}
                placeholder="••••••••"
                required
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '14px',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                background: isLoading
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading
                  ? 'none'
                  : '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                transform: isLoading ? 'none' : 'translateY(0)',
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                  (e.target as HTMLElement).style.boxShadow = '0 6px 20px 0 rgba(102, 126, 234, 0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                  (e.target as HTMLElement).style.boxShadow = '0 4px 14px 0 rgba(102, 126, 234, 0.39)';
                }
              }}
            >
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  Verifying...
                </div>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <EmbedTestPage />;
}

function EmbedTestPage() {
  const [pluginEnabled, setPluginEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);
  const [testMode, setTestMode] = useState('auto');
  const [manualUrl, setManualUrl] = useState('');
  const [pluginStatus, setPluginStatus] = useState('Ready to initialize');
  const [pluginLog, setPluginLog] = useState('');

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const entry = `[${timestamp}] ${message}\n`;
    setPluginLog(prev => prev + entry);
    console.log(`[Negation Game] ${message}`);
  };

  const setStatus = (message: string, type = 'info') => {
    setPluginStatus(message);
  };

  const extractUrls = (content: string) => {
    const urlRegex = /https?:\/\/[^\s<>"']+/gi;
    return content.match(urlRegex) || [];
  };

  const isValidSourceUrl = (url: string) => {
    return url && (
      url.includes('forum.scroll.io') ||
      url.includes('snapshot.org') ||
      url.includes('gov.scroll.io')
    );
  };

  const checkTopicExists = async (sourceUrl: string) => {
    try {
      log(`Checking topic for URL: ${sourceUrl}`);

      // Mock data for testing - use real topic from database
      if (sourceUrl.includes('delegate-accelerator-proposal') || sourceUrl.includes('/571')) {
        log('Found real topic: Scroll DAO Delegate Accelerator Proposal');
        return {
          found: true,
          topicId: 'AmBKhx', // Encoded ID for topic 17
          title: 'Scroll DAO Delegate Accelerator Proposal',
          spaceId: 'scroll',
          hasRationales: true
        };
      }

      if (sourceUrl.includes('governance-contribution-recognition') || sourceUrl.includes('/673')) {
        log('Found real topic: Governance Contribution Recognition');
        return {
          found: true,
          topicId: 'CVLFPT', // Encoded ID for topic 18
          title: 'Governance Contribution Recognition',
          spaceId: 'scroll',
          hasRationales: false
        };
      }

      const response = await fetch(`${baseUrl}/api/embed/topic-detector?source=${encodeURIComponent(sourceUrl)}`);

      if (!response.ok) {
        log(`API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      log(`API response: ${JSON.stringify(data)}`);
      return data;
    } catch (error: any) {
      log(`Error checking topic: ${error.message}`);
      return null;
    }
  };

  const createEmbedIframe = (topicId: string) => {
    const container = document.createElement('div');
    container.className = 'negation-game-embed-container';
    container.innerHTML = `
      <div style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 16px 20px; margin: 0;">
          <h3 style="margin: 0; font-size: 17px; font-weight: 600; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">🎯 Negation Game Rationales</h3>
        </div>
        <div class="iframe-loading" style="display: flex; align-items: center; justify-content: center; height: 200px; background: #f8fafc; color: #64748b; font-size: 14px;">
          <div style="text-align: center;">
            <div style="width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
            Loading rationales...
          </div>
        </div>
        <iframe 
          src="${baseUrl}/embed/topic/${topicId}"
          width="100%"
          height="400"
          frameborder="0"
          scrolling="no"
          style="display: none; width: 100%; border: none; background: white; min-height: 200px; transition: height 0.3s ease;"
          title="Negation Game Rationales"
          onload="this.style.display='block'; this.parentElement.querySelector('.iframe-loading').style.display='none';">
        </iframe>
      </div>
    `;

    // Add CSS animation for loading spinner
    if (!document.querySelector('#iframe-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'iframe-loading-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    return container;
  };

  const createNoAnalysisPrompt = (sourceUrl: string) => {
    const container = document.createElement('div');
    container.className = 'negation-game-no-analysis';
    container.innerHTML = `
      <div style="margin: 20px 0;">
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px 24px; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);">
          <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
          <h4 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">No Negation Game Topic Yet</h4>
          <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 15px; line-height: 1.5;">This proposal hasn't been created as a topic in Negation Game yet.</p>
          <button onclick="createTopic('${sourceUrl}')" style="display: inline-block; background: #10b981; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">
            Create Topic
          </button>
          <p style="margin-top: 14px; font-size: 13px; color: #666; font-style: italic;">Creates the topic so people can debate it</p>
        </div>
      </div>
    `;
    return container;
  };

  const createTopic = useCallback((sourceUrl: string) => {
    log(`Creating topic for ${sourceUrl}`);

    // Simulate topic creation
    const mockTopicId = 'new' + Math.random().toString(36).substr(2, 9);

    // Replace the prompt with an embed
    const prompts = document.querySelectorAll('.negation-game-no-analysis');
    prompts.forEach(prompt => {
      const embed = createEmbedIframe(mockTopicId);
      prompt.parentNode?.replaceChild(embed, prompt);
    });

    log(`Topic created with ID: ${mockTopicId}`);
  }, []);

  const handleIframeMessage = (event: MessageEvent) => {
    if (event.data.source !== 'negation-game-embed') return;

    const iframes = document.querySelectorAll('.negation-game-embed-container iframe');
    if (iframes.length === 0) return;

    switch (event.data.type) {
      case 'resize':
        // Find the iframe that sent the message
        const targetIframe = Array.from(iframes).find(iframe =>
          (iframe as HTMLIFrameElement).contentWindow === event.source
        );

        if (targetIframe) {
          const newHeight = Math.min(event.data.height, 1500); // Increased cap for larger content
          (targetIframe as HTMLElement).style.height = newHeight + 'px';
          log(`Resized iframe to ${newHeight}px`);
        }
        break;
      case 'navigate':
        window.open(baseUrl + event.data.url, '_blank', 'noopener,noreferrer');
        log(`Navigation requested: ${event.data.url}`);
        break;
    }
  };

  const processPost = async (postElement: Element) => {
    if (postElement.hasAttribute('data-negation-game-processed')) {
      return;
    }
    postElement.setAttribute('data-negation-game-processed', 'true');

    const contentElement = postElement.querySelector('.post-content');
    if (!contentElement) return;

    let urls: string[] = [];

    if (testMode === 'manual') {
      if (manualUrl.trim()) {
        urls = [manualUrl.trim()];
      }
    } else {
      const content = contentElement.textContent || contentElement.innerHTML || '';
      urls = extractUrls(content);
    }

    log(`Processing post, found URLs: ${urls.join(', ')}`);

    for (const url of urls) {
      if (!isValidSourceUrl(url)) {
        log(`Skipping invalid URL: ${url}`);
        continue;
      }

      const topicData = await checkTopicExists(url);
      if (!topicData) continue;

      let embedElement;
      if (topicData.found && topicData.topicId) {
        embedElement = createEmbedIframe(topicData.topicId);
        log(`Created embed iframe for topic: ${topicData.topicId}`);
      } else {
        embedElement = createNoAnalysisPrompt(url);
        log(`Created no analysis prompt for: ${url}`);
      }

      contentElement.appendChild(embedElement);
      break; // Only process first matching URL per post
    }
  };

  const initializePlugin = async () => {
    setPluginEnabled(true);

    log(`Initializing Negation Game plugin`);
    log(`Base URL: ${baseUrl}`);

    setStatus('Initializing plugin...');

    // Add message listener for iframe communication
    window.addEventListener('message', handleIframeMessage);

    // Process all posts
    const posts = document.querySelectorAll('.post');
    log(`Found ${posts.length} posts to process`);

    try {
      for (const post of posts) {
        await processPost(post);
      }
      setStatus('Plugin initialized successfully!');
      log('Plugin initialization complete');
    } catch (error: any) {
      setStatus(`Plugin initialization failed: ${error.message}`);
      log(`Initialization error: ${error.message}`);
    }
  };

  const clearEmbeds = () => {
    const embeds = document.querySelectorAll('.negation-game-embed-container, .negation-game-no-analysis');
    embeds.forEach(embed => embed.remove());

    const posts = document.querySelectorAll('.post');
    posts.forEach(post => post.removeAttribute('data-negation-game-processed'));

    setStatus('Embeds cleared');
    log('Cleared all embeds');
  };

  // Make createTopic available globally
  useEffect(() => {
    (window as any).createTopic = createTopic;
  }, [createTopic]);

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️ Discourse Integration Test</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        This simulates how the Negation Game plugin would work in a real Discourse forum.
      </p>

      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px', color: '#1976d2' }}>🎛️ Plugin Configuration</h3>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Negation Game Base URL:
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
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
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
            Test Mode:
          </label>
          <select
            value={testMode}
            onChange={(e) => setTestMode(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="auto">Auto-detect URLs</option>
            <option value="manual">Manual URL input</option>
          </select>
        </div>

        {testMode === 'manual' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
              Source URL:
            </label>
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://forum.scroll.io/t/proposal/123"
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
        )}

        <button
          onClick={initializePlugin}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginRight: '10px'
          }}
        >
          Initialize Plugin
        </button>

        <button
          onClick={clearEmbeds}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear Embeds
        </button>

        <div style={{
          padding: '10px',
          borderRadius: '4px',
          marginTop: '10px',
          fontSize: '14px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          border: '1px solid #bee5eb'
        }}>
          {pluginStatus}
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          padding: '15px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxHeight: '300px',
          overflowY: 'auto',
          marginTop: '15px',
          whiteSpace: 'pre-wrap'
        }}>
          {pluginLog || 'Plugin log will appear here...'}
        </div>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ marginBottom: '20px' }}>📋 Sample Scroll Proposal</h2>

        <div className="post" style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              JD
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#333' }}>john.delegate</div>
              <div style={{ color: '#666', fontSize: '14px' }}>2 hours ago</div>
            </div>
          </div>
          <div className="post-content" style={{ lineHeight: '1.6', color: '#333' }}>
            <p><strong>Proposal: Scroll DAO Delegate Accelerator Program</strong></p>
            <p>This proposal establishes a structured program to onboard and support new delegates in the Scroll DAO governance process.</p>
            <p>Key points:</p>
            <ul>
              <li>6-month accelerator program for new delegates</li>
              <li>Mentorship and education resources</li>
              <li>Performance tracking and incentives</li>
            </ul>
            <p>Full details and voting: <a href="https://forum.scroll.io/t/proposal-scroll-dao-delegate-accelerator-proposal/571" style={{ color: '#3b82f6' }}>https://forum.scroll.io/t/proposal-scroll-dao-delegate-accelerator-proposal/571</a></p>
          </div>
        </div>

        <div className="post" style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              SM
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#333' }}>sarah.validator</div>
              <div style={{ color: '#666', fontSize: '14px' }}>1 hour ago</div>
            </div>
          </div>
          <div className="post-content" style={{ lineHeight: '1.6', color: '#333' }}>
            <p>I support this proposal but think we need clearer success metrics for the accelerator program.</p>
            <p>See my detailed thoughts: <a href="https://forum.scroll.io/t/governance-contribution-recognition/673" style={{ color: '#3b82f6' }}>https://forum.scroll.io/t/governance-contribution-recognition/673</a></p>
          </div>
        </div>

        <div className="post" style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#3b82f6',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              AL
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#333' }}>alex.builder</div>
              <div style={{ color: '#666', fontSize: '14px' }}>30 minutes ago</div>
            </div>
          </div>
          <div className="post-content" style={{ lineHeight: '1.6', color: '#333' }}>
            <p>Great proposal! I&apos;ve been working on similar optimizations.</p>
            <p>Related discussion: <a href="https://forum.scroll.io/t/sequencer-improvements/458" style={{ color: '#3b82f6' }}>https://forum.scroll.io/t/sequencer-improvements/458</a></p>
          </div>
        </div>

        <div style={{
          backgroundColor: '#e0f7fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: '#006064' }}>🎯 User Experience Goals Demonstration</h3>
          <div style={{ color: '#004d5a' }}>
            <p style={{ margin: '0 0 8px' }}><strong>★★ Goal 1:</strong> Prompt proposer to create initial rationale (no login required)</p>
            <p style={{ margin: '0 0 8px' }}><strong>★ Goal 2:</strong> Show existing rationales when topic exists</p>
            <p style={{ margin: '0 0 8px' }}><strong>★ Goal 3:</strong> Allow visual exploration of rationales within embed</p>
            <p style={{ margin: '0', fontSize: '12px', fontStyle: 'italic' }}>
              Test the &quot;Explore&quot; buttons above to see in-embed rationale preview functionality!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}