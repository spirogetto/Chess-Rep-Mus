'use client';

import { useState } from 'react';

export default function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('white');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Opening name is required.');
      return;
    }
    onCreate({ name: name.trim(), color, description: description.trim() });
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>New Opening</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="name">Opening Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Sicilian Defense — Najdorf"
              autoFocus
            />
            {error && <span className="error">{error}</span>}
          </div>

          <div className="field">
            <label>Playing as</label>
            <div className="color-picker">
              <button
                type="button"
                className={`color-option ${color === 'white' ? 'selected' : ''}`}
                onClick={() => setColor('white')}
              >
                <span className="piece-icon">♔</span>
                White
              </button>
              <button
                type="button"
                className={`color-option ${color === 'black' ? 'selected' : ''}`}
                onClick={() => setColor('black')}
              >
                <span className="piece-icon">♚</span>
                Black
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="desc">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key ideas, middlegame plans, typical structures…"
              rows={3}
            />
          </div>

          <div className="actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Create Opening</button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 6px;
          padding: 28px 32px;
          width: 100%;
          max-width: 440px;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.2s ease;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .modal-header h2 {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .field {
          margin-bottom: 20px;
        }

        .error {
          display: block;
          color: #e07070;
          font-size: 12px;
          margin-top: 5px;
        }

        .color-picker {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .color-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 14px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .color-option:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }

        .color-option.selected {
          border-color: var(--accent);
          color: var(--accent-light);
          background: rgba(201, 168, 76, 0.08);
        }

        .piece-icon {
          font-size: 20px;
        }

        .actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
