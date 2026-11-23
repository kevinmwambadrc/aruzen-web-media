#!/usr/bin/python3
"""Aruzen Web Media : hôte natif partagé par les extensions et le widget.

Modes :
  chrome-extension://…      messagerie native (lancé par Chrome / Edge)
  --enqueue '<json>'        crée une tâche (widget)
  --worker <id>             exécute yt-dlp pour une tâche
  --jobs                    liste des tâches en JSON
  --cancel <id> | --retry <id> | --clear | --open <type> | --reveal <id>
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

VERSION = "2.0.0"
HOME = os.path.expanduser("~")
APP_DIR = os.path.join(HOME, "Library", "Application Support", "AruzenWebMedia")
JOBS_DIR = os.path.join(APP_DIR, "jobs")
LOGS_DIR = os.path.join(APP_DIR, "logs")
WORK_DIR = os.path.join(APP_DIR, "work")   # un dossier par tâche : aucun conflit de noms entre tâches
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
    "cookies_browser": "",   # comptes connectés : chrome, edge, safari, firefox, brave (v2)
}
COOKIE_BROWSERS = ("chrome", "edge", "safari", "firefox", "brave")


def cookie_args(settings):
    b = settings.get("cookies_browser", "")
    return ["--cookies-from-browser", b] if b in COOKIE_BROWSERS else []


def friendly(err):
    """Message clair pour les erreurs les plus courantes de yt-dlp."""
    e = err or ""
    if re.search(r"\b(log ?in|logged[- ]in|--cookies|sign in to|private video|members[- ]only|age[- ]restricted|confirm your age)\b", e, re.I):
        return ("Contenu réservé aux comptes connectés. Active « Comptes connectés » "
                "dans Widget vidéo › Performance (navigateur où tu es connecté), puis ↻.")
    if "HTTP Error 403" in e:
        return "Accès refusé par le site (403). Mets yt-dlp à jour : brew upgrade yt-dlp, puis ↻."
    return e
# Formats de sortie proposés par les extensions.
VIDEO_FORMATS = ("mp4", "mkv", "webm", "mov", "avi", "gif")
AUDIO_FORMATS = ("mp3", "m4a", "aac", "opus", "flac", "wav")
SUB_FORMATS = ("srt", "vtt", "ass", "lrc", "txt")
THUMB_FORMATS = ("jpg", "png", "webp")
TIME_RE = re.compile(r"^\d{1,3}(:\d{1,2}){0,2}(\.\d+)?$")
GIF_FILTER = ("-vf fps=12,scale=%d:-2:flags=lanczos,split[a][b];"
              "[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4 -an -sn -dn -loop 0")
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

for d in (JOBS_DIR, LOGS_DIR, WORK_DIR):
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
    if s["cookies_browser"] not in COOKIE_BROWSERS:
        s["cookies_browser"] = ""
    write_json(SETTINGS_FILE, s)
    return s


def clean_time(t):
    """« 1:30 », « 90 » ou « 0:01:30 » ; vide si invalide."""
    t = str(t or "").strip().replace(",", ".")
    return t if TIME_RE.match(t) else ""


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
    if req.get("container", "mp4") not in VIDEO_FORMATS:
        return {"ok": False, "error": "Format vidéo inconnu : %s" % req.get("container")}
    if req.get("audio_format", "mp3") not in AUDIO_FORMATS:
        return {"ok": False, "error": "Format audio inconnu : %s" % req.get("audio_format")}
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
        "vcodec": req.get("vcodec", "compat"),       # compat (H.264) ou best
        "audio_quality": str(req.get("audio_quality", "0")),
        "start": clean_time(req.get("start")),        # extrait : début
        "end": clean_time(req.get("end")),            # extrait : fin
        "embed_subs": bool(req.get("embed_subs")),
        "sub_format": req.get("sub_format", "srt"),
        "thumb_format": req.get("thumb_format", "jpg"),
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
            shutil.rmtree(work_dir(j), ignore_errors=True)
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

def clip_label(job):
    """« (extrait 0m20s-0m23s) » : deux extraits d'une même vidéo ne portent pas le même nom."""
    def fmt(t):
        parts = [p for p in t.split(":")]
        units = ["h", "m", "s"][-len(parts):]
        return "".join(p + u for p, u in zip(parts, units))
    if not (job.get("start") or job.get("end")):
        return ""
    return " (extrait %s-%s)" % (fmt(job.get("start") or "0"), fmt(job["end"]) if job.get("end") else "fin")


def work_dir(job):
    return os.path.join(WORK_DIR, re.sub(r"[^\w-]", "", job["id"]))


