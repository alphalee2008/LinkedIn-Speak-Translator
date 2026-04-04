import React, { useRef } from 'react'
import html2canvas from 'html2canvas'

export default function ShareCard({ input, output, mode, isPro, onClose }) {
  const cardRef = useRef()

  async function handleDownload() {
    const canvas = await html2canvas(cardRef.current, { scale: 2 })
    const link = document.createElement('a')
    link.download = 'linkedin-translated.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>Share Your Translation</h2>

        <div className="share-card" ref={cardRef}>
          <div className="share-card-header">
            <span>LinkedIn Speak Translator</span>
            {!isPro && <span className="watermark">decodedspeak.com</span>}
          </div>
          <div className="share-card-body">
            <div className="share-original">
              <label>They said:</label>
              <p>"{input}"</p>
            </div>
            <div className="share-arrow">→</div>
            <div className="share-translated">
              <label>They meant:</label>
              <p>"{output}"</p>
            </div>
          </div>
        </div>

        <div className="share-actions">
          <button className="btn-primary" onClick={handleDownload}>
            ⬇️ Download Image
          </button>
          <button
            className="btn-secondary"
            onClick={() => navigator.clipboard.writeText(`They said: "${input}"\n\nThey meant: "${output}"\n\nvia decodedspeak.com`)}
          >
            📋 Copy Text
          </button>
        </div>
      </div>
    </div>
  )
}
