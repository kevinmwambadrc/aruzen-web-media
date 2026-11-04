#!/usr/bin/python3
"""Aruzen Web Media : hôte natif partagé par les extensions et le widget.

Modes :
  chrome-extension://…      messagerie native (lancé par Chrome / Edge)
  --enqueue '<json>'        crée une tâche (widget)
  --worker <id>             exécute yt-dlp pour une tâche
  --jobs                    liste des tâches en JSON
  --cancel <id> | --clear | --open <type> | --reveal <id>
  --settings ['<json>']     lit ou modifie les réglages
"""
import fcntl
import json
import os
import re
import shutil
import signal
import struct
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import uuid

VERSION = "1.0.0"
HOME = os.path.expanduser("~")
APP_DIR = os.path.join(HOME, "Library", "Application Support", "AruzenWebMedia")
JOBS_DIR = os.path.join(APP_DIR, "jobs")
LOGS_DIR = os.path.join(APP_DIR, "logs")
SETTINGS_FILE = os.path.join(APP_DIR, "settings.json")
OUT_ROOT = os.path.join(HOME, "Downloads", "Web Media")
FOLDERS = {
    "video": "Vidéos",
    "audio": "Musique",
    "playlist": "Playlists",
    "subs": "Sous-titres",
    "thumb": "Miniatures",
    "file": "Fichiers",
}
DEFAULT_SETTINGS = {
    "max_parallel": 2,       # téléchargements simultanés
    "low_priority": True,    # yt-dlp / ffmpeg en priorité basse (cœurs économes)
    "ffmpeg_threads": 2,     # limite CPU des conversions
    "fragments": 4,          # fragments HLS/DASH téléchargés en parallèle
}
ANSI = re.compile(r"\x1b\[[0-9;]*m")
PATH_ENV = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"


def find_bin(name):
    for d in PATH_ENV.split(":"):
        p = os.path.join(d, name)
        if os.path.exists(p):
            return p
    return shutil.which(name)


YTDLP = find_bin("yt-dlp")
FFMPEG = find_bin("ffmpeg")

for d in (JOBS_DIR, LOGS_DIR):
    os.makedirs(d, exist_ok=True)


# ---------- réglages et tâches ----------

def load_settings():
    s = dict(DEFAULT_SETTINGS)
    try:
        with open(SETTINGS_FILE, encoding="utf-8") as f:
            s.update(json.load(f))
    except (OSError, ValueError):
        pass
    return s


def save_settings(changes):
    s = load_settings()
    for k, v in changes.items():
        if k in DEFAULT_SETTINGS:
            s[k] = type(DEFAULT_SETTINGS[k])(v)
    s["max_parallel"] = max(1, min(6, s["max_parallel"]))
    write_json(SETTINGS_FILE, s)
    return s


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


def job_path(job_id):
    return os.path.join(JOBS_DIR, re.sub(r"[^\w-]", "", job_id) + ".json")


