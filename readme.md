
---

```markdown
# 🎵 YouTube Playlist Downloader (MP3)

Aplicación full-stack para descargar playlists de YouTube en formato **MP3**, mostrando el progreso en tiempo real mediante **Server-Sent Events (SSE)**.

Incluye:
- Progreso individual por canción
- Progreso general dinámico
- Tema claro / oscuro automático
- Generación de archivo ZIP descargable

---

## 🧩 Tecnologías

### Backend
- Node.js
- Express
- yt-dlp
- ffmpeg
- Server-Sent Events (SSE)
- Archiver (ZIP)

### Frontend
- React
- Axios
- EventSource (SSE)

---

## 📂 Estructura del proyecto

```

/
├── backend/
│   ├── server.js
│   ├── downloads/        # Ignorada por git
│   └── .env              # Ignorada por git
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── .gitignore
└── README.md

```

---

## ⚙️ Requisitos

### General
- Node.js 18 o superior
- yt-dlp instalado y accesible desde la terminal
- ffmpeg instalado

---

## ⚠️ Importante para Windows

En **Windows**, es obligatorio:

1. Descargar **ffmpeg**
2. Colocar la carpeta `ffmpeg` en:

```

C:\ffmpeg

```

3. Agregar al **PATH del sistema**:

```

C:\ffmpeg\bin

````

4. Verificar la instalación ejecutando:

```bash
ffmpeg -version
````

Si el comando no es reconocido, **yt-dlp no podrá convertir los audios a MP3** y se descargarán en formato original (`webm`).

---

## 🔐 Variables de entorno

Crea un archivo `.env` dentro de la carpeta **backend**:

```env
YOUTUBE_API_KEY=TU_API_KEY_DE_YOUTUBE
PORT=4000
```

> ⚠️ El archivo `.env` está excluido del repositorio por seguridad.

---

## ▶️ Instalación y ejecución

### Backend

```bash
cd backend
npm install
node server.js
```

Servidor disponible en:

```
http://localhost:4000
```

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicación disponible en:

```
http://localhost:5173
```

---

## 🚀 Funcionalidades actuales

* Consulta información de playlists de YouTube
* Descarga de playlists completas en MP3
* Progreso por canción en tiempo real
* Progreso general dinámico
* Interfaz moderna con soporte claro / oscuro
* Descarga final en archivo ZIP

---

## 🧠 Roadmap / Mejoras futuras

* [ ] Dockerización (backend + frontend)
* [ ] Selector de formato de salida (MP3 / M4A / WAV)
* [ ] Soporte para playlists grandes (paginación)
* [ ] UI con Tailwind CSS o Material UI
* [ ] Gestión de historial de descargas
* [ ] Autenticación de usuarios

---

## 📜 Nota legal

Este proyecto es solo para **uso educativo y personal**.
Respeta siempre los **términos de servicio de YouTube** y las leyes vigentes en tu país.

---

Proyecto desarrollado con fines educativos y de aprendizaje continuo.

```

---
```