def build_args(job, settings, url=None, name=None):
    out = os.path.join(OUT_ROOT, FOLDERS[job["kind"]])
    os.makedirs(out, exist_ok=True)
    work = work_dir(job)
    os.makedirs(work, exist_ok=True)
    name = name or "%(title).150B [%(id)s]" + clip_label(job).replace("%", "%%") + ".%(ext)s"
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
    args += ["-P", work]   # chemins relatifs : --trim-filenames ne coupe que le nom
    if FFMPEG:
        args += ["--ffmpeg-location", os.path.dirname(FFMPEG)]
    if job.get("referer"):
        args += ["--referer", job["referer"]]
    args += cookie_args(settings)

    q = job.get("quality", "best")
    kind = job["kind"]
    media = job.get("media") if kind == "playlist" else kind

    def section_args():
        if not (job.get("start") or job.get("end")):
            return []
        return ["--download-sections", "*%s-%s" % (job.get("start") or "0", job.get("end") or "inf"),
                "--force-keyframes-at-cuts"]

    def video_args():
        fmt = job.get("container", "mp4")
        compat = job.get("vcodec", "compat") != "best"
        h264 = ",vcodec:h264,acodec:aac"
        a = []
        if fmt == "gif":
            # Animation légère : image seule, 480 px max, palette optimisée.
            cap = min(int(q), 480) if q.isdigit() else 480
            a += ["-f", "bv*[height<=%d]/b[height<=%d]/bv*/b" % (cap, cap), "-S", "res:%d" % cap,
                  "--recode-video", "gif", "--postprocessor-args",
                  "VideoConvertor:-threads %d %s" % (settings["ffmpeg_threads"], GIF_FILTER % cap)]
            return a + section_args()
        res = "res:%s" % q if q.isdigit() else "res"
        if fmt == "mp4":
            a += ["-S", res + (h264 if compat else ",ext:mp4:m4a"),
                  "--merge-output-format", "mp4/mkv", "--remux-video", "mp4"]
        elif fmt == "mkv":
            a += ["-S", res + (h264 if compat else ""), "--merge-output-format", "mkv", "--remux-video", "mkv"]
        elif fmt == "webm":
            # VP9/AV1 + Opus choisis en priorité : conversion seulement si le site n'en propose pas.
            a += ["-S", res + ",vcodec:vp9,acodec:opus", "--merge-output-format", "webm/mkv",
                  "--recode-video", "webm", "--postprocessor-args",
                  "VideoConvertor:-threads %d -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -row-mt 1 -b:v 0 -crf 32 -c:a libopus"
                  % settings["ffmpeg_threads"]]
        elif fmt == "mov":
            a += ["-S", res + h264, "--merge-output-format", "mp4/mkv", "--remux-video", "mov"]
        elif fmt == "avi":
            a += ["-S", res + h264, "--merge-output-format", "mp4/mkv", "--remux-video", "avi"]
        a.append("--embed-metadata")
        if job.get("embed_subs") and fmt in ("mp4", "mkv", "webm", "mov"):
            a += ["--embed-subs", "--write-subs", "--write-auto-subs", "--sub-langs", job.get("sub_langs") or "fr,en"]
        return a + section_args()

    def audio_args():
        fmt = job.get("audio_format", "mp3")
        aq = job.get("audio_quality", "0")
        if not re.match(r"^(\d|\d{2,3}K)$", aq) or fmt in ("flac", "wav"):
            aq = "0"
        a = ["-f", "ba/b", "-x", "--audio-format", fmt, "--audio-quality", aq, "--embed-metadata"]
        if fmt in ("mp3", "m4a", "flac", "opus"):
            a.append("--embed-thumbnail")
        return a + section_args()

    if kind == "playlist":
        args += ["--yes-playlist", "-o",
                 os.path.join("%(playlist_title,uploader,id)s", "%(playlist_index)03d - %(title).120B.%(ext)s")]
        if job.get("items"):
            args += ["--playlist-items", job["items"]]
        args += audio_args() if media == "audio" else video_args()
    else:
        args += ["--no-playlist", "-o", name]
        if kind == "video":
            args += video_args()
        elif kind == "audio":
            args += audio_args()
        elif kind == "subs":
            sf = job.get("sub_format", "srt")
            args += ["--skip-download", "--write-subs", "--write-auto-subs",
                     "--sub-langs", job.get("sub_langs") or "fr,en",
                     "--convert-subs", "srt" if sf in ("txt", "srt") or sf not in SUB_FORMATS else sf]
        elif kind == "thumb":
            tf = job.get("thumb_format", "jpg")
            args += ["--skip-download", "--write-thumbnail",
                     "--convert-thumbnails", tf if tf in THUMB_FORMATS else "jpg"]
        elif kind == "file":
            args += ["-o", "%(title).150B.%(ext)s"]
    args.append(url or job["url"])
    return args, out


