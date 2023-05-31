SET IPFS_PATH=repo
..\ipfs.exe init
..\ipfs.exe config --json Bootstrap []
..\ipfs.exe config --json Addresses.Swarm [\"/ip4/0.0.0.0/tcp/4002\"]
..\ipfs.exe config --json Addresses.API \"/ip4/127.0.0.1/tcp/5005\"
..\ipfs.exe config --json Addresses.Gateway \"/ip4/127.0.0.1/tcp/8088\"
..\ipfs.exe daemon --enable-pubsub-experiment