def load_job(job_id):
    try:
        with open(job_path(job_id), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def save_job(job):
    write_json(job_path(job["id"]), job)


def list_jobs(limit=40):
    jobs = []
    for name in os.listdir(JOBS_DIR):
        if name.endswith(".json"):
            j = load_job(name[:-5])
            if j:
                jobs.append(j)
    jobs.sort(key=lambda j: j.get("created", 0), reverse=True)
    return jobs[:limit] if limit else jobs


def pid_alive(pid):
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


class QueueLock:
    def __enter__(self):
        self.f = open(os.path.join(APP_DIR, "queue.lock"), "w")
        fcntl.flock(self.f, fcntl.LOCK_EX)
        return self

    def __exit__(self, *exc):
        fcntl.flock(self.f, fcntl.LOCK_UN)
        self.f.close()


def schedule():
    """Démarre les tâches en attente tant qu'il reste des places."""
    with QueueLock():
        settings = load_settings()
        now = time.time()
        busy = 0
        queued = []
        for j in list_jobs(limit=None):
            st = j.get("status")
            if st == "running":
                if pid_alive(j.get("pid")):
                    busy += 1
                else:
                    j.update(status="error", error="Interrompu")
                    save_job(j)
            elif st == "starting":
                if now - j.get("updated", 0) < 30:
                    busy += 1
                else:
                    j["status"] = "queued"
                    queued.append(j)
            elif st == "queued":
                queued.append(j)
        queued.sort(key=lambda j: j.get("created", 0))
        for j in queued[: max(0, settings["max_parallel"] - busy)]:
            j.update(status="starting", updated=now)
            save_job(j)
            log = open(os.path.join(LOGS_DIR, j["id"] + ".log"), "a")
            subprocess.Popen(
                [sys.executable, os.path.abspath(__file__), "--worker", j["id"]],
                stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                start_new_session=True, close_fds=True,
                env=dict(os.environ, PATH=PATH_ENV),
            )


def create_job(req):
    url = str(req.get("url", "")).strip()
    kind = req.get("kind", "video")
    if not re.match(r"^https?://", url):
        return {"ok": False, "error": "Lien invalide"}
    if kind not in FOLDERS:
        return {"ok": False, "error": "Type inconnu : %s" % kind}
    if not YTDLP:
        return {"ok": False, "error": "yt-dlp introuvable (brew install yt-dlp)"}
    now = time.time()
    job = {
        "id": time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6],
        "url": url,
        "kind": kind,
        "title": req.get("title") or url,
        "quality": str(req.get("quality", "best")),
        "container": req.get("container", "mp4"),
        "audio_format": req.get("audio_format", "mp3"),
        "media": req.get("media", "video"),          # pour les playlists
        "items": str(req.get("items", "")).strip(),  # ex. 1-10,15
        "sub_langs": req.get("sub_langs") or "fr,en",
        "referer": req.get("referer", ""),
        "status": "queued",
        "percent": 0,
        "speed": "",
        "eta": "",
        "files": [],
        "created": now,
        "updated": now,
    }
    save_job(job)
    schedule()
    return {"ok": True, "job": load_job(job["id"]) or job}


def cancel_job(job_id):
    job = load_job(job_id)
    if not job:
        return {"ok": False, "error": "Tâche introuvable"}
    if job["status"] in ("running", "starting") and pid_alive(job.get("pid")):
        try:
            os.killpg(job["pid"], signal.SIGTERM)
        except OSError:
            pass
    if job["status"] in ("queued", "starting", "running"):
        job.update(status="cancelled", updated=time.time())
        save_job(job)
    schedule()
    return {"ok": True}


def clear_jobs():
    for j in list_jobs(limit=None):
        if j["status"] in ("done", "error", "cancelled"):
            for p in (job_path(j["id"]), os.path.join(LOGS_DIR, j["id"] + ".log")):
                try:
                    os.remove(p)
                except OSError:
                    pass
    return {"ok": True}


# ---------- Pinterest ----------
# yt-dlp ne lit ni les épingles « carrousel » (plusieurs vidéos) ni certaines épingles Idée :
# on lit alors directement la fiche JSON de l'épingle et on télécharge chaque vidéo trouvée.

PIN_RE = re.compile(r"pinterest\.[a-z.]+/pin/(?:[^/]*--)?(\d+)", re.I)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def is_pinterest(url):
    return bool(re.search(r"(^|\.)(pinterest\.[a-z.]+|pin\.it)/", url, re.I))


def pinterest_hint(url):
    """Message clair quand le lien Pinterest n'est pas celui d'une épingle."""
    if is_pinterest(url) and not PIN_RE.search(url):
        return "Sur Pinterest, ouvre l'épingle de la vidéo (adresse en /pin/…) puis relance."
    return ""


