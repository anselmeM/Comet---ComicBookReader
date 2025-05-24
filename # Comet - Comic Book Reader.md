# Comet - Comic Book Reader

Comet is a Progressive Web App (PWA) designed for an enhanced comic book reading experience directly in your browser. It's built to be fast, reliable, and installable on your devices.

**Live Demo:** [https://anselmem.github.io/Comet---ComicBookReader/](https://anselmem.github.io/Comet---ComicBookReader/)

## Features

*   **PWA Ready:** Installable on desktop and mobile devices for an app-like experience.
*   **Offline Access:** Core application shell and cached comics (if implemented) can be accessed offline thanks to Service Workers.
*   **Comic Book Format Support:** (Specify supported formats, e.g., .cbz, .cbr - *assuming based on typical comic readers*)
*   **User-Friendly Interface:** Designed for easy navigation and reading.
*   **Responsive Design:** Adapts to various screen sizes.
*   **(Add other specific features your reader has)**

## Tech Stack

*   HTML5
*   CSS3
*   JavaScript
*   Service Workers (for PWA capabilities and caching)
*   Manifest.json (for PWA metadata)
*   (Mention any frameworks or key libraries used, e.g., JSZip for .cbz handling)

## Getting Started

### Prerequisites

*   A modern web browser that supports PWAs (e.g., Chrome, Edge, Firefox, Safari).

### Installation / Usage

1.  **Access the PWA:**
    Open [https://anselmem.github.io/Comet---ComicBookReader/](https://anselmem.github.io/Comet---ComicBookReader/) in your browser.

2.  **Install (Optional):**
    *   **Desktop:** Look for an install icon in the address bar (usually a computer with a down arrow or a plus icon).
    *   **Mobile:** Your browser might prompt you to "Add to Home Screen."

3.  **Using the Reader:**
    *   (Describe how to open/load a comic book file)
    *   (Describe navigation controls - next/previous page, zoom, etc.)

## Development

If you wish to contribute or run the project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/anselmem/Comet---ComicBookReader.git
    cd Comet---ComicBookReader
    ```
2.  **Serve locally:**
    You can use a simple HTTP server to run the PWA. For example, using Python:
    ```bash
    python -m http.server
    ```
    Or using Node.js with `http-server`:
    ```bash
    npx http-server .
    ```
    Then open `http://localhost:8080` (or the port specified by your server) in your browser.

## Troubleshooting

*   **File Not Found / Caching Issues:** If you encounter issues after an update, try clearing your browser's cache and service worker for the site. For PWAs, a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) is often helpful.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## License

(Specify your license, e.g., MIT License. If you don't have one yet, consider adding one.)