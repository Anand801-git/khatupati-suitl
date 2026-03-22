'use client';

import { useState } from 'react';
import { Rocket, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

const DevDeployButton = () => {
  // This is a development-only component. It will be completely removed in production builds.
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<'success' | 'error' | null>(
    null
  );

  const handleDeploy = async () => {
    if (
      window.confirm(
        'This will push all changes to GitHub and update your live app in 2 minutes. Continue?'
      )
    ) {
      setIsDeploying(true);
      setDeployStatus(null);
      try {
        const response = await fetch('/api/deploy', { method: 'POST' });
        if (response.ok) {
          setDeployStatus('success');
        } else {
          setDeployStatus('error');
        }
      } catch (error) {
        setDeployStatus('error');
      } finally {
        setIsDeploying(false);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        left: '16px',
        zIndex: 50,
      }}
    >
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        style={{
          background: '#6A1B9A',
          color: 'white',
          borderRadius: '30px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: 'none',
          cursor: 'pointer',
          animation: isDeploying ? 'none' : 'pulse 2s infinite',
        }}
      >
        {isDeploying ? (
          <>
            <Loader className="animate-spin" />
            <span>Deploying please wait...</span>
          </>
        ) : deployStatus === 'success' ? (
          <>
            <CheckCircle />
            <span>Your app will update in 2 minutes</span>
          </>
        ) : deployStatus === 'error' ? (
          <>
            <AlertTriangle />
            <span>Deploy failed check terminal for details</span>
          </>
        ) : (
          <>
            <Rocket />
            <span>Deploy to Live</span>
          </>
        )}
      </button>
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default DevDeployButton;
