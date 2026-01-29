// This function has been deprecated and is no longer in use.
// The form embedding logic has been moved to the client-side using the Gemini API for static code generation.
// See `services/geminiService.ts` and `components/form-builder/EmbedCodeModal.tsx`.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (_req) => {
  const body = `
    <h1>This function is deprecated</h1>
    <p>The form embedding logic has been moved to a new client-side AI generation service.</p>
  `;
  return new Response(body, {
    headers: { 'Content-Type': 'text/html' },
  });
});
