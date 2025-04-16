import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RegistrationScreen from './components/RegistrationScreen';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RegistrationScreen />} />
      <Route path="/onboarding" element={<div>Onboarding Coming Soon</div>} />
    </Routes>
  );
};

export default App; 