const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Cache map to store metadata temporarily
const metadataCache = new Map();

// Helper to fetch item metadata from Cinemeta
async function fetchCinemetaMeta(id, type) {
    const cacheKey = `${id}_${type}`;
    if (metadataCache.has(cacheKey)) {
        return metadataCache.get(cacheKey);
    }

    try {
        const response = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 3000 });
        if (response.data && response.data.meta) {
            const meta = response.data.meta;
            metadataCache.set(cacheKey, meta);
            return meta;
        }
    } catch (e) {
        // Fallback if Cinemeta fails or item isn't of this specific type
    }
    return null;
}

// Fetch list items from IMDb
async function getImdbListItems(listId) {
    // Method 1: IMDb JSON Suggestion Endpoint (Bypasses Cloudflare)
    try {
        const url = `https://v3.sg.media-imdb.com/suggestion/${listId.substring(0, 1)}/${listId}.json`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        if (response.data && response.data.d) {
            return response.data.d.map(item => ({ id: item.id, title: item.l }));
        }
    } catch (e) {
        console.log(`Suggestion API bypassed for ${listId}`);
    }

    // Method 2: Fallback Regex Parsing
    try {
        const htmlUrl = `https://www.imdb.com/list/${listId}/`;
        const response = await axios.get(htmlUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 5000
        });

        const matches = response.data.match(/tt\d{7,8}/g) || [];
        const uniqueIds = [...new Set(matches)];
        return uniqueIds.map(id => ({ id: id, title: id }));
    } catch (error) {
        console.error(`Failed to scrape list ${listId}:`, error.message);
        return [];
    }
}

app.get('/', (req, res) => res.send('IMDb Addon Server Active'));

// Manifest Route
app.get('/:lsCode/manifest.json', (req, res) => {
    const lsCode = req.params.lsCode;
    res.json({
        id: `org.custom.imdb.${lsCode}`,
        version: '1.0.0',
        name: `IMDb List (${lsCode})`,
        description: `Live IMDb catalog for list ${lsCode}`,
        resources: ['catalog'],
        types: ['series', 'movie'],
        catalogs: [
            { type: 'series', id: `imdb_${lsCode}`, name: `IMDb Series: ${lsCode}` },
            { type: 'movie', id: `imdb_${lsCode}`, name: `IMDb Movies: ${lsCode}` }
        ]
    });
});

// Catalog Endpoint with Cinemeta Enrichment
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type; // 'series' or 'movie'
    
    const rawItems = await getImdbListItems(lsCode);
    
    // Resolve full metadata for each item matching requested category
    const metaPromises = rawItems.map(async (item) => {
        const cinemeta = await fetchCinemetaMeta(item.id, reqType);
        if (cinemeta) {
            return cinemeta;
        }
        // Fallback placeholder object if item is unindexed in Cinemeta
        return {
            id: item.id,
            type: reqType,
            name: item.title || item.id,
            poster: `https://images.metahub.space/poster/medium/${item.id}/img`
        };
    });

    const metas = await Promise.all(metaPromises);
    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
