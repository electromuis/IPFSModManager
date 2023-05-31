import { ArgumentParser } from 'argparse';
import * as tqdmmod from 'tqdm';
const tqdm = tqdmmod.default;
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import * as inquirermod from 'inquirer';
const inquirer = inquirermod.default;

import * as ipfsHttpClient from 'ipfs-http-client'
import OrbitDB from 'orbit-db'
import * as IPFS from 'ipfs-core'
import { webRTCStar } from '@libp2p/webrtc-star'
import wrtc from 'wrtc'
import {HttpGateway} from 'ipfs-http-gateway'
import { createFactory } from 'ipfsd-ctl'
import { multiaddr } from '@multiformats/multiaddr'
import * as ipfsctl from 'ipfsd-ctl'
import * as goIpfs from 'go-ipfs'

let ipfsd = null;
let ipfs = null;
let orbitdb = null;
let packsdb = null;

const mountBase = "C:/dev/smdlm2/IPFS/";
const stepmaniaBase = "C:/Games/StepMania 5.1/";
const dbAddr = '/orbitdb/zdpuAo7ojftB6buY9s5avYN5dvEovMPX4LEBDFeWnfCMJ8juH/packsdb3'

const ipfaConfig = {
    repo: './ipfsdlm3',
    config: {
        Bootstrap: [
            '/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'
        ],
        Addresses: {
            Swarm: [
                '/ip4/0.0.0.0/tcp/4020'
            ]
        }
    },
    libp2p: {
        config: {
            dht: {
                enabled: true
            }
        }
    }
}

function packInfoFromFolder(folder) {

}

async function initDB() {
    ipfsd = await ipfsctl.createController({
        type: 'go',
        ipfsHttpModule: ipfsHttpClient,
        ipfsBin: goIpfs.path(),
        args: ['--enable-pubsub-experiment'],
        // disposable: false,
        // forceKill: false,
        // remote: true,
        ipfsOptions: {
            repo: './ipfsdlm5',
            config: {
                // Bootstrap: [
                //     '/ip4/127.0.0.1/tcp/4008/ws/ipfs/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'
                // ]
                // Peering: {
                //     Peers: [
                //         {
                //             ID: "12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr",
                //             Addrs: [
                //                 '/ip4/127.0.0.1/tcp/4008/ws/ipfs',
                //                 '/ip4/127.0.0.1/tcp/4002/p2p'
                //             ]
                //         }
                //     ]
                // }
            }
        }
        //     

        //     // config: {
        //     //     Bootstrap: [
        //     //         // '/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'
        //     //     ],
        //     //     Addresses: {
        //     //         // API: "/ip4/0.0.0.0/tcp/5001",
        //     //         Swarm: [
        //     //             // '/ip4/0.0.0.0/tcp/4021'
        //     //         ],
        //     //     }
        //     // }
        // }
    })
    // console.log(await ipfsd.api.id())
    await ipfsd.api.id()
    ipfs = ipfsd.api

    // ipfs = ipfsHttpClient.create(new URL('http://127.0.0.1:5001'))
    // ipfs = await IPFS.create(ipfaConfig)

    console.log("Connecting to bootstrap node")
    await ipfs.swarm.connect(multiaddr('/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'))
    // await ipfs.swarm.connect(multiaddr('/ip4/127.0.0.1/tcp/4008/ws/ipfs/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'))
    // await new Promise(resolve => setTimeout(resolve, 1000));

    orbitdb = await OrbitDB.createInstance(ipfs, {
        directory: './ipfsdlm5/orbitdb'
    })
    packsdb = await orbitdb.docstore(dbAddr)
    console.log("Connected, db: ", packsdb.address.toString())

    
    await new Promise((resolve, reject) => {
        const rejector = setTimeout(() => {
            reject("Replication timeout")
        }, 30000);

        packsdb.events.on('replicated', () => {
            console.log('DB replicated')
            clearTimeout(rejector);
            resolve();
        })
    });
    await packsdb.load()
}

function getPack(input) {
    let pack = packsdb.get(input);
    if(pack.length == 1) {
        return pack[0];
    }

    pack = packsdb.query((doc) => doc.name == input);
    if(pack.length == 1) {
        return pack[0];
    }

    if(pack.length > 1) {
        console.log("Multiple packs found for: ", input);
        // TODO sort by data
        
        return null;
    }

}

