const CACHE_NAME = 'wildsaltdrive-v2'; // 建议每次修改 sw.js 都升一下版本号
const ASSETS_TO_CACHE = [
  '/', // 必须缓存根路径
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png', // 请确认这个路径和文件名在服务器上真实存在！
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // 使用 map 逐个添加，防止其中一个 404 导致全部失败
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// 激活逻辑保持不变...

self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 排除掉外部统计脚本或上传接口，不进行缓存
  if (event.request.url.includes('api.wildsalt.me') || event.request.url.includes('/upload')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果请求成功，动态存入缓存
        if (response.status === 200) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        // 离线时回退到缓存
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // 如果是页面请求但没缓存，可以返回一个统一的离线 HTML
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});