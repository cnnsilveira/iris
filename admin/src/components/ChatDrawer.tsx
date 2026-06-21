import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Message {
	role: 'user' | 'assistant';
	content: string;
	id: string;
}

export const ChatDrawer: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [isTyping, setIsTyping] = useState(false);
	const [activeModel, setActiveModel] = useState('Select a model...');

	const chatBodyRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const restUrl = window.irisSettings?.restUrl || '/wp-json/iris/v1/';
	const nonce = window.irisSettings?.nonce || '';
	const siteHash = window.irisSettings?.siteHash || 'default';
	const storageKey = `iris_chat_history_${siteHash}`;

	// Load chat history & active settings
	useEffect(() => {
		const storedHistory = localStorage.getItem(storageKey);
		if (storedHistory) {
			try {
				setMessages(JSON.parse(storedHistory));
			} catch (e) {
				console.error('Failed to parse chat history', e);
			}
		}

		// Fetch active model from settings to show in header
		fetchSettings();
	}, []);

	// Save history whenever messages list changes
	useEffect(() => {
		if (messages.length > 0) {
			localStorage.setItem(storageKey, JSON.stringify(messages));
		} else {
			localStorage.removeItem(storageKey);
		}
		scrollToBottom();
	}, [messages]);

	// Auto scroll to bottom
	const scrollToBottom = () => {
		if (chatBodyRef.current) {
			chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
		}
	};

	const fetchSettings = async () => {
		try {
			const headers: Record<string, string> = {};
			if (nonce) headers['X-WP-Nonce'] = nonce;
			const response = await fetch(`${restUrl}settings`, { headers });
			if (response.ok) {
				const settings = await response.json();
				if (settings.model) {
					setActiveModel(settings.model.split('/').pop() || settings.model);
				}
			}
		} catch (e) {
			console.error('Error fetching settings for drawer header', e);
		}
	};

	const getHeaders = () => {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (nonce) {
			headers['X-WP-Nonce'] = nonce;
		}
		return headers;
	};

	const handleSend = async (textToSend?: string) => {
		const query = (textToSend || input).trim();
		if (!query || isTyping) return;

		if (!textToSend) {
			setInput('');
		}

		const userMsg: Message = {
			role: 'user',
			content: query,
			id: `user-${Date.now()}`,
		};

		setMessages((prev) => [...prev, userMsg]);
		setIsTyping(true);

		const assistantMsgId = `assistant-${Date.now()}`;
		const placeholderMsg: Message = {
			role: 'assistant',
			content: '',
			id: assistantMsgId,
		};

		setMessages((prev) => [...prev, placeholderMsg]);

		// Build conversation payload
		const contextMessages = [...messages, userMsg].map((m) => ({
			role: m.role,
			content: m.content,
		}));

		try {
			// Trigger SSE stream from either the real chat endpoint or the mock chat endpoint
			const chatEndpoint = `${restUrl}chat/mock`; // Temporary mock stream as requested
			const response = await fetch(chatEndpoint, {
				method: 'POST',
				headers: getHeaders(),
				body: JSON.stringify({
					messages: contextMessages,
				}),
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.message || 'Stream connection failed.');
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();
			if (!reader) {
				throw new Error('Readable stream not supported.');
			}

			let responseText = '';
			let done = false;

			while (!done) {
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				if (value) {
					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split('\n');

					for (const line of lines) {
						const cleanedLine = line.trim();
						if (cleanedLine === 'data: [DONE]') {
							done = true;
							break;
						}
						if (cleanedLine.startsWith('data: ')) {
							try {
								const dataJson = JSON.parse(cleanedLine.substring(6));
								const token = dataJson.choices?.[0]?.delta?.content;
								if (token) {
									responseText += token;
									// Update the assistant message in real-time
									setMessages((prev) =>
										prev.map((msg) =>
											msg.id === assistantMsgId
												? { ...msg, content: responseText }
												: msg
										)
									);
								}
							} catch (e) {
								// Ignore JSON parse errors for non-complete packets
							}
						}
					}
				}
			}
		} catch (error: any) {
			console.error('Chat error:', error);
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMsgId
						? {
								...msg,
								content: `⚠️ **Error connecting to AI backend:** ${error.message || 'An unknown network error occurred.'}`,
							}
						: msg
				)
			);
		} finally {
			setIsTyping(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleTextareaInput = () => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = 'auto';
			textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
		}
	};

	const clearHistory = () => {
		if (window.confirm('Are you sure you want to clear your conversation history?')) {
			setMessages([]);
		}
	};

	const renderMarkdown = (content: string) => {
		try {
			// Convert markdown markup to safe sanitized HTML
			const rawHtml = marked.parse(content, { async: false }) as string;
			const cleanHtml = DOMPurify.sanitize(rawHtml);
			return { __html: cleanHtml };
		} catch (e) {
			return { __html: DOMPurify.sanitize(content) };
		}
	};

	const promptSuggestions = [
		'How do I view recent PHP errors in WordPress?',
		'Generate a standard custom post type registration snippet',
		'Explain how to safely enqueue custom scripts',
	];

	return (
		<div className="iris-drawer-container">
			{/* FAB Button */}
			<button
				className={`iris-fab ${isOpen ? 'iris-fab--active' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Toggle Iris AI Assistant"
			>
				{isOpen ? (
					<svg viewBox="0 0 24 24" fill="none" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
						<path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
					</svg>
				) : (
					<svg viewBox="0 0 24 24" fill="none" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
						<path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
				)}
			</button>

			{/* Sliding Drawer panel */}
			<div className={`iris-drawer ${isOpen ? 'iris-drawer--open' : ''}`}>
				{/* Header */}
				<div className="iris-drawer__header">
					<div className="iris-drawer__title-group">
						<h3 className="iris-drawer__title">Iris AI Assistant</h3>
						<span className="iris-drawer__subtitle">Model: {activeModel}</span>
					</div>
					<div className="iris-drawer__actions">
						{messages.length > 0 && (
							<button
								className="iris-drawer__clear-btn"
								onClick={clearHistory}
								title="Clear conversation"
							>
								<svg viewBox="0 0 24 24" fill="none" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
									<path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" fill="currentColor"/>
								</svg>
							</button>
						)}
						<button
							className="iris-drawer__close-btn"
							onClick={() => setIsOpen(false)}
						>
							&times;
						</button>
					</div>
				</div>

				{/* Body messages */}
				<div className="iris-drawer__body" ref={chatBodyRef}>
					{messages.length === 0 ? (
						<div className="iris-drawer__empty-state">
							<div className="iris-drawer__empty-icon">
								<svg viewBox="0 0 24 24" fill="none" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
									<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="currentColor"/>
								</svg>
							</div>
							<h4 className="iris-drawer__welcome-title">Welcome to Iris</h4>
							<p className="iris-drawer__welcome-text">
								Ask me questions about your site configuration, code diagnostics, theme configurations, or WordPress administration.
							</p>
							<div className="iris-drawer__suggestions">
								{promptSuggestions.map((suggestion, idx) => (
									<button
										key={idx}
										className="iris-drawer__suggestion-chip"
										onClick={() => handleSend(suggestion)}
									>
										{suggestion}
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="iris-drawer__messages">
							{messages.map((msg) => (
								<div
									key={msg.id}
									className={`iris-drawer__message iris-drawer__message--${msg.role}`}
								>
									<div className="iris-drawer__message-avatar">
										{msg.role === 'user' ? 'U' : 'AI'}
									</div>
									<div className="iris-drawer__message-bubble">
										{msg.content === '' && isTyping ? (
											<div className="iris-drawer__typing-indicator">
												<span></span>
												<span></span>
												<span></span>
											</div>
										) : (
											<div
												className="iris-drawer__message-text"
												dangerouslySetInnerHTML={renderMarkdown(msg.content)}
											/>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Input box */}
				<div className="iris-drawer__footer">
					<div className="iris-drawer__input-group">
						<textarea
							ref={textareaRef}
							className="iris-drawer__textarea"
							placeholder="Type your message..."
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onInput={handleTextareaInput}
							onKeyDown={handleKeyDown}
							rows={1}
							disabled={isTyping}
						/>
						<button
							className="iris-drawer__send-btn"
							onClick={() => handleSend()}
							disabled={!input.trim() || isTyping}
						>
							<svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
								<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
							</svg>
						</button>
					</div>
					<div className="iris-drawer__footer-note">
						Iris answers using the active OpenRouter model.
					</div>
				</div>
			</div>
		</div>
	);
};
