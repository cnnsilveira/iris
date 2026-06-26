import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
  /** Flag showing if debug logging is enabled. */
  debug_logging: boolean;
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
export const SettingsDashboard: React.FC<{ onBackToChat?: () => void }> = ({
  onBackToChat,
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<"settings" | "logs">("settings");

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
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptTab, setPromptTab] = useState<"raw" | "preview">("raw");
  const [contextSharing, setContextSharing] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
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
      setDebugLogging(data.debug_logging);
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
      debug_logging: debugLogging,
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

  const renderMarkdown = (content: string) => {
    try {
      const rawHtml = marked.parse(content, { async: false }) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      return { __html: cleanHtml };
    } catch (e) {
      return { __html: DOMPurify.sanitize(content) };
    }
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
    <div className="wrap">
      <h1 className="wp-heading-inline">Iris Settings</h1>
      {onBackToChat && (
        <button
          type="button"
          className="page-title-action"
          onClick={onBackToChat}
        >
          Return to Chat
        </button>
      )}
      <hr className="wp-header-end" />

      <div className="wp-filter">
        <ul className="filter-links">
          <li>
            <a
              href="#settings"
              className={activeTab === "settings" ? "current" : ""}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("settings");
              }}
            >
              Settings
            </a>
          </li>
          <li>
            <a
              href="#logs"
              className={activeTab === "logs" ? "current" : ""}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab("logs");
              }}
            >
              Debug Logs
            </a>
          </li>
        </ul>
      </div>

      {statusMsg && (
        <div
          className={`notice notice-${
            statusMsg.type === "error" ? "error" : statusMsg.type === "success" ? "success" : "info"
          } is-dismissible`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "15px 0",
          }}
        >
          <p>{statusMsg.text}</p>
          <button
            type="button"
            className="notice-dismiss"
            style={{
              position: "static",
              border: "none",
              background: "none",
              padding: "10px",
              cursor: "pointer",
            }}
            onClick={() => setStatusMsg(null)}
          >
            <span className="screen-reader-text">Dismiss this notice.</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSave}>
        {activeTab === "settings" ? (
          <table className="form-table" role="presentation">
            <tbody>
              {/* Section 1: API Configuration */}
              <tr>
                <th
                  scope="row"
                  colSpan={2}
                  style={{
                    padding: "20px 0 10px 0",
                    borderBottom: "1px solid #dcdcde",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.3em" }}>API Authentication</h2>
                </th>
              </tr>
              <tr>
                <th scope="row">
                  <label htmlFor="api_key">OpenRouter API Key</label>
                </th>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      id="api_key"
                      type="password"
                      className="regular-text"
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
                      <span
                        className="badge"
                        style={{
                          background: "#f0f0f1",
                          border: "1px solid #c3c4c7",
                          padding: "3px 8px",
                          borderRadius: "3px",
                          fontSize: "11px",
                          color: "#50575e",
                        }}
                      >
                        Configured in wp-config.php
                      </span>
                    )}
                  </div>
                  <p className="description">
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
                </td>
              </tr>

              {/* Section 2: Model Configuration */}
              <tr>
                <th
                  scope="row"
                  colSpan={2}
                  style={{
                    padding: "20px 0 10px 0",
                    borderBottom: "1px solid #dcdcde",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.3em" }}>Model Selection</h2>
                </th>
              </tr>
              <tr>
                <th scope="row">
                  <label>Active Model</label>
                </th>
                <td>
                  <div className="iris-settings__model-dropdown" ref={dropdownRef}>
                    <div
                      className={`iris-settings__model-trigger ${
                        dropdownOpen ? "iris-settings__model-trigger--open" : ""
                      }`}
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setDropdownOpen(!dropdownOpen);
                        }
                      }}
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
                        <span className="iris-settings__placeholder" style={{ color: "#646970" }}>
                          {selectedModel || "Select an AI Model..."}
                        </span>
                      )}
                      <svg
                        className="iris-settings__dropdown-arrow"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ transform: dropdownOpen ? "rotate(180deg)" : "none" }}
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
                              style={{ margin: 0 }}
                            />
                            <span>Free models only</span>
                          </label>
                        </div>

                        <div className="iris-settings__model-list">
                          {filteredModels.length > 0 ? (
                            filteredModels.map((model) => (
                              <div
                                key={model.id}
                                className={`iris-settings__model-option ${
                                  selectedModel === model.id
                                    ? "iris-settings__model-option--selected"
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setDropdownOpen(false);
                                }}
                              >
                                <div className="iris-settings__option-name">
                                  {model.name}
                                  {parseFloat(model.pricing.prompt.toString()) === 0 && (
                                    <span className="iris-settings__free-badge">Free</span>
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
                  <p className="description">
                    Select the LLM that Iris will query. Models marked as Free do not incur billing
                    charges on your OpenRouter account.
                  </p>
                </td>
              </tr>

              {/* Section 3: AI Behavior & System Prompts */}
              <tr>
                <th
                  scope="row"
                  colSpan={2}
                  style={{
                    padding: "20px 0 10px 0",
                    borderBottom: "1px solid #dcdcde",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.3em" }}>Assistant Instructions</h2>
                </th>
              </tr>
              <tr>
                <th scope="row">
                  <label htmlFor="system_prompt">System Prompt</label>
                </th>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "8px",
                      maxWidth: "600px",
                    }}
                  >
                    <button
                      type="button"
                      className={`button ${promptTab === "raw" ? "active" : ""}`}
                      onClick={() => setPromptTab("raw")}
                      style={{ height: "30px", lineHeight: "28px" }}
                    >
                      Markdown
                    </button>
                    <button
                      type="button"
                      className={`button ${promptTab === "preview" ? "active" : ""}`}
                      onClick={() => setPromptTab("preview")}
                      style={{ height: "30px", lineHeight: "28px" }}
                    >
                      Preview
                    </button>
                    <span className="description" style={{ marginLeft: "auto" }}>
                      {systemPrompt.length} characters
                    </span>
                  </div>

                  <div style={{ maxWidth: "600px" }}>
                    {promptTab === "raw" ? (
                      <textarea
                        id="system_prompt"
                        className="large-text"
                        rows={8}
                        placeholder="You are Iris, a helpful and expert AI assistant..."
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        style={{ fontFamily: "monospace" }}
                      />
                    ) : (
                      <div className="iris-settings__prompt-preview">
                        {systemPrompt.trim() ? (
                          <div dangerouslySetInnerHTML={renderMarkdown(systemPrompt)} />
                        ) : (
                          <p className="iris-settings__prompt-empty">Nothing to preview.</p>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="description">
                    Custom instructions prepended to the message context. Guides the tone,
                    boundaries, and responsiveness of the model.
                  </p>
                </td>
              </tr>
              <tr>
                <th scope="row">Site Telemetry</th>
                <td>
                  <label htmlFor="context_sharing">
                    <input
                      id="context_sharing"
                      type="checkbox"
                      checked={contextSharing}
                      onChange={(e) => setContextSharing(e.target.checked)}
                      style={{ margin: "0 8px 0 0", verticalAlign: "middle" }}
                    />
                    Share site telemetry to help Iris give better answers (WordPress version, active
                    plugins, and active theme).
                  </label>
                </td>
              </tr>

              {/* Section 4: Advanced Parameters */}
              <tr>
                <th
                  scope="row"
                  colSpan={2}
                  style={{
                    padding: "20px 0 10px 0",
                    borderBottom: "1px solid #dcdcde",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.3em" }}>Advanced Parameters</h2>
                </th>
              </tr>
              <tr>
                <th scope="row">
                  <label htmlFor="temperature">Temperature ({temperature.toFixed(1)})</label>
                </th>
                <td>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "15px",
                      maxWidth: "350px",
                    }}
                  >
                    <input
                      id="temperature"
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#646970",
                        minWidth: "80px",
                        textAlign: "right",
                      }}
                    >
                      {temperature <= 0.3
                        ? "Precise (0.0)"
                        : temperature >= 1.5
                          ? "Creative (2.0)"
                          : "Balanced"}
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  <label htmlFor="max_tokens">Max Output Tokens</label>
                </th>
                <td>
                  <input
                    id="max_tokens"
                    type="number"
                    min="1"
                    max="32768"
                    className="small-text"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 4096)}
                  />
                  <p className="description">Maximum length of the assistant response.</p>
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <table className="form-table" role="presentation">
            <tbody>
              <tr>
                <th
                  scope="row"
                  colSpan={2}
                  style={{
                    padding: "20px 0 10px 0",
                    borderBottom: "1px solid #dcdcde",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.3em" }}>Developer Tools</h2>
                </th>
              </tr>
              <tr>
                <th scope="row">Debug Logging</th>
                <td>
                  <label htmlFor="debug_logging">
                    <input
                      id="debug_logging"
                      type="checkbox"
                      checked={debugLogging}
                      onChange={(e) => setDebugLogging(e.target.checked)}
                      style={{ margin: "0 8px 0 0", verticalAlign: "middle" }}
                    />
                    Enable Debug Logging
                  </label>
                  <p className="description">
                    Write API communication logs (including full request payloads and response
                    durations) to a local <code>iris-debug.log</code> file in the plugin root.
                  </p>
                  <p className="description" style={{ marginTop: "1rem" }}>
                    To view real-time log output, open your terminal at the plugin root and run:
                    <br />
                    <code
                      style={{
                        background: "#f0f0f1",
                        border: "1px solid #c3c4c7",
                        padding: "0.2rem 0.4rem",
                        borderRadius: "4px",
                        display: "inline-block",
                        marginTop: "0.5rem",
                      }}
                    >
                      tail -f iris-debug.log
                    </code>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <p
          className="submit"
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            marginTop: "20px",
            borderTop: "1px solid #dcdcde",
            paddingTop: "20px",
          }}
        >
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleSyncModels}
            disabled={syncing || (!hasApiKey && !hasConstantKey)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {syncing && <div className="iris-settings__spinner iris-settings__spinner--btn"></div>}
            Sync Models
          </button>
        </p>
      </form>
    </div>
  );
};
