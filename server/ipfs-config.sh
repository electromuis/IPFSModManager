#!/bin/sh

## The shell in the go-ipfs container is busybox, so a version of ash
## Shellcheck might warn on things POSIX sh cant do, but ash can
## In Shellcheck, ash is an alias for dash, but busybox ash can do more than dash 
## https://github.com/koalaman/shellcheck/blob/master/src/ShellCheck/Data.hs#L134
echo "setting Gateway config"

# ipfs bootstrap add /dns/relay/tcp/4001/p2p/12D3KooWJYfoietrMgtLR64SF7sxhUxLhnPXFgjGNhzJT243cnks
ipfs config --json Addresses.Swarm [\"/ip4/0.0.0.0/tcp/4001\"]
# ipfs config --json Addresses.API \"/ip4/0.0.0.0/tcp/5005\"
ipfs config --json Bootstrap []

# ipfs config --json Swarm.EnableDHT true
# ipfs bootstrap add /dnsaddr/node/tcp/4001/p2p/
# ipfs bootstrap add /dnsaddr/node/tcp/4001
# ipfs bootstrap add /ip4/172.22.0.4/tcp/4001/p2p/12D3KooWBXAyytxWpkArLsAfRXLTDwC53NrHGeUtGwdtsgj3GBmE
# ipfs bootstrap add /ip4/172.22.0.4/tcp/4001/p2p/
# ipfs bootstrap add /ip4/172.22.0.4/tcp/4001

## Obviously you should use your own domains here, but I thought it instructive to show path and 
## subdomain gateways here with the widely known PL domains

## Maybe you dont have a public port for each go-ipfs instance?
## You should try and give each node a pubic port, this will add latency and may reduce 
## the ability to fetch data.
## This is using the new hole punching feature https://blog.ipfs.io/2022-01-20-libp2p-hole-punching/
#ipfs config --json Swarm.EnableHolePunching true
#ipfs config --json Swarm.RelayClient.Enabled true

## Maybe you need to listen on IPv6 too? Some clouds use it for internal networking
#ipfs config --json Addresses.Gateway '["/ip4/0.0.0.0/tcp/8080","/ip6/::/tcp/8080"]'

## Maybe you want to look quick on https://ipfs.github.io/public-gateway-checker/ ;-)
#(sleep 5 && ipfs pin add bafybeifx7yeb55armcsxwwitkymga5xf53dxiarykms3ygqic223w5sk3m)&
#(sleep 5 && ipfs pin add bafybeibwzifw52ttrkqlikfzext5akxu7lz4xiwjgwzmqcpdzmp3n5vnbe)&

## Maybe ipfs does not know what IP is pointed at it? (some sort of TCP load balancer in front)
## Note that it must be 1-1, you can't point at multiple go-ipfs nodes and expect it to work
#ipfs config --json Addresses.Announce '["/ip4/SOME_IP/tcp/4001"]'