def pinterest_videos(url):
    """Renvoie (titre, miniature, [adresses vidéo]) d'une épingle, ou None."""
    try:
        if "pin.it/" in url:  # lien court : on suit la redirection
            url = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20).geturl()
        m = PIN_RE.search(url)
        if not m:
            return None
        data = json.dumps({"options": {"id": m.group(1), "field_set_key": "unauth_react_main_pin"}})
        api = "https://www.pinterest.com/resource/PinResource/get/?data=" + urllib.parse.quote(data)
        req = urllib.request.Request(api, headers={"User-Agent": UA, "Accept": "application/json",
                                                   "X-Pinterest-PWS-Handler": "www/pin/[id].js"})
        pin = json.load(urllib.request.urlopen(req, timeout=30))["resource_response"]["data"]
    except Exception:
        return None
    found, seen = [], set()

    def walk(o):
        if isinstance(o, dict):
            vl = o.get("video_list")
            if isinstance(vl, dict):
                cands = [v for v in vl.values() if isinstance(v, dict) and v.get("url")]
                # MP4 direct en priorité (pas de conversion), puis la plus grande largeur.
                cands.sort(key=lambda v: (v.get("width") or 0, v["url"].endswith(".mp4")), reverse=True)
                if cands:
                    key = re.sub(r"(_\d+w)?\.(mp4|m3u8)$", "", cands[0]["url"].rsplit("/", 1)[-1])
                    if key not in seen:
                        seen.add(key)
                        found.append(cands[0]["url"])
                return
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(pin)
    title = (pin.get("title") or pin.get("grid_title") or pin.get("seo_title") or "").split(" | ")[0].strip()
    if len(title) > 90:  # les descriptions servent souvent de titre : on coupe au mot
        title = title[:90].rsplit(" ", 1)[0].rstrip(" ,.…") + "…"
    title = title or "Pinterest " + m.group(1)
    thumb = ((pin.get("images") or {}).get("orig") or {}).get("url")
    return title, thumb, found


# ---------- yt-dlp ----------

def build_args(job, settings, url=None, name=None):
    out = os.path.join(OUT_ROOT, FOLDERS[job["kind"]])
    os.makedirs(out, exist_ok=True)
    name = name or "%(title).150B [%(id)s].%(ext)s"
    args = []
    if settings["low_priority"]:
        args += ["/usr/sbin/taskpolicy", "-c", "utility", "/usr/bin/nice", "-n", "10"]
    args += [
        YTDLP, "--newline", "--progress", "--no-simulate", "--no-mtime", "--trim-filenames", "180",
        "--concurrent-fragments", str(settings["fragments"]),
        "--progress-template",
        "download:[P]%(progress._percent_str)s;;%(progress._speed_str)s;;%(progress._eta_str)s"
        ";;%(info.playlist_index|)s;;%(info.n_entries|)s",
        "--print", "before_dl:[T]%(playlist_title,title)s",
        "--print", "after_move:[F]%(filepath)s",
        "--postprocessor-args", "ffmpeg:-threads %d" % settings["ffmpeg_threads"],
    ]
    if FFMPEG:
        args += ["--ffmpeg-location", os.path.dirname(FFMPEG)]
    if job.get("referer"):
        args += ["--referer", job["referer"]]

    q = job.get("quality", "best")
    kind = job["kind"]
    media = job.get("media") if kind == "playlist" else kind

    def video_args():
        mp4 = job.get("container", "mp4") == "mp4"
        res = "res:%s" % q if q.isdigit() else "res"
        sort = res + (",vcodec:h264,acodec:aac" if mp4 else "")
        return ["-S", sort, "--merge-output-format", "mp4" if mp4 else "mkv", "--embed-metadata"]

    def audio_args():
        fmt = job.get("audio_format", "mp3")
        a = ["-f", "ba/b", "-x", "--audio-format", fmt, "--audio-quality", "0", "--embed-metadata"]
        if fmt in ("mp3", "m4a"):
            a.append("--embed-thumbnail")
        return a

    if kind == "playlist":
        args += ["--yes-playlist", "-o",
                 os.path.join(out, "%(playlist_title,uploader,id)s", "%(playlist_index)03d - %(title).120B.%(ext)s")]
        if job.get("items"):
            args += ["--playlist-items", job["items"]]
        args += audio_args() if media == "audio" else video_args()
    else:
        args += ["--no-playlist", "-o", os.path.join(out, name)]
        if kind == "video":
            args += video_args()
        elif kind == "audio":
            args += audio_args()
        elif kind == "subs":
            args += ["--skip-download", "--write-subs", "--write-auto-subs",
                     "--sub-langs", job.get("sub_langs") or "fr,en", "--convert-subs", "srt"]
        elif kind == "thumb":
            args += ["--skip-download", "--write-thumbnail", "--convert-thumbnails", "jpg"]
        elif kind == "file":
            args += ["-o", os.path.join(out, "%(title).150B.%(ext)s")]
    args.append(url or job["url"])
    return args, out


