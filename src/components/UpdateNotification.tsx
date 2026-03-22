'use client';

import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildId = async () => {
      try {
        const response = await fetch('/api/version');
        const { buildId } = await response.json();
        if (initialBuildId === null) {
          setInitialBuildId(buildId);
        } else if (initialBuildId !== buildId) {
          setShowBanner(true);
        }
      } catch (error) {
        console.error('Failed to fetch build ID:', error);
      }
    };

    fetchBuildId(); // Check immediately on load
    const interval = setInterval(fetchBuildId, 60000); // And then every 60 seconds

    return () => clearInterval(interval);
  }, [initialBuildId]);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="sticky top-0 bg-[#E91E63] text-white p-3 text-center z-[1000]">
      <span>New update available!</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-4 py-2 px-4 border border-white rounded-full bg-transparent hover:bg-white hover:text-[#E91E63] transition-colors"
      >
        Refresh Now
      </button>
    </div>
  );
};

export default UpdateNotification;
