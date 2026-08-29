<script lang="ts">
  import BrushCanvas from '$lib/BrushCanvas.svelte'

  const repositoryUrl = 'https://github.com/adotew/chromazen'
  const latestDownloadUrl = `${repositoryUrl}/releases/latest/download`
</script>

<svelte:head>
  <title>Chromazen — Minimal Native Painting App</title>
  <link rel="icon" href="/app-icon-source.png" />
  <meta
    name="description"
    content="Chromazen is a minimal native painting application focused on brush performance."
  />
</svelte:head>

<BrushCanvas />

<main>
  <div class="intro">
    <img class="app-icon" src="/app-icon-source.png" alt="" width="512" height="505" />
    <h1>Chromazen</h1>
    <p>A lightweight, distraction-free painting application focused on performance.</p>
    <div class="download-buttons">
      <a class="download-button" href={`${latestDownloadUrl}/Chromazen.dmg`}>
        <svg viewBox="0 0 384 512" aria-hidden="true">
          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.5 4 272.8c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.7-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.6-91.2zM260.2 104.5c27.3-32.4 24.8-61.9 24-72.5-24.7 1.4-53.4 16.8-69.2 34.6-17.4 19.8-27.8 44.3-25.6 71.9 26.7 2.1 51.3-11.7 70.8-34z" />
        </svg>
        macOS
      </a>
      <a class="download-button" href={`${latestDownloadUrl}/Chromazen-windows-x64.zip`}>
        <svg viewBox="0 0 448 512" aria-hidden="true">
          <path d="M0 93.7 183.6 68.3v176.9H0V93.7zm0 324.6 183.6 25.4V268.4H0v149.9zm203.8 28.2L448 480V268.4H203.8v178.1zm0-381L448 32v213.2H203.8V65.5z" />
        </svg>
        Windows x64
      </a>
    </div>
    <a class="github-button" href={repositoryUrl} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.91c-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0 1 12 6.95a9.4 9.4 0 0 1 2.5.34c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
        />
      </svg>
      GitHub
    </a>
  </div>
</main>
