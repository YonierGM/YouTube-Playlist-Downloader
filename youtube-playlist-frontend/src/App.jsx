import { useState, useEffect } from "react";
import axios from "axios";

const backend = "http://localhost:4000";

function App() {
  const [url, setUrl] = useState("");
  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [videoStatus, setVideoStatus] = useState({});
  const [videoProgress, setVideoProgress] = useState({});
  const [currentSong, setCurrentSong] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [zipLink, setZipLink] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [theme, setTheme] = useState("light");

  // Detecta tema del sistema
  useEffect(() => {
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(darkQuery.matches ? "dark" : "light");
    darkQuery.addEventListener("change", (e) =>
      setTheme(e.matches ? "dark" : "light")
    );
  }, []);

  // =======================
  // Obtener playlist y videos
  // =======================
  const getPlaylist = async () => {
    const res = await axios.post(`${backend}/playlist/info`, { url });
    setPlaylist(res.data);

    const vids = await axios.post(`${backend}/playlist/videos`, {
      playlistId: res.data.playlistId,
    });
    setVideos(vids.data);

    // Inicializar estados
    const status = {};
    const prog = {};
    vids.data.forEach((v) => {
      status[v.videoId] = "pending";
      prog[v.videoId] = 0;
    });
    setVideoStatus(status);
    setVideoProgress(prog);
    setOverallProgress(0);
  };

  // =======================
  // SSE: progreso de descarga
  // =======================
  const startProgress = () => {
    const es = new EventSource(`${backend}/progress`);

    es.onmessage = async (e) => {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case "title": {
          // Video que está empezando a descargarse
          const vidId = data.videoId || data.value;
          setCurrentSong(data.value);

          setVideoStatus((prev) => ({ ...prev, [vidId]: "downloading" }));
          setVideoProgress((prev) => ({ ...prev, [vidId]: 0 }));
          setDownloading(true);
          break;
        }

        case "progress": {
          const vidId = data.videoId || titleToId[currentSong];
          if (!vidId) return;

          setVideoProgress((prev) => {
            const newProgress = { ...prev, [vidId]: data.value };

            // Actualizar progreso general dinámicamente
            const totalProgress = videos.reduce((sum, v) => {
              const prog = newProgress[v.videoId] || 0;
              return sum + prog;
            }, 0);
            setOverallProgress(totalProgress / videos.length);

            return newProgress;
          });

          break;
        }

        case "doneVideo": {
          const vidId = data.videoId || titleToId[currentSong];
          if (!vidId) return;

          setVideoStatus((prev) => ({ ...prev, [vidId]: "done" }));
          setVideoProgress((prev) => {
            const newProgress = { ...prev, [vidId]: 100 };

            // Actualizar progreso general
            const totalProgress = videos.reduce((sum, v) => {
              const prog = newProgress[v.videoId] || 0;
              return sum + prog;
            }, 0);
            setOverallProgress(totalProgress / videos.length);

            return newProgress;
          });

          break;
        }

        case "donePlaylist": {
          es.close();
          setDownloading(false);
          setOverallProgress(100);

          // Forzar todos los videos a "done" y progreso 100%
          setVideoStatus((prev) => {
            const updated = { ...prev };
            videos.forEach((v) => (updated[v.videoId] = "done"));
            return updated;
          });
          setVideoProgress((prev) => {
            const updated = { ...prev };
            videos.forEach((v) => (updated[v.videoId] = 100));
            return updated;
          });

          // Crear ZIP y obtener link
          const zip = await axios.post(`${backend}/playlist/zip`, { folder: playlist.title });
          setZipLink(`${backend}/download/${zip.data.zip}`);

          break;
        }

        case "error":
          console.error("Error:", data.value);
          break;

        default:
          break;
      }
    };
  };


  // =======================
  // Descargar playlist
  // =======================
  const downloadPlaylist = async () => {
    setCurrentSong("");
    setZipLink("");
    setOverallProgress(0);

    // Reinicializar progreso individual
    const resetProg = {};
    const resetStatus = {};
    videos.forEach((v) => {
      resetProg[v.videoId] = 0;
      resetStatus[v.videoId] = "pending";
    });
    setVideoProgress(resetProg);
    setVideoStatus(resetStatus);

    startProgress();
    await axios.post(`${backend}/playlist/download`, { url });
  };

  // =======================
  // Iconos de estado
  // =======================
  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return "🔴";
      case "downloading": return "⏳";
      case "done": return "✅";
      default: return "❔";
    }
  };

  const colors = {
    bg: theme === "dark" ? "#1e1e1e" : "#f5f5f5",
    text: theme === "dark" ? "#eee" : "#111",
    cardPending: theme === "dark" ? "#2a2a2a" : "#f8f8f8",
    cardDownloading: theme === "dark" ? "#444422" : "#fffbe0",
    cardDone: theme === "dark" ? "#2a2a2a" : "#e0f7e9"
  };

  // =======================
  // Render
  // =======================
  return (
    <section className="main" style={{ backgroundColor: colors.bg, minHeight: "100dvh" }}>
      <div className="container"
        style={{
          padding: 20,
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          width: "60%",
          backgroundColor: colors.bg,
          color: colors.text,
          transition: "all 0.3s",
        }}
      >
        <h1>🎵 YouTube Playlist Downloader</h1>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="URL playlist"
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 10,
            borderRadius: 5,
            border: "1px solid #ccc",
            background: theme === "dark" ? "#333" : "#fff",
            color: colors.text,
          }}
        />
        <button
          onClick={getPlaylist}
          style={{
            padding: 10,
            borderRadius: 5,
            border: "none",
            marginBottom: 10,
            cursor: "pointer",
            backgroundColor: "#2196f3",
            color: "#fff",
          }}
        >
          Consultar
        </button>

        {playlist && (
          <>
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <img
                src={playlist.thumbnail}
                width={120}
                style={{ borderRadius: 5 }}
              />
              <div>
                <h2>{playlist.title}</h2>
                <p>{playlist.channel}</p>
                <button
                  onClick={downloadPlaylist}
                  disabled={downloading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 5,
                    border: "none",
                    cursor: downloading ? "not-allowed" : "pointer",
                    backgroundColor: downloading ? "#aaa" : "#28a745",
                    color: "#fff",
                  }}
                >
                  ⬇ Descargar playlist MP3
                </button>
              </div>
            </div>

            {videos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p>Progreso general: {overallProgress.toFixed(1)}%</p>
                <div
                  style={{
                    width: "100%",
                    height: 20,
                    background: theme === "dark" ? "#555" : "#ddd",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: `${overallProgress}%`,
                      height: "100%",
                      backgroundColor: "#4caf50",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {videos.map((v) => {
                const status = videoStatus[v.videoId] || "pending";
                const prog = videoProgress[v.videoId] || 0;

                const bgColor =
                  status === "done"
                    ? colors.cardDone
                    : status === "downloading"
                      ? colors.cardDownloading
                      : colors.cardPending;

                return (
                  <div
                    key={v.videoId}
                    style={{
                      padding: 10,
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      backgroundColor: bgColor,
                      color: colors.text,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                      transition: "all 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span>{getStatusIcon(status)}</span>
                      <span>{v.title}</span>
                    </div>

                    {status === "downloading" && (
                      <div
                        style={{
                          height: 8,
                          width: "100%",
                          backgroundColor: theme === "dark" ? "#555" : "#ddd",
                          borderRadius: 4,
                          overflow: "hidden",
                          marginTop: 5,
                        }}
                      >
                        <div
                          style={{
                            width: `${prog}%`,
                            height: "100%",
                            backgroundColor: "#2196f3",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {zipLink && (
              <div style={{ marginTop: 20 }}>
                <a
                  href={zipLink}
                  download
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#f44336",
                    color: "#fff",
                    borderRadius: 5,
                    textDecoration: "none",
                  }}
                >
                  ⬇ Descargar ZIP
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default App;
