if [ ! -d "libs/pyright-internal" ]; then
    tar -xvf libs/pyright-internal-1.1.352.tgz -C libs/
    mv libs/package libs/pyright-internal
    cd libs/pyright-internal
    npm install --production
fi