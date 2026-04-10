const {createClient}  = require('redis')


async function startRedish(){
    const client = createClient({
        url:"redis://localhost:"
    })
}