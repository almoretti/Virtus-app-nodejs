import { useEffect, useState } from "react";

let csrfToken: string | null = null;

export function useCSRF() {
  const [isLoading, setIsLoading] = useState(!csrfToken);

  useEffect(() => {
    if (!csrfToken) {
      fetchCSRFToken();
    }
  }, []);

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch("/api/csrf");
      if (response.ok) {
        const data = await response.json();
        csrfToken = data.csrfToken;
      }
    } catch (error) {
      // console.error("Failed to fetch CSRF token:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaders = (additionalHeaders?: HeadersInit): HeadersInit => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(additionalHeaders as Record<string, string>),
    };

    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }

    return headers;
  };

  return {
    csrfToken,
    isLoading,
    getHeaders,
    refreshToken: fetchCSRFToken,
  };
}

// Helper function for API calls with CSRF protection
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get CSRF token if not already fetched
  if (!csrfToken && options.method !== "GET") {
    try {
      const response = await fetch("/api/csrf");
      if (response.ok) {
        const data = await response.json();
        csrfToken = data.csrfToken;
      }
    } catch (error) {
      // console.error("Failed to fetch CSRF token:", error);
    }
  }

  // Add CSRF token to headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (csrfToken && options.method !== "GET") {
    headers["x-csrf-token"] = csrfToken;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}