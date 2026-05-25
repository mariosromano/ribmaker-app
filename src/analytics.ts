// Thin wrapper around posthog-js. Safe to call before PostHog is initialized
// (e.g., when no API key is configured — calls are silently dropped).
//
// All event names are snake_case. All properties use a flat shape so they're
// easy to filter on in PostHog's UI.

import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics(apiKey: string | undefined) {
  if (!apiKey || initialized) return;
  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // anonymous unless explicit identify
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false, // we opted into session replay
  });
  initialized = true;
}

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: Props) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Identify a user once we have a real signal (e.g., email at quote time).
// PostHog will then link past anonymous activity to this identity.
export function identify(email: string, traits?: Props) {
  if (!initialized) return;
  posthog.identify(email, traits);
}
