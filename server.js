const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

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

        // Method 1: Extract from IMDb Next.js Embedded JSON (__NEXT_DATA__)
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedData = JSON.parse(jsonMatch[1]);
                const listItems = parsedData?.props?.pageProps?.contentData?.entityList?.items || 
                                  parsedData?.props?.pageProps?.mainColumnData?.list?.titleListItemSearch?.edges || [];
                
                listItems.forEach(item => {
                    const titleId = item?.titleId || item?.node?.title?.id;
                    const itemType = item?.titleType?.type || item?.node?.title?.titleType?.id;
                    if (titleId) {
                        metas.push({
                            id: titleId,
                            type: (itemType && itemType.includes('tv')) ? 'series' : 'movie',
                            name: titleId
                        });
                    }
                });
            } catch (e) {
                console.log('Failed parsing __NEXT_DATA__, falling back to regex extraction');
            }
        }

        // Method 2: Fallback Regex for tt IDs if JSON parsing didn't catch them
        if (metas.length === 0) {
            const matches = html.match(/tt\d{7,8}/g) || [];
            const uniqueIds = [...new Set(matches)];
            uniqueIds.forEach(id => {
                // Return as both series and movie formats so Stremio captures both
                metas.push({ id: id, type: 'series', name: id });
                metas.push({ id: id, type: 'movie', name: id });
            });
        }

        return metas;
    } catch (error) {
        console.error(`Error scraping IMDb list ${listId}:`, error.message);
        return [];
    }
}

app.get('/', (req, res) => res.send('IMDb Addon Server Active'));

// Stremio Manifest - Supporting both Movies & Series
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

// Stremio Catalog Endpoint
app.get('/:lsCode/catalog/:type/:catalogId', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type; // 'series' or 'movie'
    const allMetas = await getImdbListItems(lsCode);
    
    // Filter metas according to request type
    const metas = allMetas.filter(item => item.type === reqType);
    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server active on port ${PORT}`));
