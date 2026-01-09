import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import archiver from "archiver";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.YOUTUBE_API_KEY;

// =======================
// Utils
// =======================
function extractPlaylistId(url) {
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[1] : null;
}

// =======================
// SSE (PROGRESO)
// =======================
let clients = [];

app.get("/progress", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
});

function sendProgress(data) {
    clients.forEach(res => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

// =======================
// INFO PLAYLIST
// =======================
app.post("/playlist/info", async (req, res) => {
    try {
        const { url } = req.body;
        const playlistId = extractPlaylistId(url);
        if (!playlistId) return res.status(400).json({ message: "Playlist inválida" });

        const data = await axios.get("https://www.googleapis.com/youtube/v3/playlists", {
            params: {
                part: "snippet,contentDetails",
                id: playlistId,
                key: API_KEY,
            },
        });

        const p = data.data.items[0];
        res.json({
            title: p.snippet.title,
            channel: p.snippet.channelTitle,
            thumbnail: p.snippet.thumbnails.high.url,
            totalVideos: p.contentDetails.itemCount,
            playlistId,
        });
    } catch {
        res.status(500).json({ message: "Error playlist info" });
    }
});

// =======================
// VIDEOS PLAYLIST
// =======================
app.post("/playlist/videos", async (req, res) => {
    try {
        const { playlistId } = req.body;

        const data = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
            params: {
                part: "snippet,contentDetails",
                playlistId,
                maxResults: 50,
                key: API_KEY,
            },
        });

        const list = data.data.items.map(v => ({
            videoId: v.contentDetails.videoId,
            title: v.snippet.title,
            thumbnail: v.snippet.thumbnails.medium.url,
        }));

        res.json(list);
    } catch {
        res.status(500).json({ message: "Error videos" });
    }
});

// =======================
// DESCARGAR PLAYLIST
// =======================
app.post("/playlist/download", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: "URL requerida" });

    // Spawn de yt-dlp
    const yt = spawn("yt-dlp", [
        "--newline",
        "--extract-audio",
        "--audio-format", "mp3",
        "--audio-quality", "0",
        "--prefer-ffmpeg",
        "--print-json",
        "-o", "downloads/%(playlist_title)s/%(title)s.%(ext)s",
        url
    ]);

    let currentVideoId = null;

    yt.stdout.on("data", (data) => {
        const lines = data.toString().split("\n").filter(Boolean);
        lines.forEach(line => {
            try {
                const info = JSON.parse(line);
                currentVideoId = info.id;
                sendProgress({ type: "title", value: info.title, videoId: info.id });
                sendProgress({ type: "doneVideo", videoId: info.id });
            } catch {
                // no es JSON, puede ser otra info
                const progMatch = line.match(/(\d{1,3}\.\d)%/);
                if (progMatch && currentVideoId) {
                    sendProgress({ type: "progress", value: parseFloat(progMatch[1]), videoId: currentVideoId });
                }

                if (line.includes("has already been downloaded") || line.includes("Deleting original file")) {
                    if (currentVideoId) sendProgress({ type: "doneVideo", videoId: currentVideoId });
                }

                if (line.includes("ERROR") && currentVideoId) {
                    sendProgress({ type: "error", value: line, videoId: currentVideoId });
                }
            }
        });
    });

    yt.stderr.on("data", (data) => {
        const line = data.toString();
        if (line.includes("ERROR") && currentVideoId) sendProgress({ type: "error", value: line, videoId: currentVideoId });
    });

    yt.on("close", () => {
        sendProgress({ type: "donePlaylist" });
    });

    res.json({ message: "Descarga iniciada" });
});

// =======================
// CREAR ZIP
// =======================
app.post("/playlist/zip", async (req, res) => {
    const { folder } = req.body;
    const sourceDir = path.join("downloads", folder);
    const zipName = `${folder}.zip`;
    const zipPath = path.join(zipName);

    if (!fs.existsSync(sourceDir)) return res.status(404).json({ message: "Carpeta no encontrada" });

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        res.json({ zip: zipName });
    });

    archive.on("error", err => {
        console.error(err);
        res.status(500).json({ message: "Error creando ZIP" });
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
});

// =======================
// DESCARGAR ZIP
// =======================
app.get("/download/:zip", (req, res) => {
    res.download(req.params.zip);
});

// =======================
// LIMPIEZA
// =======================
app.post("/cleanup", (req, res) => {
    const { folder, zip } = req.body;
    fs.rmSync(`downloads/${folder}`, { recursive: true, force: true });
    if (fs.existsSync(zip)) fs.unlinkSync(zip);
    res.json({ message: "Limpieza OK" });
});

app.listen(PORT, () => {
    console.log("Backend en puerto", PORT);
});
