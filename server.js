/**
 * WordPress Plugin Downloader API
 *
 * This acts as a proxy between the client and the WordPress SVN/Download repository.
 * It validates URLs, ensures the plugin exists, and streams the ZIP file directly to the client
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

/**
 * Extracts the plugin slug from a standard WordPress URL.
 *
 * Input: https://wordpress.org/plugins/list-github-repositories/
 * Output: list-github-repositories
 */
const getSlugFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/plugins\/([a-z0-9-]+)\/?$/i);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
};

/**
 * Endpoint to proxy the download of a WordPress plugin zip file.
 */
app.get('/api/download', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Please provide a URL.' });
  }

  const slug = getSlugFromUrl(url);
  if (!slug) {
    return res.status(400).json({
      error:
        'Invalid WordPress Plugin URL. It should look like: https://wordpress.org/plugins/plugin-name/',
    });
  }

  // Construct the official WordPress Repo download URL
  const downloadUrl = `https://downloads.wordpress.org/plugin/${slug}.zip`;

  console.log(`[INFO] Attempting download for: ${slug}`);

  try {
    // We send a HEAD request first to check if the file exists without downloading the body.
    // This saves bandwidth if the user made a typo or the plugin doesn't exist.
    await axios.head(downloadUrl);

    // Stream Fetching
    // This pipes data chunk-by-chunk to the client rather than
    // loading the entire 10MB+ zip file into memory
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
    });

    // Trigger a browser download with the correct filename
    res.setHeader('Content-Disposition', `attachment; filename=${slug}.zip`);
    res.setHeader('Content-Type', 'application/zip');

    // Pipe Data
    response.data.pipe(res);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(`[WARN] Plugin not found: ${slug}`);
      return res.status(404).json({
        error: `Plugin not found. The slug "${slug}" does not exist in the repository.`,
      });
    }

    console.error('[ERROR] Download failed:', error.message);
    return res
      .status(500)
      .json({ error: 'Internal Server Error. Could not fetch plugin.' });
  }
});

app.listen(PORT, () => {
  console.log(`==================================`);
  console.log(`🚀 Server running on Port ${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`==================================`);
});
