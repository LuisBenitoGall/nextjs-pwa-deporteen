'use client';

import { useState, useEffect, useCallback } from 'react';

// Define the structure for the picker file response
export interface PickerFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes: number;
  accessToken: string;
}

interface UseGooglePickerOptions {
  apiKey: string;
  clientId: string;
  scope?: string[];
  onFilePicked: (file: PickerFile) => void;
}

// Global state to prevent multiple script loads
let scriptLoaded = false;
let gapiLoaded = false;
let gisLoaded = false;

export function useGooglePicker({
  apiKey,
  clientId,
  scope = ['https://www.googleapis.com/auth/drive.file'],
  onFilePicked
}: UseGooglePickerOptions) {
  const [isPickerReady, setIsPickerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGapiScript = useCallback(() => {
    if (scriptLoaded) return;
    scriptLoaded = true;

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('client:picker', () => {
        gapiLoaded = true;
        if (gisLoaded) setIsPickerReady(true);
      });
    };
    script.onerror = () => setError('Failed to load Google API script.');
    document.body.appendChild(script);
  }, []);

  const loadGisScript = useCallback(() => {
    if (gisLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      if (gapiLoaded) setIsPickerReady(true);
    };
    script.onerror = () => setError('Failed to load Google Identity Services script.');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    loadGapiScript();
    loadGisScript();
  }, [loadGapiScript, loadGisScript]);

  const createPicker = useCallback((accessToken: string) => {
    if (!isPickerReady) {
      setError('Google Picker is not ready.');
      return;
    }

    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes('image/*,video/*');

    const picker = new window.google.picker.PickerBuilder()
      .setApiKey(apiKey)
      .setAppId(clientId.split('-')[0]) // The App ID is the first part of the client ID
      .setOAuthToken(accessToken)
      .addView(view)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          onFilePicked({
            id: doc.id,
            name: doc.name,
            mimeType: doc.mimeType,
            url: doc.url, // This is a temporary URL
            sizeBytes: doc.sizeBytes,
            accessToken,
          });
        }
      })
      .build();
    picker.setVisible(true);
  }, [apiKey, clientId, isPickerReady, onFilePicked]);

  const openPicker = useCallback(() => {
    if (!gisLoaded) {
        setError('Google authentication service not ready.');
        return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scope.join(' '),
      callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          // Persist token so useStorageProvider can detect Drive availability
          try { sessionStorage.setItem('google_access_token', tokenResponse.access_token); } catch {}
          createPicker(tokenResponse.access_token);
        }
      },
    });

    tokenClient.requestAccessToken();
  }, [clientId, scope, createPicker]);

  return { openPicker, isPickerReady, error };
}

// Helper to fetch the file content using the access token
export async function fetchGoogleDriveFile(file: PickerFile): Promise<Blob> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: {
      'Authorization': `Bearer ${file.accessToken}`,
    }
  });

  if (!response.ok) {
    throw new Error('Failed to download file from Google Drive.');
  }

  return response.blob();
}

/**
 * Requests a Google OAuth token with drive.file scope and saves it to sessionStorage.
 * Does NOT open the picker — use this to "connect" Drive from account settings.
 */
export function connectGoogleDrive(clientId: string, onSuccess?: () => void): void {
    if (typeof window === 'undefined') return;

    const doConnect = () => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => {
                if (tokenResponse?.access_token) {
                    try {
                        sessionStorage.setItem('google_access_token', tokenResponse.access_token);
                        localStorage.setItem('google_drive_connected_at', new Date().toISOString());
                    } catch {}
                    onSuccess?.();
                }
            },
        });
        tokenClient.requestAccessToken();
    };

    if (window.google?.accounts?.oauth2) {
        doConnect();
        return;
    }
    // Load GIS if not yet loaded
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (!existing) {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = doConnect;
        document.body.appendChild(s);
    } else {
        existing.addEventListener('load', doConnect);
    }
}

// Extend the global window object for Google's libraries
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
