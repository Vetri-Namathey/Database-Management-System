import React from 'react';
import AppLayout from '../components/layout/AppLayout';

const StyledPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Styled Page</h1>
        <p>This page is designed to reflect the look and feel of our main application.</p>
        {/* Add more content or components here as needed */}
      </div>
    </AppLayout>
  );
};

export default StyledPage;
