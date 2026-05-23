'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Decorative board pattern */}
      <div className="board-bg" aria-hidden="true">
        {Array.from({ length: 64 }).map((_, i) => (
          <div
            key={i}
            className="board-cell"
            style={{
              background: (Math.floor(i / 8) + i) % 2 === 0
                ? 'rgba(240,217,181,0.04)'
                : 'rgba(181,136,99,0.04)',
            }}
          />
        ))}
      </div>

      <div className="card">
        {/* Logo */}
        <div className="logo">
          <span className="logo-piece">♟</span>
          <div>
            <div className="logo-title">Opening Lab</div>
            <div className="logo-sub">Chess Repertoire Builder</div>
          </div>
        </div>

        <div className="divider-line" />

        <h1 className="headline">Build your repertoire.<br />Master your openings.</h1>
        <p className="subline">
          Sign in with Google to save your openings, practice variants,
          and access your repertoire from any device.
        </p>

        <button
          className="btn-google"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner">⟳</span>
          ) : (
            <GoogleIcon />
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="error-msg">{error}</p>}

        <p className="fine-print">
          Your data is stored securely in Firebase and never shared.
          Free to use — no credit card required.
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Subtle chess board background */
        .board-bg {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          grid-template-rows: repeat(8, 1fr);
          pointer-events: none;
          z-index: 0;
        }

        .board-cell { transition: background 0.3s; }

        .card {
          position: relative;
          z-index: 1;
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 8px;
          padding: 48px 44px;
          max-width: 440px;
          width: 100%;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .logo-piece {
          font-size: 40px;
          filter: drop-shadow(0 0 12px rgba(201,168,76,0.5));
        }

        .logo-title {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--accent-light);
          text-align: left;
        }

        .logo-sub {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          text-align: left;
        }

        .divider-line {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-strong), transparent);
          margin-bottom: 32px;
        }

        .headline {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--text-primary);
          line-height: 1.25;
          margin-bottom: 14px;
        }

        .subline {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.65;
          margin-bottom: 32px;
        }

        .btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #fff;
          color: #1f1f1f;
          border: none;
          padding: 13px 20px;
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 5px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
          margin-bottom: 16px;
        }

        .btn-google:hover:not(:disabled) {
          background: #f5f5f5;
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(0,0,0,0.5);
        }

        .btn-google:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          font-size: 18px;
          display: inline-block;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-msg {
          font-size: 13px;
          color: #e07070;
          margin-bottom: 12px;
        }

        .fine-print {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.6;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
