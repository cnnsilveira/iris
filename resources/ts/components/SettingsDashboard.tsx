import React, { useState, useEffect, useRef } from "react";

/**
 * Representation of prompt and completion token costs.
 *
 * @since v0.1.0
 */
interface ModelPricing {
  /** Cost per token for prompts. */
  prompt: string | number;
  /** Cost per token for completions. */
  completion: string | number;
}

/**
 * Representation of an AI Model fetched from OpenRouter.
 *
 * @since v0.1.0
 */
interface Model {
  /** Unique model identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Maximum token context length. */
  context_length: number;
  /** Pricing information structure. */
  pricing: ModelPricing;
}

/**
 * Representation of the plugin options/settings interface.
 *
 * @since v0.1.0
 */
interface Settings {
  /** Active model ID. */
  model: string;
  /** Query temperature. */
  temperature: number;
  /** Maximum generation token limit. */
  max_tokens: number;
  /** Default system instruction prompt. */
  system_prompt: string;
  /** Toggle flag to share telemetry context. */
  context_sharing: boolean;
  /** Flag showing if api key is configured. */
  has_api_key: boolean;
  /** Flag showing if api key is forced by constant definition. */
  has_constant_key: boolean;
}

/**
 * SettingsDashboard Component.
 *
 * Renders the main administration settings layout for configuring
 * the Iris Assistant, API keys, behavior, and parameters.
 *
 * @since v0.1.0
 *
 * @returns {React.ReactElement} The settings dashboard markup.
 */