def run_worker(job_id):
    job = load_job(job_id)
    if not job or job["status"] == "cancelled":
        return
    settings = load_settings()
    args, out = build_args(job, settings)
    job.update(status="running", pid=os.getpid(), started=time.time(), updated=time.time(), folder=out)
    save_job(job)
    rc, last_error = stream(job, args)
    # Pinterest : si yt-dlp échoue, on télécharge les vidéos lues dans la fiche de l'épingle.
    if rc != 0 and not job["files"] and job["kind"] in ("video", "file") and is_pinterest(job["url"]):
        pin = pinterest_videos(job["url"])
        if pin and pin[2]:
            title, _, videos = pin
            job.update(title=title, percent=0)
            save_job(job)
            safe = re.sub(r'[\\/:*?"<>|]+', " ", title)[:120].strip()
            rc, last_error = 0, ""
            for i, v in enumerate(videos, 1):
                if (load_job(job_id) or {}).get("status") == "cancelled":
                    return
                job["item"] = "%d/%d" % (i, len(videos)) if len(videos) > 1 else ""
                name = safe + (" - %02d" % i if len(videos) > 1 else "") + ".%(ext)s"
                r, err = stream(job, build_args(job, settings, url=v, name=name)[0], keep_title=True)
                if r != 0:
                    rc, last_error = r, err
        elif not last_error or "Unsupported URL" in last_error:
            last_error = pinterest_hint(job["url"]) or last_error
    current = load_job(job_id) or job
    if current.get("status") == "cancelled":
        return
    job["updated"] = time.time()
    if rc == 0 or (job["files"] and not last_error):
        job.update(status="done", percent=100, speed="", eta="", item="")
    else:
        job.update(status="error", error=last_error or "yt-dlp a échoué (code %d)" % rc)
    save_job(job)


def stream(job, args, keep_title=False):
    """Lance yt-dlp et reporte sa progression dans la tâche ; renvoie (code, dernière erreur)."""
    last_save = 0.0
    last_error = ""
    proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, bufsize=1, env=dict(os.environ, PATH=PATH_ENV))
    for raw in proc.stdout:
        line = ANSI.sub("", raw.rstrip())
        print(line, flush=True)
        if line.startswith("[P]"):
            parts = (line[3:].split(";;") + ["", "", "", "", ""])[:5]
            try:
                job["percent"] = float(parts[0].strip().rstrip("%"))
            except ValueError:
                pass
            job["speed"] = parts[1].strip() if "N/A" not in parts[1] else ""
            job["eta"] = parts[2].strip() if "N/A" not in parts[2] else ""
            if parts[3] and parts[4] not in ("", "NA"):
                job["item"] = "%s/%s" % (parts[3], parts[4])
            if time.time() - last_save > 0.7:   # limite les écritures disque
                job["updated"] = time.time()
                save_job(job)
                last_save = time.time()
        elif line.startswith("[T]") and not keep_title:
            job["title"] = line[3:].strip() or job["title"]
            save_job(job)
        elif line.startswith("[F]"):
            job["files"].append(line[3:].strip())
        elif "ERROR:" in line:
            last_error = line.split("ERROR:", 1)[1].strip()
    return proc.wait(), last_error


def probe(req):
    url = str(req.get("url", "")).strip()
    if not YTDLP:
        return {"ok": False, "error": "yt-dlp introuvable"}
    args = [YTDLP, "-J", "--no-warnings", "--flat-playlist",
            "--yes-playlist" if req.get("playlist") else "--no-playlist", url]
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=60,
                           env=dict(os.environ, PATH=PATH_ENV))
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "Délai dépassé"}
    if r.returncode != 0:
        pin = pinterest_videos(url) if is_pinterest(url) else None
        if pin and pin[2]:
            title, thumb, videos = pin
            return {"ok": True, "title": title + (" (%d vidéos)" % len(videos) if len(videos) > 1 else ""),
                    "uploader": "Pinterest", "thumbnail": thumb, "extractor": "Pinterest", "webpage_url": url,
                    "playlist": False, "duration": None, "heights": [], "subtitles": [], "auto_subs": []}
        err = ANSI.sub("", r.stderr).strip().splitlines()
        err = (err[-1] if err else "Lien non pris en charge").replace("ERROR: ", "")
        return {"ok": False, "error": pinterest_hint(url) or err}
    info = json.loads(r.stdout)
    thumb = info.get("thumbnail") or ((info.get("thumbnails") or [{}])[-1].get("url"))
    res = {"ok": True, "title": info.get("title"), "uploader": info.get("uploader") or info.get("channel"),
           "thumbnail": thumb, "extractor": info.get("extractor_key"), "webpage_url": info.get("webpage_url") or url}
    if info.get("_type") == "playlist":
        entries = info.get("entries") or []
        res.update(playlist=True, count=info.get("playlist_count") or len(entries),
                   entries=[{"title": e.get("title"), "duration": e.get("duration")} for e in entries[:200]])
    else:
        heights = sorted({f["height"] for f in info.get("formats", [])
                          if f.get("height") and f.get("vcodec") not in (None, "none")}, reverse=True)
        res.update(playlist=False, duration=info.get("duration"), heights=heights,
                   subtitles=sorted(info.get("subtitles", {}).keys()),
                   auto_subs=sorted(k for k in info.get("automatic_captions", {}) if "-" not in k)[:40])
    return res


