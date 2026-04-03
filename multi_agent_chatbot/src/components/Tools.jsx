import { useState, useEffect } from "react";
import { createTool, getTools, deleteTool } from "../api/chatbotApi";

export default function Tools({ token, onBack }) {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newToolType, setNewToolType] = useState("api");
  const [apiConfig, setApiConfig] = useState({ baseUrl: "", apiKey: "", headers: "{}" });
  const [pgMode, setPgMode] = useState("fields");
  const [pgConfig, setPgConfig] = useState({ host: "", port: "5432", database: "", username: "", password: "", uri: "" });
  const [mongoConfig, setMongoConfig] = useState({ uri: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTools(token);
        setTools(data);
      } catch (err) {
        console.error("Failed to load tools:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleAddTool(e) {
    e.preventDefault();
    setAdding(true);
    try {
      let config = {};
      if (newToolType === "api") {
        config = { baseUrl: apiConfig.baseUrl, apiKey: apiConfig.apiKey };
        try { config.headers = JSON.parse(apiConfig.headers); } catch { config.headers = {}; }
      } else if (newToolType === "postgres") {
        if (pgMode === "uri") {
          config = { uri: pgConfig.uri };
        } else {
          config = { 
            host: pgConfig.host, 
            port: Number(pgConfig.port) || 5432, 
            database: pgConfig.database, 
            username: pgConfig.username, 
            password: pgConfig.password 
          };
        }
      } else if (newToolType === "mongoDb") {
        config = { ...mongoConfig };
      }

      const tool = await createTool(token, newToolType, config);
      setTools([tool, ...tools]);
      
      setApiConfig({ baseUrl: "", apiKey: "", headers: "{}" });
      setPgMode("fields");
      setPgConfig({ host: "", port: "5432", database: "", username: "", password: "", uri: "" });
      setMongoConfig({ uri: "" });
    } catch (err) {
      console.error("Failed to add tool:", err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteTool(toolId) {
    try {
      await deleteTool(token, toolId);
      setTools(tools.filter(t => t._id !== toolId));
    } catch (err) {
      console.error("Failed to delete tool:", err);
    }
  }

  const toolTypeLabel = { api: "API", postgres: "PostgreSQL", mongoDb: "MongoDB" };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex h-14 w-full items-center gap-3 border-b border-[#2a2a2a] bg-[#171717] px-5 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#c5c5d2] transition-colors hover:bg-[#2a2a2a]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
        <div className="w-px h-6 bg-[#2a2a2a]"></div>
        <h3 className="text-[15px] font-semibold text-white">Manage Tools</h3>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">

          {/* Add Tool Card */}
          <div className="rounded-xl border border-[#2a2a2a] bg-[#171717] p-6 mb-8">
            <h2 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#10a37f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Tool
            </h2>

            <form onSubmit={handleAddTool} className="grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-[13px] font-medium text-[#c5c5d2]">Tool Type</label>
                <select
                  value={newToolType}
                  onChange={(e) => setNewToolType(e.target.value)}
                  className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                >
                  <option value="api">API</option>
                  <option value="postgres">PostgreSQL</option>
                  <option value="mongoDb">MongoDB</option>
                </select>
              </div>
              {newToolType === "api" && (
                <>
                  <div className="grid gap-1.5">
                    <label className="text-[13px] font-medium text-[#c5c5d2]">Base URL</label>
                    <input
                      type="text"
                      required
                      value={apiConfig.baseUrl}
                      onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                      placeholder="https://api.example.com/v1"
                      className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[13px] font-medium text-[#c5c5d2]">API Key (Optional)</label>
                    <input
                      type="password"
                      value={apiConfig.apiKey}
                      onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-[13px] font-medium text-[#c5c5d2]">Additional Headers (JSON)</label>
                    <textarea
                      value={apiConfig.headers}
                      onChange={(e) => setApiConfig({ ...apiConfig, headers: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white font-mono outline-none focus:border-[#10a37f] resize-none transition-colors"
                      placeholder='{"Content-Type": "application/json"}'
                    />
                  </div>
                </>
              )}

              {newToolType === "postgres" && (
                <div className="space-y-4">
                  <div className="flex bg-[#0a0a0a] rounded-lg p-1 border border-[#3a3a3a]">
                    <button
                      type="button"
                      onClick={() => setPgMode("fields")}
                      className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${pgMode === "fields" ? "bg-[#2a2a2a] text-white" : "text-[#6e6e80] hover:text-[#c5c5d2]"}`}
                    >
                      Standard Fields
                    </button>
                    <button
                      type="button"
                      onClick={() => setPgMode("uri")}
                      className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-colors ${pgMode === "uri" ? "bg-[#2a2a2a] text-white" : "text-[#6e6e80] hover:text-[#c5c5d2]"}`}
                    >
                      Connection String
                    </button>
                  </div>

                  {pgMode === "fields" ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <label className="text-[13px] font-medium text-[#c5c5d2]">Host</label>
                          <input
                            type="text"
                            required
                            value={pgConfig.host}
                            onChange={(e) => setPgConfig({ ...pgConfig, host: e.target.value })}
                            placeholder="localhost or db.example.com"
                            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <label className="text-[13px] font-medium text-[#c5c5d2]">Port</label>
                          <input
                            type="number"
                            required
                            value={pgConfig.port}
                            onChange={(e) => setPgConfig({ ...pgConfig, port: e.target.value })}
                            placeholder="5432"
                            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-[13px] font-medium text-[#c5c5d2]">Database Name</label>
                        <input
                          type="text"
                          required
                          value={pgConfig.database}
                          onChange={(e) => setPgConfig({ ...pgConfig, database: e.target.value })}
                          placeholder="mydb"
                          className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <label className="text-[13px] font-medium text-[#c5c5d2]">Username</label>
                          <input
                            type="text"
                            required
                            value={pgConfig.username}
                            onChange={(e) => setPgConfig({ ...pgConfig, username: e.target.value })}
                            placeholder="postgres"
                            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <label className="text-[13px] font-medium text-[#c5c5d2]">Password</label>
                          <input
                            type="password"
                            required
                            value={pgConfig.password}
                            onChange={(e) => setPgConfig({ ...pgConfig, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid gap-1.5">
                      <label className="text-[13px] font-medium text-[#c5c5d2]">Connection String (URI)</label>
                      <input
                        type="text"
                        required
                        value={pgConfig.uri}
                        onChange={(e) => setPgConfig({ ...pgConfig, uri: e.target.value })}
                        placeholder="postgresql://username:password@localhost:5432/mydb"
                        className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                      />
                      <p className="text-[11px] text-[#6e6e80] mt-1">
                        Provide a standard PostgreSQL connection URL.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {newToolType === "mongoDb" && (
                <div className="grid gap-1.5">
                  <label className="text-[13px] font-medium text-[#c5c5d2]">Connection String (URI)</label>
                  <input
                    type="text"
                    required
                    value={mongoConfig.uri}
                    onChange={(e) => setMongoConfig({ ...mongoConfig, uri: e.target.value })}
                    placeholder="mongodb://username:password@localhost:27017/mydb"
                    className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[#10a37f] transition-colors"
                  />
                  <p className="text-[11px] text-[#6e6e80] mt-1">
                    Standard connection string format for MongoDB deployments.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={adding}
                className="w-full rounded-lg bg-[#10a37f] px-4 py-2.5 text-[14px] font-medium text-white transition-all hover:bg-[#1a7f64] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
              >
                {adding ? "Adding..." : "Add Tool"}
              </button>
            </form>
          </div>

          {/* Tools List */}
          <div>
            <h2 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#10a37f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-3.22a2.24 2.24 0 01-1.09-2.61L6.2 5.1a2.24 2.24 0 012.61-1.09l5.58 3.22a2.24 2.24 0 011.09 2.61l-1.45 4.24a2.24 2.24 0 01-2.61 1.09z" />
              </svg>
              Your Tools
              <span className="text-[12px] text-[#6e6e80] font-normal">({tools.length})</span>
            </h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-[#10a37f] rounded-full animate-spin"></div>
              </div>
            ) : tools.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2a2a2a] py-12 flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-[#3a3a3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                <p className="text-[13px] text-[#6e6e80]">No tools configured yet.</p>
                <p className="text-[12px] text-[#4a4a4a]">Add your first tool above to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map(tool => (
                  <div key={tool._id} className="group rounded-xl border border-[#2a2a2a] bg-[#171717] p-4 transition-colors hover:border-[#3a3a3a]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${tool.toolType === "api" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : tool.toolType === "postgres" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-[#10a37f]/10 text-[#10a37f] border border-[#10a37f]/20"
                            }`}>
                            {toolTypeLabel[tool.toolType] || tool.toolType}
                          </span>
                          <span className="text-[11px] text-[#6e6e80]">
                            {new Date(tool.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <pre className="text-[12px] text-[#8e8ea0] font-mono bg-[#0a0a0a] rounded-lg p-3 overflow-x-auto border border-[#2a2a2a]">
                          {JSON.stringify(tool.configurations, null, 2)}
                        </pre>
                      </div>
                      <button
                        onClick={() => handleDeleteTool(tool._id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[#6e6e80] transition-colors hover:bg-red-500/10 hover:text-[#ef4444] shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
