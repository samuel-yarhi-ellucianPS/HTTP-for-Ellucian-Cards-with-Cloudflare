module.exports = {
    name: 'Test for HTTP Methods Extension',
    publisher: 'Sam Yarhi',
    cards: [{
        type: 'GET for data models',
        source: './src/cards/HTTPCard',
        title: 'GET for data models',
        displayCardType: 'GET for data models',
        description: 'This is a card that uses HTTP by leveraging a Cloudflare worker to safely make GET requests to ethos APIs.',
        // pageRoute: {
        //     route: '/',
        //     excludeClickSelectors: ['a']
        // }
    }],
    page: {
        source: './src/page/router.jsx'
    }
};