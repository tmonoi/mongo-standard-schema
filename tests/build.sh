#!/bin/bash

set -euo pipefail

npm pack

mkdir ./build 2>/dev/null || true
mv -f mongo-standard-schema*.tgz ./build/mongo-standard-schema.tgz
tar xf ./build/mongo-standard-schema.tgz --directory=./build/

cd tests/esm/
rm -f package-lock.json
pnpm install
cd ../..

cd tests/ts/
rm -f package-lock.json
rm -f ./dist/*
pnpm install
cd ../..

cd tests/ts-nodenext/
rm -f package-lock.json
rm -f ./dist/*
pnpm install
cd ../..
