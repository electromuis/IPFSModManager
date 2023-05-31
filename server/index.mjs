import OrbitDB from "orbit-db"
import { create } from 'ipfs-http-client'

const dbaddr = process.env.DB_ADDR || 'packdb'
const ipfsaddr = process.env.IPFS_ADDR || 'http://ipfs:5005'

const orbitdbConfig = {
    directory: './orbitdb'
}

const dbConfig = {
    // create: true,
    // replicate: true,
    // type: 'docstore',
    accessController: {
        write: ['*']
    }
}

async function run() {
    await new Promise(resolve => setTimeout(resolve, 12000))

    const ipfs = create(new URL(ipfsaddr))

    const orbitdb = await OrbitDB.createInstance(ipfs, orbitdbConfig)
    // const db = await orbitdb.open(dbaddr, dbConfig)
    const db = await orbitdb.docstore(dbaddr, dbConfig)
    await db.load()

    db.events.on('replicated', () => {
        console.log('DB replicated')

        console.log("Packs:")
        const packs = db.query((doc) => true)
        for(let pack of packs) {
            console.log(pack);
        }
    })

    console.log('DB: ', db.address.toString())

    console.log("Packs:")
    const packs = db.query((doc) => true)
    for(let pack of packs) {
        console.log(pack);
    }
}

run()