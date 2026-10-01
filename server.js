const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

// Enable CORS for Stremio client requests
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Helper function to extract title IDs from any IMDb list
async function getImdbListItems(listId) {
    try {
        const url = `https://www.imdb.com/list/${listId}/`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const html = response.data;
        const metas = [];
        const seenIds = new Set();

        // Method 1: Extract from IMDb Next.js Embedded State (__NEXT_DATA__)
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedData = JSON.parse(jsonMatch[1]);
                
                // Parse items from IMDb's list payload
                const listItems = 
                    parsedData?.props?.pageProps?.contentData?.entityList?.items || 
                    parsedData?.props?.pageProps?.mainColumnData?.list?.titleListItemSearch?.edges || [];
                
                listItems.forEach(item => {
                    const titleId = item?.titleId || item?.node?.title?.id;
                    if (titleId && !seenIds.has(titleId)) {
                        seenIds.add(titleId);
                        metas.push({ id: titleId, name: titleId });
                    }
                });
            } catch (e) {
                console.log('JSON state parse failed, using fallback regex');
            }
        }

        // Method 2: Fallback Regex Scraper for all tt IDs on the page
        if (metas.length === 0) {
            const matches = html.match(/tt\d{7,8}/g) || [];
            matches.forEach(id => {
                if (!seenIds.has(id)) {
                    seenIds.add(id);
                    metas.push({ id: id, name: id });
                }
            });
        }

        return metas;
    } catch (error) {
        console.error(`Error scraping IMDb list ${listId}:`, error.message);
        return [];
    }
}

// Landing page route
app.get('/', (req, res) => {
    res.send('IMDb Stremio Addon Server Active');
});

// Stremio Manifest Route
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

// Stremio Catalog Route (Express wildcard matching handles optional .json extension)
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type; // 'series' or 'movie'
    
    const rawItems = await getImdbListItems(lsCode);
    
    // Attach current requested type to ensure Stremio renders metadata posters correctly
    const metas = rawItems.map(item => ({
        id: item.id,
        type: reqType,
        name: item.id
    }));

    res.json({ metas });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
