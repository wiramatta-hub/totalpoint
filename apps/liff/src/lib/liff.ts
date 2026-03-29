"use client";

import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

let initialized = false;

export async function initLiff(): Promise<boolean> {
  if (initialized) return true;
  try {
    await liff.init({
      liffId: LIFF_ID,
      withLoginOnExternalBrowser: true,
    });
    initialized = true;
    return true;
  } catch (e) {
    console.error("LIFF init failed:", e);
    return false;
  }
}

export function getLiff() {
  return liff;
}

export async function getLiffAccessToken(): Promise<string | null> {
  if (!initialized) await initLiff();
  if (!liff.isLoggedIn()) {
    liff.login();
    return null;
  }
  return liff.getAccessToken();
}

export async function getLiffProfile() {
  if (!initialized) await initLiff();
  if (!liff.isLoggedIn()) return null;
  return liff.getProfile();
}

export function getOS(): string {
  return liff.getOS() ?? "web";
}

export function closeApp() {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}
