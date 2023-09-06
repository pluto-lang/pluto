IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
PROJECT_NAME='pulumi-dapr'
STAGE="staging"

rm -r dist/

### generate configuration
cp -r ../../template/* ./
sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./package.json ./Pulumi.yaml
mv ./Pulumi.prod.yaml ./Pulumi.$STAGE.yaml


### compile CIR(biz + runtime ts) and PIR(pulumi ts) to js
cp -r ../../pluto ./
cp ../../aws-runtime.ts ./
npm run build
rm -r ./pluto
rm ./aws-runtime.ts


### add dependencies
cp -r ../../node_modules ./dist/
# cp ./package.json ./dist/
# pushd ./dist
# npm install
# popd
mv dist/pluto dist/node_modules/@pluto


### deploy
pulumi down -s $STAGE -y
pulumi up -s $STAGE -y