export const SettingsDashboard: React.FC = () => {
  // Loading & saving states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Settings states
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [contextSharing, setContextSharing] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasConstantKey, setHasConstantKey] = useState(false);

  // Model catalogue states
  const [models, setModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // REST details from localized script
  const restUrl = window.irisSettings?.restUrl || "/wp-json/iris/v1/";
  const nonce = window.irisSettings?.nonce || "";

  useEffect(() => {
    fetchSettings();
    fetchModels();

    // Click outside to close custom select dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (nonce) {
      headers["X-WP-Nonce"] = nonce;
    }
    return headers;
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${restUrl}settings`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch settings from server.");
      }

      const data: Settings = await response.json();
      setSelectedModel(data.model);
      setTemperature(data.temperature);
      setMaxTokens(data.max_tokens);
      setSystemPrompt(data.system_prompt);
      setContextSharing(data.context_sharing);
      setHasApiKey(data.has_api_key);
      setHasConstantKey(data.has_constant_key);

      if (data.has_api_key) {
        setApiKey("••••••••••••••••••••••••••••••••");
      }
    } catch (error: any) {
      setStatusMsg({
        type: "error",
        text: error.message || "Error fetching settings.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch(`${restUrl}models`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
        } else {
          // Fallback to mock models if list is empty for presentation
          const mockRes = await fetch(`${restUrl}models/mock`, {
            headers: getHeaders(),
          });
          if (mockRes.ok) {
            const mockData = await mockRes.json();
            setModels(mockData);
          }
        }
      }
    } catch (error) {
      console.error("Error loading model list:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const payload: Record<string, any> = {
      model: selectedModel,
      temperature: parseFloat(temperature.toString()),
      max_tokens: parseInt(maxTokens.toString(), 10),
      system_prompt: systemPrompt,
      context_sharing: contextSharing,
    };

    // Only send API key if user changed it from the mask
    if (apiKey && apiKey !== "••••••••••••••••••••••••••••••••") {
      payload.api_key = apiKey;
    }

    try {
      const response = await fetch(`${restUrl}settings`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save settings.");
      }

      setStatusMsg({ type: "success", text: "Settings saved successfully." });
      setHasApiKey(payload.api_key ? true : hasApiKey);

      // If api key was saved, trigger model refresh
      if (payload.api_key) {
        setApiKey("••••••••••••••••••••••••••••••••");
        fetchModels();
      }
    } catch (error: any) {
      setStatusMsg({
        type: "error",
        text: error.message || "Error saving settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncModels = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatusMsg({ type: "info", text: "Model synchronization triggered..." });

    try {
      const response = await fetch(`${restUrl}models/sync`, {
        method: "POST",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule model synchronization.");
      }

      // Wait a bit, then refetch models
      setTimeout(async () => {
        await fetchModels();
        setStatusMsg({
          type: "success",
          text: "Model catalog synchronized and updated.",
        });
        setSyncing(false);
      }, 3000);
    } catch (error: any) {
      setStatusMsg({
        type: "error",
        text: error.message || "Error syncing models.",
      });
      setSyncing(false);
    }
  };

  // Format pricing for display
  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    if (num === 0) return "Free";
    // Convert price per token to price per 1M tokens
    return `$${(num * 1000000).toFixed(2)}`;
  };

  const getModelPricingStr = (model: Model) => {
    const promptVal = parseFloat(model.pricing.prompt.toString());
    const completionVal = parseFloat(model.pricing.completion.toString());
    if (promptVal === 0 && completionVal === 0) {
      return "Free";
    }
    return `${formatPrice(model.pricing.prompt)}/1M prompt tokens`;
  };

  // Filter models based on search and free checkbox
  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase());
    const isFree =
      parseFloat(model.pricing.prompt.toString()) === 0 &&
      parseFloat(model.pricing.completion.toString()) === 0;

    return matchesSearch && (!freeOnly || isFree);
  });

  const activeModelObj = models.find((m) => m.id === selectedModel);

  if (loading) {
    return (
      <div className="iris-settings__loading">
        <div className="iris-settings__spinner"></div>
        <p>Loading Iris settings dashboard...</p>
      </div>
    );
  }

  return (
    <div className="iris-settings">
      <div className="iris-settings__header">
        <div className="iris-settings__branding">
          <svg
            className="iris-settings__logo"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
              fill="currentColor"
            />
          </svg>
          <div>
            <h1 className="iris-settings__title">Iris Assistant</h1>
            <p className="iris-settings__subtitle">
              Configure your WordPress AI Copilot, model parameters, and
              preferences.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="iris-settings__sync-btn"
          onClick={handleSyncModels}
          disabled={syncing || (!hasApiKey && !hasConstantKey)}
        >
          <svg
            className={`iris-settings__sync-icon ${syncing ? "iris-settings__sync-icon--spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
              fill="currentColor"
            />
          </svg>
          {syncing ? "Syncing..." : "Sync Models"}
        </button>
      </div>

      {statusMsg && (
        <div
          className={`iris-settings__alert iris-settings__alert--${statusMsg.type}`}
        >
          <span className="iris-settings__alert-text">{statusMsg.text}</span>
          <button
            className="iris-settings__alert-close"
            onClick={() => setStatusMsg(null)}
          >
            &times;
          </button>
        </div>
      )}

      <form className="iris-settings__form" onSubmit={handleSave}>
        {/* Section 1: API Configuration */}
        <div className="iris-settings__section">
          <h2 className="iris-settings__section-title">API Authentication</h2>
          <div className="iris-settings__form-group">
            <label htmlFor="api_key" className="iris-settings__label">
              OpenRouter API Key
            </label>
            <div className="iris-settings__input-wrapper">
              <input
                id="api_key"
                type="password"
                className="iris-settings__input"
                placeholder={
                  hasApiKey
                    ? "••••••••••••••••••••••••••••••••"
                    : "sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={hasConstantKey}
              />
              {hasConstantKey && (
                <div className="iris-settings__badge iris-settings__badge--constant">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    width="14"
                    height="14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 8H17V6C17 3.24 14.76 1 12 1C9.24 1 7 3.24 7 6V8H6C4.9 8 4 8.9 4 10V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V10C20 8.9 19.1 8 18 8ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15 8H9V6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V8Z"
                      fill="currentColor"
                    />
                  </svg>
                  Configured in wp-config.php
                </div>
              )}
            </div>
            <p className="iris-settings__help-text">
              Retrieve your API key from your{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenRouter Dashboard
              </a>
              .
            </p>
          </div>
        </div>

        {/* Section 2: Model Configuration */}
        <div className="iris-settings__section">
          <h2 className="iris-settings__section-title">Model Selection</h2>

          <div className="iris-settings__form-group">
            <label className="iris-settings__label">Active Model</label>

            <div className="iris-settings__model-dropdown" ref={dropdownRef}>
              <div
                className={`iris-settings__model-trigger ${dropdownOpen ? "iris-settings__model-trigger--open" : ""}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {activeModelObj ? (
                  <div className="iris-settings__selected-model">
                    <span className="iris-settings__selected-name">
                      {activeModelObj.name}
                    </span>
                    <span className="iris-settings__selected-meta">
                      {activeModelObj.context_length.toLocaleString()} ctx
                      &bull; {getModelPricingStr(activeModelObj)}
                    </span>
                  </div>
                ) : (
                  <span className="iris-settings__placeholder">
                    {selectedModel || "Select an AI Model..."}
                  </span>
                )}
                <svg
                  className="iris-settings__dropdown-arrow"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 10L12 15L17 10H7Z" fill="currentColor" />
                </svg>
              </div>

              {dropdownOpen && (
                <div className="iris-settings__model-menu">
                  <div className="iris-settings__model-menu-header">
                    <input
                      type="text"
                      className="iris-settings__model-search"
                      placeholder="Search models..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                    <label
                      className="iris-settings__free-filter"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={freeOnly}
                        onChange={(e) => setFreeOnly(e.target.checked)}
                      />
                      Free models only
                    </label>
                  </div>

                  <div className="iris-settings__model-list">
                    {filteredModels.length > 0 ? (
                      filteredModels.map((model) => (
                        <div
                          key={model.id}
                          className={`iris-settings__model-option ${selectedModel === model.id ? "iris-settings__model-option--selected" : ""}`}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setDropdownOpen(false);
                          }}
                        >
                          <div className="iris-settings__option-name">
                            {model.name}
                            {parseFloat(model.pricing.prompt.toString()) ===
                              0 && (
                              <span className="iris-settings__free-badge">
                                Free
                              </span>
                            )}
                          </div>
                          <div className="iris-settings__option-meta">
                            {model.id} &bull;{" "}
                            {(model.context_length / 1000).toFixed(0)}k context
                            &bull; {getModelPricingStr(model)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="iris-settings__model-no-results">
                        No models found matching criteria.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="iris-settings__help-text">
              Select the LLM that Iris will query. Models marked as Free do not
              incur billing charges on your OpenRouter account.
            </p>
          </div>
        </div>

        {/* Section 3: AI Behavior & System Prompts */}
        <div className="iris-settings__section">
          <h2 className="iris-settings__section-title">
            Assistant Instructions
          </h2>

          <div className="iris-settings__form-group">
            <label htmlFor="system_prompt" className="iris-settings__label">
              System Prompt
            </label>
            <textarea
              id="system_prompt"
              className="iris-settings__textarea"
              rows={6}
              placeholder="You are Iris, a helpful and expert AI assistant integrated within WordPress. Help the user troubleshoot issues, write code, or craft layouts."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="iris-settings__help-text">
              Custom instructions prepended to the message context. Guides the
              tone, boundaries, and responsiveness of the model.
            </p>
          </div>

          <div className="iris-settings__form-group iris-settings__form-group--checkbox">
            <label className="iris-settings__checkbox-label">
              <input
                type="checkbox"
                className="iris-settings__checkbox"
                checked={contextSharing}
                onChange={(e) => setContextSharing(e.target.checked)}
              />
              <span className="iris-settings__checkbox-text">
                Share site telemetry to help Iris give better answers (WordPress
                version, active plugins, and active theme).
              </span>
            </label>
          </div>
        </div>

        {/* Section 4: Advanced Parameters */}
        <div className="iris-settings__section">
          <h2 className="iris-settings__section-title">Advanced Parameters</h2>

          <div className="iris-settings__grid">
            <div className="iris-settings__form-group">
              <label htmlFor="temperature" className="iris-settings__label">
                Temperature ({temperature.toFixed(1)})
              </label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                className="iris-settings__slider"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <div className="iris-settings__slider-labels">
                <span>Precise (0.0)</span>
                <span>Creative (2.0)</span>
              </div>
            </div>

            <div className="iris-settings__form-group">
              <label htmlFor="max_tokens" className="iris-settings__label">
                Max Output Tokens
              </label>
              <input
                id="max_tokens"
                type="number"
                min="1"
                max="32768"
                className="iris-settings__input"
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(parseInt(e.target.value, 10) || 1024)
                }
              />
              <p className="iris-settings__help-text">
                Maximum length of the assistant response.
              </p>
            </div>
          </div>
        </div>

        <div className="iris-settings__footer">
          <button
            type="submit"
            className="iris-settings__save-btn"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="iris-settings__spinner iris-settings__spinner--btn"></div>
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
