/* eslint-disable no-undef */
// Firebase Messaging Service Worker (Background Notifications)
// Configure firebaseConfig below or set self.firebaseConfig before import.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

function resolveFirebaseConfig() {
  return self.firebaseConfig || {
    apiKey: self.FIREBASE_API_KEY,
    authDomain: self.FIREBASE_AUTH_DOMAIN,
    projectId: self.FIREBASE_PROJECT_ID,
    storageBucket: self.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
    appId: self.FIREBASE_APP_ID,
  };
}

function initFirebase(config) {
  if (!config || !config.apiKey) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      const title = notification.title || 'Nova mensagem no Lanly';
      const options = {
        body: notification.body || 'Você tem uma nova notificação.',
        icon: notification.icon || '/lanly-logo.png',
        badge: '/lanly-logo.png',
        data: {
          url: data.url || '/',
        },
      };
      self.registration.showNotification(title, options);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FCM SW] Firebase init failed', err);
  }
}

initFirebase(resolveFirebaseConfig());

self.addEventListener('message', (event) => {
  if (event?.data?.type === 'FIREBASE_CONFIG') {
    self.firebaseConfig = event.data.config;
    initFirebase(event.data.config);
  }
});
