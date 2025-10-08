import React, { useEffect, useState } from 'react';

const HomePage: React.FC = () => {
  const [health, setHealth] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(JSON.stringify(data)))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1>Welcome to FastAPI Backend!</h1>
      <p>Health Status: {health}</p>
    </div>
  );
};

export default HomePage;
