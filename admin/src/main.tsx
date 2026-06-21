import React from 'react';
import { createRoot } from 'react-dom/client';
import './main.scss';

const App: React.FC = () => <div id="iris-admin-root">Iris</div>;

const container = document.getElementById('iris-admin-root');
if (container) {
	createRoot(container).render(<App />);
}