def open_path(path, reveal=False):
    if path and os.path.exists(path):
        subprocess.Popen(["/usr/bin/open"] + (["-R"] if reveal else []) + [path])
        return {"ok": True}
    return {"ok": False, "error": "Introuvable"}


def handle(msg):
    action = msg.get("action")
    if action == "ping":
        ver = ""
        if YTDLP:
            ver = subprocess.run([YTDLP, "--version"], capture_output=True, text=True).stdout.strip()
        return {"ok": True, "version": VERSION, "ytdlp": ver, "ffmpeg": bool(FFMPEG), "out": OUT_ROOT}
    if action == "probe":
        return probe(msg)
    if action == "download":
        return create_job(msg)
    if action == "jobs":
        schedule()
        return {"ok": True, "jobs": list_jobs(msg.get("limit", 40))}
    if action == "cancel":
        return cancel_job(msg.get("id", ""))
    if action == "clear":
        return clear_jobs()
    if action == "open_folder":
        path = os.path.join(OUT_ROOT, FOLDERS.get(msg.get("kind", ""), ""))
        os.makedirs(path, exist_ok=True)
        return open_path(path)
    if action == "reveal":
        job = load_job(msg.get("id", "")) or {}
        files = [f for f in job.get("files", []) if os.path.exists(f)]
        return open_path(files[-1], reveal=True) if files else open_path(job.get("folder"))
    if action == "settings":
        return {"ok": True, "settings": save_settings(msg.get("set") or {})}
    return {"ok": False, "error": "Action inconnue : %s" % action}


# ---------- entrées ----------

def native_loop():
    stdin, stdout = sys.stdin.buffer, sys.stdout.buffer
    while True:
        raw = stdin.read(4)
        if len(raw) < 4:
            return
        size = struct.unpack("<I", raw)[0]
        try:
            msg = json.loads(stdin.read(size).decode("utf-8"))
            reply = handle(msg)
        except Exception as e:  # la réponse doit toujours partir
            reply = {"ok": False, "error": str(e)}
        data = json.dumps(reply, ensure_ascii=False).encode("utf-8")
        stdout.write(struct.pack("<I", len(data)) + data)
        stdout.flush()


def main():
    a = sys.argv[1:]
    if not a or not a[0].startswith("--"):
        return native_loop()
    cmd = a[0]
    if cmd == "--worker":
        run_worker(a[1])
        schedule()
        return
    reply = {
        "--enqueue": lambda: create_job(json.loads(a[1])),
        "--jobs": lambda: {"ok": True, "jobs": (schedule(), list_jobs())[1]},
        "--cancel": lambda: cancel_job(a[1]),
        "--clear": clear_jobs,
        "--open": lambda: handle({"action": "open_folder", "kind": a[1] if len(a) > 1 else ""}),
        "--reveal": lambda: handle({"action": "reveal", "id": a[1]}),
        "--settings": lambda: {"ok": True, "settings": save_settings(json.loads(a[1]) if len(a) > 1 else {})},
        "--probe": lambda: probe({"url": a[1], "playlist": len(a) > 2}),
    }.get(cmd, lambda: {"ok": False, "error": "Commande inconnue"})()
    print(json.dumps(reply, ensure_ascii=False))


if __name__ == "__main__":
    main()