function listFiles(folder, parentPath) {
    let ret = []

    const files = fs.readdirSync(folder);
    for(let file of files) {
        const fullpath = path.join(folder, file);
        const stat = fs.statSync(fullpath);
        if(stat.isDirectory()) {
            ret = ret.concat(listFiles(fullpath, path.join(parentPath, file)));
        } else {
            ret.push({
                path: path.join(parentPath, file),
                content: fs.createReadStream(fullpath)
            });
        }
    }

    return ret
}

async function uploadFolder(folder, packName, cb) {
    const allFiles = listFiles(folder, packName);
    let fileNum = 0
    let lastHash = null;

    for await (const file of ipfs.addAll(allFiles)) {
        fileNum++;
        lastHash = file.cid.toString();
        cb(fileNum / allFiles.length * 100);
    }
    
    return lastHash;
}

async function addPack(args) {
    const pack = args.pack;
    if(!fs.existsSync(pack)) {
        console.log("Pack folder doesn't exist");
        return;
    }

    const packName = path.basename(pack)

    let packInfo = packsdb.get(packName)
    if(packInfo.length > 0) {
        console.log("Pack already exists", packInfo[0]);
        return;
    }

    console.log(`Uploading ${packName}`)

    const command = [
        goIpfs.path(),
        'add',
        '-r',
        '-Q',
        '-p',
        `"${pack}"`
    ].join(" ")

    const adder = spawn(command, { shell: true });
    adder.stderr.on('data', (data) => {
        // regex match for progress
        const progress = parseFloat(data.toString().match(/[\d\.]+%/g));
        if(progress) {
            process.stdout.write(`\r Progress: ${progress}%`);
        }
    });

    const hash = await new Promise((resolve, reject) => {
            adder.stdout.on('data', (data) => {
                resolve(data.toString().trim());
            });
        }
    );

    console.log(`Pack uploaded, hash: <${hash}>`)

    const now = (new Date().toISOString());

    packInfo = {
        _id: packName,
        name: packName,
        cid: hash,
        bannerCid: null,
        version: 1,
        path: `Songs/${packName}/`,
        createtAt: now,
        updatedAt: now,
        author: args.author ?? "Unknown",
        tags: [],
        website: null
    }

    await packsdb.put(packInfo);
    console.log("Added pack", packInfo);

}

async function addPack2(args) {
    const pack = args.pack;
    if(!fs.existsSync(pack)) {
        console.log("Pack folder doesn't exist");
        return;   
    }

    const packName = path.basename(pack)
    console.log(`Uploading ${packName}`)

    const hash = await uploadFolder(pack, packName, (progress) => {
        const progressInt = Math.floor(progress);
        process.stdout.write(`\r Progress: ${progressInt}%`);
    })

    let packInfo = packsdb.get(packName)
    if(packInfo.length > 0) {
        console.log("Pack already exists", packInfo[0]);
        return;
    }

    console.log(`Pack uploaded, hash: <${hash}>`)

    let bannerHash = null;

    for await (const file of ipfs.ls(hash)) {
        if(file.path.endsWith(".png")) {
            bannerHash = file.cid.toString();
            break;
        }
    }

    const now = (new Date().toISOString());

    packInfo = packInfoFromFolder(pack);

    packInfo = {
        _id: packName,
        name: packName,
        cid: hash,
        bannerCid: bannerHash,
        version: 1,
        path: `Songs/${packName}/`,
        createtAt: now,
        updatedAt: now,
        author: args.author ?? "Unknown",
        tags: [],
        website: null
    }

    await packsdb.put(packInfo);
    console.log("Added pack", packInfo);
}

async function installPack(args) {
    const pack = getPack(args.pack);
    if(!pack) {
        console.log("Pack not found");
        return;
    }

    const targetPath = `${songsBase}${pack.name}`;
    if(fs.existsSync(targetPath)) {
        console.log(`${pack.name} already installed`);
        return;
    }

    console.log("Installing pack", pack.name);

    const command = [
        'mklink',
        '/J',
        `"${songsBase}${pack.name}"`,
        `"${mountBase}${pack._id}"`,
    ].join(" ")

    await new Promise(resolve => {
        exec(command, (err, stdout, stderr) => {
            if(err || stderr) {
                console.log("Error installing pack", err, stderr);
                resolve();
                return;
            }
        })
    })

    console.log("Installed pack", pack.name)
}