def run_worker(job_id):
    job = load_job(job_id)
    if not job or job["status"] == "cancelled":
        return
    settings = load_settings()
    shutil.rmtree(work_dir(job), ignore_errors=True)   # relance : on repart d'un dossier propre
    args, out = build_args(job, settings)
    job.update(status="running", pid=os.getpid(), started=time.time(), updated=time.time(), folder=out, files=[])
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
        shutil.rmtree(work_dir(job), ignore_errors=True)
        return
    work = work_dir(job)
    if rc == 0 and job["kind"] == "subs" and job.get("sub_format") == "txt":
        srt_to_txt(work, 0)
    job["files"] = move_outputs(work, out)
    job["updated"] = time.time()
    if rc == 0 or (job["files"] and not last_error):
        job.update(status="done", percent=100, speed="", eta="", item="")
    else:
        job.update(status="error", error=friendly(last_error) or "yt-dlp a échoué (code %d)" % rc)
    save_job(job)


def unique_path(path):
    """Ne remplace jamais un fichier existant : « nom (2).ext », « nom (3).ext »…"""
    if not os.path.exists(path):
        return path
    base, ext = os.path.splitext(path)
    n = 2
    while os.path.exists("%s (%d)%s" % (base, n, ext)):
        n += 1
    return "%s (%d)%s" % (base, n, ext)


def move_outputs(work, out):
    """Range les fichiers terminés de la tâche dans le dossier Web Media, puis efface le dossier de travail."""
    moved = []
    for root, _dirs, files in os.walk(work):
        for f in sorted(files):
            if f.endswith((".part", ".ytdl", ".tmp")) or ".part-Frag" in f or ".temp." in f or f.startswith("."):
                continue
            src = os.path.join(root, f)
            dest = unique_path(os.path.join(out, os.path.relpath(src, work)))
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.move(src, dest)
            moved.append(dest)
    shutil.rmtree(work, ignore_errors=True)
    return moved


def srt_to_txt(folder, since):
    """Transforme les .srt écrits par la tâche en transcription texte (sans horodatage ni doublons)."""
    made = []
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        if not name.endswith(".srt") or os.path.getmtime(path) < since - 2:
            continue
        lines, prev = [], ""
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                line = re.sub(r"<[^>]+>", "", line).strip()
                if not line or line.isdigit() or "-->" in line or line == prev:
                    continue
                lines.append(line)
                prev = line
        txt = path[:-4] + ".txt"
        with open(txt, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        os.remove(path)
        made.append(txt)
    return made


def retry_job(job_id):
    job = load_job(job_id)
    if not job:
        return {"ok": False, "error": "Tâche introuvable"}
    if job["status"] not in ("error", "cancelled"):
        return {"ok": False, "error": "Seules les tâches en erreur ou annulées se relancent"}
    job.update(status="queued", percent=0, speed="", eta="", item="", files=[], error="",
               created=time.time(), updated=time.time())
    save_job(job)
    schedule()
    return {"ok": True}


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
            "--yes-playlist" if req.get("playlist") else "--no-playlist"] + cookie_args(load_settings()) + [url]
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
        return {"ok": False, "error": pinterest_hint(url) or friendly(err)}
    info = json.loads(r.stdout)
    thumb = info.get("thumbnail") or ((info.get("thumbnails") or [{}])[-1].get("url"))
    res = {"ok": True, "title": info.get("title"), "uploader": info.get("uploader") or info.get("channel"),
           "thumbnail": thumb, "extractor": info.get("extractor_key"), "webpage_url": info.get("webpage_url") or url}
    if info.get("_type") == "playlist":
        entries = info.get("entries") or []
        res.update(playlist=True, count=info.get("playlist_count") or len(entries),
                   entries=[{"title": e.get("title"), "duration": e.get("duration")} for e in entries[:200]])
    else:
        fmts = info.get("formats") or []
        size = lambda f: f.get("filesize") or f.get("filesize_approx") or 0
        audio = max([size(f) for f in fmts if f.get("vcodec") == "none" and f.get("acodec") not in (None, "none")] or [0])
        sizes = {}
        for f in fmts:
            h = f.get("height")
            if h and f.get("vcodec") not in (None, "none") and size(f):
                total = size(f) + (audio if f.get("acodec") in (None, "none") else 0)
                sizes[str(h)] = max(sizes.get(str(h), 0), total)
        heights = sorted({f["height"] for f in fmts
                          if f.get("height") and f.get("vcodec") not in (None, "none")}, reverse=True)
        res.update(playlist=False, duration=info.get("duration"), heights=heights, sizes=sizes,
                   audio_size=audio,
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
    if action == "retry":
        return retry_job(msg.get("id", ""))
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
        "--retry": lambda: retry_job(a[1]),
        "--clear": clear_jobs,
        "--open": lambda: handle({"action": "open_folder", "kind": a[1] if len(a) > 1 else ""}),
        "--reveal": lambda: handle({"action": "reveal", "id": a[1]}),
        "--settings": lambda: {"ok": True, "settings": save_settings(json.loads(a[1]) if len(a) > 1 else {})},
        "--probe": lambda: probe({"url": a[1], "playlist": len(a) > 2}),
    }.get(cmd, lambda: {"ok": False, "error": "Commande inconnue"})()
    print(json.dumps(reply, ensure_ascii=False))


if __name__ == "__main__":
    main()
