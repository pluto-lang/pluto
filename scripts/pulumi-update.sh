IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
PROJECT_NAME='pulumi-dapr'
STAGE="staging"

SCRIPT_DIR=$(cd $(dirname $0);pwd)
LANG_ROOT=$(dirname $SCRIPT_DIR)

rm -r dist/

### generate building configuration
cp -r $LANG_ROOT/template/* ./
sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./package.json ./Pulumi.yaml
mv ./Pulumi.prod.yaml ./Pulumi.$STAGE.yaml


### compile CIR(biz + runtime ts) and PIR(pulumi ts) to js
cp -r $LANG_ROOT/pluto ./
cp $LANG_ROOT/aws-runtime.ts ./
npm run build
rm -r ./pluto
rm ./aws-runtime.ts


### add dependencies
cp -r $LANG_ROOT/node_modules ./dist/
# cp ./package.json ./dist/
# pushd ./dist
# npm install
# popd
mv dist/pluto dist/node_modules/@pluto


### deploy
pulumi up -s $STAGE -y