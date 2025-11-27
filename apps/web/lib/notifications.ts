export function canUseNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!canUseNotifications()) return false;

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  const result = await Notification.requestPermission();
  return result === "granted";
}

type ShowNotificationOpts = {
  title: string;
  body: string;
  icon?: string;
};

export function showBrowserNotification(opts: ShowNotificationOpts) {
  if (!canUseNotifications()) return;
  if (Notification.permission !== "granted") return;

  const notif = new Notification(opts.title, {
    body: opts.body,
    icon: opts.icon,
  });

  notif.onclick = () => {
    window.focus();
  };
}
