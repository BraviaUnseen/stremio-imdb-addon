const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

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
        // Fallback
    }
    return null;
}

// Fetch list items via CorsProxy
async function getImdbListItems(listId) {
    try {
        const targetUrl = `https://www.imdb.com/list/${listId}/`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

        const response = await axios.get(proxyUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        const html = response.data || '';
        const matches = html.match(/tt\d{7,8}/g) || [];
        const uniqueIds = [...new Set(matches)];

        return uniqueIds.map(id => ({ id, name: id }));
    } catch (error) {
        console.error(`Proxy fetch failed for ${listId}:`, error.message);
        return [];
    }
}

app.get('/', (req, res) => res.send('IMDb Addon Active'));

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

// Catalog Route
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type;
    
    const items = await getImdbListItems(lsCode);
    
    const metaPromises = items.map(async (item) => {
        const cinemeta = await getCinemetaMeta(item.id, reqType);
        if (cinemeta) return cinemeta;

        return {
            id: item.id,
            type: reqType,
            name: item.name,
            poster: `https://images.metahub.space/poster/medium/${item.id}/img`
        };
    });

    const metas = await Promise.all(metaPromises);
    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
