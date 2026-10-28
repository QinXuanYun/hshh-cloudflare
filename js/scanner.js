/**
 * 沪上呼呼·藕粉非遗 — QR Scanner Module
 * 
 * Uses jsQR to decode QR codes from the camera stream.
 * When a QR code is detected containing a model ID,
 * navigates to #viewer?model=<id> to show the 3D model.
 *
 * Wire up: <script src="js/scanner.js"></script>
 * API:     window.Scanner.start() / window.Scanner.stop()
 */

(function () {
  'use strict';

  var scanner = {
    active: false,
    stream: null,
    animationId: null,
    video: null,
    canvas: null,
    ctx: null,
    onScan: null  // optional callback (modelId) => void
  };

  /**
   * Start the QR scanner.
   * @param {function(string)=} onScan  Optional callback invoked when a QR
   *                                     code is successfully decoded. Receives
   *                                     the model ID string.
   */
  function start(onScan) {
    if (scanner.active) return;

    if (typeof onScan === 'function') {
      scanner.onScan = onScan;
    }

    // Prefer the rear-facing camera
    var constraints = {
      video: { facingMode: { ideal: 'environment' } }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (s) {
        scanner.stream = s;
        scanner.active = true;

        // Create video element (not attached to DOM unless needed)
        var video = document.createElement('video');
        video.setAttribute('autoplay', '');
        video.setAttribute('playsinline', '');
        video.srcObject = s;
        video.style.display = 'none'; // hidden; we process frames on canvas
        document.body.appendChild(video);
        scanner.video = video;

        // Prepare off-screen canvas
        var canvas = document.createElement('canvas');
        scanner.canvas = canvas;
        scanner.ctx = canvas.getContext('2d');

        // Wait for video to have actual dimensions
        video.addEventListener('loadedmetadata', function () {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          tick();
        });

        // Fallback: if metadata already loaded
        if (video.readyState >= 1) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          tick();
        }
      })
      .catch(function (err) {
        console.warn('[Scanner] Camera access denied:', err.message);
      });
  }

  /** Internal loop: grab frame, run jsQR, check result */
  function tick() {
    if (!scanner.active) return;

    var video = scanner.video;
    var canvas = scanner.canvas;
    var ctx = scanner.ctx;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // Draw current video frame onto canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Try to decode QR from the canvas pixel data
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        // Try to extract model ID from QR data
        var modelId = parseModelId(code.data);
        if (modelId) {
          stop();
          if (typeof scanner.onScan === 'function') {
            scanner.onScan(modelId);
          } else {
            window.location.hash = '#viewer?model=' + encodeURIComponent(modelId);
          }
          return;
        }
      }
    }

    scanner.animationId = requestAnimationFrame(tick);
  }

  /**
   * Extract a model ID from QR code data.
   * Supported formats:
   *   - Just a number: "1", "2", "3"
   *   - "model:1" or "model=1" style
   *   - A URL fragment: "#viewer?model=1"
   * Returns the model ID string or null.
   */
  function parseModelId(data) {
    if (!data || typeof data !== 'string') return null;

    var str = data.trim();

    // Direct numeric ID
    if (/^\d+$/.test(str)) {
      return str;
    }

    // model:123 or model=123
    var match = str.match(/model[=:](\d+)/i);
    if (match) return match[1];

    // URL hash fragment like #viewer?model=123
    var hashMatch = str.match(/[#?&]model=(\d+)/i);
    if (hashMatch) return hashMatch[1];

    return null;
  }

  /**
   * Stop the scanner — release camera and cancel animation.
   */
  function stop() {
    scanner.active = false;

    if (scanner.animationId) {
      cancelAnimationFrame(scanner.animationId);
      scanner.animationId = null;
    }

    if (scanner.stream) {
      var tracks = scanner.stream.getTracks();
      tracks.forEach(function (t) { t.stop(); });
      scanner.stream = null;
    }

    if (scanner.video && scanner.video.parentNode) {
      scanner.video.parentNode.removeChild(scanner.video);
      scanner.video = null;
    }

    scanner.canvas = null;
    scanner.ctx = null;
  }

  // Export public API
  window.Scanner = {
    start: start,
    stop: stop,
    active: function () { return scanner.active; }
  };

})();
