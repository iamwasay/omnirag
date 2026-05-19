import { useEffect, useRef, useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [status, setStatus] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedSource, setSelectedSource] = useState("all");
  const [dragActive, setDragActive] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let savedSessionId = localStorage.getItem("omnirag_session_id");

    if (!savedSessionId) {
      savedSessionId = crypto.randomUUID();
      localStorage.setItem("omnirag_session_id", savedSessionId);
    }

    setSessionId(savedSessionId);

    const savedFiles = localStorage.getItem("omnirag_uploaded_files");
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveUploadedFiles = (files) => {
    setUploadedFiles(files);
    localStorage.setItem("omnirag_uploaded_files", JSON.stringify(files));
  };

  const allowedFile = (selectedFile) => {
    if (!selectedFile) return false;

    const name = selectedFile.name.toLowerCase();
    const type = selectedFile.type;

    return (
      type === "application/pdf" ||
      type === "text/plain" ||
      name.endsWith(".pdf") ||
      name.endsWith(".txt")
    );
  };

  const uploadFile = async (selectedFile) => {
    if (!selectedFile) {
      setStatus("Please select a file.");
      return;
    }

    if (!sessionId) {
      setStatus("Session not ready yet.");
      return;
    }

    try {
      setLoadingUpload(true);
      setStatus("");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("session_id", sessionId);

      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setStatus(data.message);

      const updatedFiles = Array.from(
        new Set([...uploadedFiles, selectedFile.name])
      );

      saveUploadedFiles(updatedFiles);
      setSelectedSource(selectedFile.name);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    if (!allowedFile(selectedFile)) {
      setStatus("Only PDF and TXT files are allowed.");
      return;
    }

    setFile(selectedFile);
    setStatus(`Uploading ${selectedFile.name}...`);
    await uploadFile(selectedFile);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await handleFileSelect(droppedFile);
    }
  };

  const askQuestion = async () => {
    if (!query.trim()) return;

    const currentQuestion = query;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: currentQuestion,
      },
    ]);

    setQuery("");

    try {
      setLoadingAsk(true);

      const params = new URLSearchParams();
      params.append("query", currentQuestion);
      params.append("session_id", sessionId);

      if (selectedSource !== "all") {
        params.append("source_file", selectedSource);
      }

      const response = await fetch(
        `http://127.0.0.1:8000/ask?${params.toString()}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No answer returned.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error.message,
        },
      ]);
    } finally {
      setLoadingAsk(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem("omnirag_session_id");
    localStorage.removeItem("omnirag_uploaded_files");
    setSessionId("");
    setUploadedFiles([]);
    setSelectedSource("all");
    setStatus("Session cleared. Refresh the page to start fresh.");
    setMessages([]);
    setFile(null);
  };

  const IconUpload = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );

  const IconSend = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );

  const IconSpark = () => (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      <path d="M19 13l.8 2.7L22 16.5l-2.2.8L19 20l-.8-2.7-2.2-.8 2.2-.8L19 13z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.10),_transparent_28%)]" />

      <div className="flex min-h-screen">
        <aside className="hidden w-[340px] border-r border-white/10 bg-white/[0.03] px-6 py-7 backdrop-blur md:flex md:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-cyan-500/10">
              <IconSpark />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">OmniRAG</h1>
              <p className="text-sm text-white/45">Enterprise document intelligence</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/70">
                <IconUpload />
                Upload
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`group cursor-pointer rounded-2xl border border-dashed p-5 text-center transition-all duration-200 ${
                  dragActive
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-white/10 bg-white/[0.03] hover:border-cyan-400/50 hover:bg-white/[0.05]"
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300 transition group-hover:scale-105">
                  <IconUpload />
                </div>
                <p className="text-sm font-medium text-white/90">Drop PDF or TXT here</p>
                <p className="mt-1 text-xs text-white/40">Upload starts automatically</p>
              </div>

              {file && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">
                  {file.name}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <label className="mb-2 block text-sm font-medium text-white/70">
                Filter document
              </label>

              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#0B1120] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60"
              >
                <option value="all">All documents</option>
                {uploadedFiles.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 text-sm font-medium text-white/70">
                Uploaded files
              </div>

              <div className="space-y-2">
                {uploadedFiles.length > 0 ? (
                  uploadedFiles.map((name) => (
                    <div
                      key={name}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/75"
                    >
                      {name}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/35">No files uploaded yet</p>
                )}
              </div>
            </div>

            <button
              onClick={clearSession}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white"
            >
              Reset session
            </button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium tracking-tight md:text-xl">
                  Enterprise AI Assistant
                </h2>
                <p className="text-xs text-white/45 md:text-sm">
                  Ask questions from your uploaded documents
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/55">
                Session {sessionId ? "active" : "loading"}
              </div>
            </div>
          </header>

          <section className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-5">
              {messages.length === 0 && (
                <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.04] shadow-lg shadow-cyan-500/10">
                    <IconSpark />
                  </div>
                  <h3 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    A cleaner way to query your documents
                  </h3>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 md:text-base">
                    Drop a document in the sidebar, then ask your policy or SOP question here.
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-[1.5rem] border px-5 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)] md:max-w-3xl ${
                      message.role === "user"
                        ? "border-cyan-400/20 bg-cyan-500/10 text-white"
                        : "border-white/10 bg-white/[0.04] text-white/90"
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-7">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {loadingAsk && (
                <div className="flex justify-start">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.1s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-300" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </section>

          <footer className="border-t border-white/10 bg-white/[0.03] px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-col gap-3">
              <div className="rounded-[1.6rem] border border-white/10 bg-[#0B1120] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <textarea
                    rows="2"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        askQuestion();
                      }
                    }}
                    placeholder="Ask something about your documents..."
                    className="min-h-[56px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px] text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400/60"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      onClick={askQuestion}
                      disabled={loadingAsk || !query.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:scale-[1.01] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconSend />
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {status && (
                <div className="text-center text-sm text-white/45">
                  {status}
                </div>
              )}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;