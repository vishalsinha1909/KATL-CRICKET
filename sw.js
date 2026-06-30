/* KATL Cricket service worker — handles push notifications */
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "KATL Cricket", body: "Tap to open the app." };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  const options = {
    body: data.body,
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: data.tag || "katl",
    data: { url: data.url || "." },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || ".";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
