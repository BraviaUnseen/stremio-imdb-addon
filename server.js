const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Cache for Cinemeta responses
const metaCache = new Map();

async function getCinemetaMeta(id, type) {
    const key = `${id}_${type}`;
    if (metaCache.has(key)) return metaCache.get(key);

    try {
        const res = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 3000 });
        if (res.data && res.data.meta) {
            metaCache.set(key, res.data.meta);
            return res.data.meta;
        }
    } catch (e) {
        // Cinemeta fetch error fallback
    }
    return null;
}

// Extraction engine that tries 3 methods to fetch list item IDs
async function getImdbListItems(listId) {
    let titleIds = [];

    // Method 1: IMDb internal JSON suggestion API
    try {
        const url = `https://v3.sg.media-imdb.com/suggestion/${listId.charAt(0)}/${listId}.json`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });
        if (res.data && res.data.d) {
            titleIds = res.data.d.map(item => item.id).filter(id => id && id.startsWith('tt'));
        }
    } catch (e) {
        console.log(`Suggestion API bypass failed for ${listId}`);
    }

    // Method 2: CSV Export Endpoint
    if (titleIds.length === 0) {
        try {
            const csvUrl = `https://www.imdb.com/list/${listId}/export`;
            const res = await axios.get(csvUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 5000
            });
            const matches = res.data.match(/tt\d{7,8}/g) || [];
            titleIds = [...new Set(matches)];
        } catch (e) {
            console.log(`CSV export failed for ${listId}`);
        }
    }

    // Method 3: Direct HTML Regex Scraping
    if (titleIds.length === 0) {
        try {
            const htmlUrl = `https://www.imdb.com/list/${listId}/`;
            const res = await axios.get(htmlUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 5000
            });
            const matches = res.data.match(/tt\d{7,8}/g) || [];
            titleIds = [...new Set(matches)];
        } catch (e) {
            console.error(`HTML scraping failed for ${listId}:`, e.message);
        }
    }

    return titleIds;
}

app.get('/', (req, res) => res.send('IMDb Stremio Addon Server Active'));

// Manifest Endpoint
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

// Catalog Endpoint
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type; // 'series' or 'movie'
    
    const ids = await getImdbListItems(lsCode);
    
    // Process items in parallel with fallback poster assets
    const metas = await Promise.all(ids.map(async (id) => {
        const enrichedMeta = await getCinemetaMeta(id, reqType);
        if (enrichedMeta) return enrichedMeta;

        // Fallback item so metas is never empty for valid IDs
        return {
            id: id,
            type: reqType,
            name: id,
            poster: `https://images.metahub.space/poster/medium/${id}/img`
        };
    }));

    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
