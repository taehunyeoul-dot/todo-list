/* 오프라인 지원 서비스 워커 — 네트워크 우선
   인터넷이 되면 항상 서버의 최신 파일을 쓰고, 끊겼을 때만 저장해 둔 사본을 쓴다.
   (이전의 '캐시 먼저' 방식은 앱을 닫았다 열어도 옛 화면이 계속 나오는 문제가 있었음) */
const CACHE = "todo-app-v26";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  /* cache:"reload" — 브라우저 HTTP 캐시(10분)를 건너뛰고 서버에서 새로 받아 저장 */
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((u) =>
        fetch(u, { cache: "reload" })
          .then((res) => { if (res && res.ok) return c.put(u, res); })
          .catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isPage = e.request.mode === "navigate";
  /* cache:"no-cache" — 서버에 바뀌었는지 매번 확인(안 바뀌었으면 304로 가볍게 끝남) */
  e.respondWith(
    fetch(url.href, { cache: "no-cache", credentials: "same-origin" })
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(isPage ? "./" : e.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(isPage ? "./" : e.request).then((hit) =>
          hit || caches.match("./index.html")
        )
      )
  );
});
