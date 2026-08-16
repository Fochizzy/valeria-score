import { ScrollViewStyleReset } from 'expo-router/html'
import { type PropsWithChildren } from 'react'

/**
 * Custom HTML shell for the web build (used at static render time only).
 * Paints the document dark before the JS bundle loads, adds share/SEO meta,
 * and restores a visible keyboard-focus ring that react-native-web hides.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        <title>Valeria Score</title>
        <meta
          name="description"
          content="A fan-made score keeper for Valeria: Card Kingdoms. Live table sessions, duke picks, solo mode, and stats for every game night."
        />
        <meta name="theme-color" content="#0A0F1E" />
        <meta name="color-scheme" content="dark" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Valeria Score" />
        <meta
          property="og:description"
          content="Track every final score for Valeria: Card Kingdoms — live table sessions, duke stats, and solo mode."
        />
        <meta property="og:image" content="/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #0A0F1E;
              }
              /* react-native-web suppresses outlines; restore them for
                 keyboard users without affecting mouse clicks. */
              *:focus-visible {
                outline: 2px solid #8E72FF;
                outline-offset: 2px;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
