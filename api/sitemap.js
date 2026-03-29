export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://cbqbqncbjxfwrhhgxmjk.supabase.co';
    const supabaseKey = 'sb_publishable_XEBmcn5vcJGWBDO3GH9GRw_f55J9d9_';

    let events = [];
    try {
      // Use native fetch to get dynamic event data safely from Supabase
      const response = await fetch(`${supabaseUrl}/rest/v1/events?select=id,event_id,created_at`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      if (response.ok) {
        events = await response.json();
      }
    } catch (loadError) {
      console.error('Error fetching events from DB:', loadError);
      // Fallback: Continue with empty events array to still generate static URLs
    }

    const baseUrl = 'https://bookmycollegeevent.com';

    // Base static pages requested
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/events', priority: '0.8', changefreq: 'daily' }
    ];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Safe helper function to handle dates
    const getIsoDate = (dateString) => {
      try {
        if (!dateString) return new Date().toISOString();
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };

    const today = new Date().toISOString();

    // 1. Output static pages
    for (const page of staticPages) {
      sitemap += `  <url>\n    <loc>${baseUrl}${page.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
    }

    // 2. Output dynamic event pages securely, avoiding duplicates
    const seenUrls = new Set();
    
    for (const event of events) {
      if (!event) continue;
      
      const slug = event.event_id || event.id; // prefer readable event_id, fallback to UUID id
      if (!slug) continue;
      
      const url = `${baseUrl}/events/${slug}`;
      if (seenUrls.has(url)) continue;
      
      seenUrls.add(url);

      const lastmod = getIsoDate(event.created_at);
      
      sitemap += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    sitemap += `</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // good practice
    res.status(200).send(sitemap);

  } catch (globalError) {
    console.error('Fatal Sitemap Error:', globalError);
    // Extreme fallback: Prevent a hard crash and only output the homepage
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bookmycollegeevent.com/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  }
}