async function selectPacks(args) {
    const packs = packsdb.query((doc) => true)
    let packOptions = []
    for(let pack of packs) {
        packOptions.push({
            name: pack.name,
            value: pack._id,
            checked: fs.existsSync(`${songsBase}${pack.name}`)
        })
    }

    const answers = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'packs',
            message: 'Select packs to install',
            choices: packOptions,
            validate: function(answer) {
                if(answer.length < 1) {
                    return "You must choose at least one pack";
                }
                return true;
            }
        }
    ])

    for(let answer of answers.packs) {
        const pack = getPack(answer);
        if(!pack) {
            console.log("Pack not found");
            return;
        }
        installPack({ pack: pack._id });
    }
}

async function startDaemon() {
    // const star = webRTCStar({ wrtc })

    // const ipfs = await IPFS.create({
    //     config: {
    //         Addresses: {
    //             Swarm: [
    //                 '/ip4/127.0.0.1/tcp/13579/ws/p2p-webrtc-star'
    //             ],
    //             API: "/ip4/127.0.0.1/tcp/5002",
    //         }
    //     },
    //     libp2p: {
    //         transports: [
    //             star.transport
    //         ],
    //         peerDiscovery: [
    //             star.discovery
    //         ]
    //     }
    // })

    // console.log(`HTTP API listening on ${ipfs.apiAddr}`)

    // const gateway = new HttpGateway(ipfs)
    // await gateway.start()
    // const gatewayUrl = gateway._gatewayServers[0].info.uri
    // console.log('IPFS Gateway: ', gatewayUrl)

    const myIpfs = await IPFS.create({
        repo: './ipfsdlm9',
        config: {
            Bootstrap: [
                // '/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWJYfoietrMgtLR64SF7sxhUxLhnPXFgjGNhzJT243cnks'
                // '/ip4/127.0.0.1/tcp/4002/p2p/12D3KooWFh9Usq8fMhqYTLjRfqWDCUm4dHknTBgaYrrGT5Cgc1pr'
            ],
            // Addresses: {
            //     Swarm: [
            //     ]
            // }
        }
    })

    const myOrbitdb = await OrbitDB.createInstance(myIpfs)
    const myPacksdb = await myOrbitdb.docstore(dbAddr)
    // await packsdb.load()
    
    console.log("Daemon running, db: ", myPacksdb.address.toString())
}

const parser = new ArgumentParser({
    description: 'StepMania Download Manager 2'
});

let subcommands = parser.add_subparsers({dest:'command'});
let packs_parser = subcommands.add_parser('list');

let add_parser = subcommands.add_parser('upload');
add_parser.add_argument('pack', { help: 'Folder of the pack to add' });
add_parser.add_argument('--author', { help: 'Author of the pack' });

let install_parser = subcommands.add_parser('install');
install_parser.add_argument('pack', { help: 'Pack to install' });

let select_parser = subcommands.add_parser('select');

let daemon_parser = subcommands.add_parser('daemon');

const args = parser.parse_args();

async function run(args) {
    if(args.command == "list") {
        await initDB();

        console.log("Packs:")
        const packs = packsdb.query((doc) => true)
        for(let pack of packs) {
            console.log(pack);
        }
    }
    else if(args.command == "upload") {
        await initDB();
        await addPack(args);
    }
    else if(args.command == "install") {
        await initDB();
        await installPack(args);
    }
    else if(args.command == "select") {
        await initDB();
        await selectPacks(args);
    }
    else if(args.command == "daemon") {
        await startDaemon();
    }
    else {
        console.log("Unknown command");
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if(orbitdb) {
        console.log("Closing orbitdb")
        await orbitdb.disconnect();
    }

    // if(ipfs)
    //     ipfs.stop();


    if(ipfsd) {
        console.log("Stopping ipfsd")
        ipfsd.stop()
    }

    console.log("Done")
}

run(args);

   
// parser.add_argument('-v', '--version', { action: 'version', version });
// parser.add_argument('-f', '--foo', { help: 'foo bar' });
// parser.add_argument('-b', '--bar', { help: 'bar foo' });
// parser.add_argument('--baz', { help: 'baz bar' });

// http://localhost:8080/ipfs/QmajSMZbCvftaTG24dTWLqTcwKt7dadgEihBYLfuL3kcZM/QmajSMZbCvftaTG24dTWLqTcwKt7dadgEihBYLfuL3kcZM?filename=Pack.gz&download=true&format=tar
// http://localhost:8080/api/v0/get?arg=QmajSMZbCvftaTG24dTWLqTcwKt7dadgEihBYLfuL3kcZM&output=apple&archive=true&compress=true
