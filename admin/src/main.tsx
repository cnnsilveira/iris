import React from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsDashboard } from './components/SettingsDashboard';
import { ChatDrawer } from './components/ChatDrawer';
import './main.scss';

interface IrisSettings {
	nonce: string;
	restUrl: string;
	siteHash: string;
	isSettingsPage: boolean;
}

declare global {
	interface Window {
		irisSettings?: IrisSettings;
	}
}

// Conditionally mount Settings Dashboard
const adminContainer = document.getElementById('iris-admin-root');
if (adminContainer) {
	createRoot(adminContainer).render(
		<React.StrictMode>
			<SettingsDashboard />
		</React.StrictMode>
	);
}

// Conditionally mount Chat Drawer
const chatContainer = document.getElementById('iris-chat-root');
if (chatContainer) {
	createRoot(chatContainer).render(
		<React.StrictMode>
			<ChatDrawer />
		</React.StrictMode>
	);
}

