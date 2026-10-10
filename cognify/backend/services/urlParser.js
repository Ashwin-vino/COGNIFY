const dns = require('dns').promises;
const net = require('net');
const cheerio = require('cheerio');

// Private IP range patterns to prevent Server-Side Request Forgery (SSRF)
function isPrivateIp(ip) {
  if (!ip) return true;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata service)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (Private network)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (Multicast)
    if (parts[0] >= 224) return true;
    return false;
  }

  // IPv6 checks
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    // Unique local address fc00::/7
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local address fe80::/10
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    return false;
  }

  return true;
}

/**
 * Validates target URL against SSRF threats and extracts clean text content.
 */
async function fetchAndParseUrl(urlString) {
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a complete URL starting with http:// or https://');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost and cloud metadata hostnames
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.includes('metadata.google') ||
    hostname.includes('169.254.169.254')
  ) {
    throw new Error('Access to private or local destination is blocked for security.');
  }

  // Resolve hostname via DNS to prevent DNS rebinding to private IPs
  try {
    const resolved = await dns.lookup(hostname);
    if (isPrivateIp(resolved.address)) {
      throw new Error('Access to private network address is forbidden.');
    }
  } catch (dnsErr) {
    if (dnsErr.message && dnsErr.message.includes('forbidden')) throw dnsErr;
    throw new Error(`Failed to resolve domain: ${hostname}`);
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(urlString, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CognifyStudyBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Web server responded with status code HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error(`Unsupported content type from URL: ${contentType}. Must be an HTML webpage or text.`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, noscript, nav, footer, header, aside, iframe, svg, form').remove();

    // Extract title
    const pageTitle = $('title').text().trim() ||
      $('h1').first().text().trim() ||
      parsedUrl.hostname;

    // Prefer main or article content if available
    let contentEl = $('article, main, [role="main"]').first();
    if (!contentEl.length) {
      contentEl = $('body');
    }

    let text = contentEl.text()
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    if (!text || text.length < 50) {
      throw new Error('The webpage does not contain sufficient readable text or requires JavaScript rendering.');
    }

    return {
      title: pageTitle,
      url: urlString,
      domain: parsedUrl.hostname,
      text: text,
      pageCount: 1,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request to webpage timed out after 10 seconds.');
    }
    throw err;
  }
}

module.exports = {
  fetchAndParseUrl,
  isPrivateIp,
};
