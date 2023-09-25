IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
PROJECT_NAME=${1-"pulumi-dapr"}
STAGE=${2-staging}

SCRIPT_DIR=$(cd $(dirname $0);pwd)
LANG_ROOT=$(dirname $SCRIPT_DIR)

APP_FILE=${3-$LANG_ROOT/examples/http-service/main.ts}
OUT_PATH=${4-$LANG_ROOT/examples/http-service/_output}


cd $OUT_PATH
### generate building configuration
cp -r $LANG_ROOT/template/Dockerfile $LANG_ROOT/template/tsconfig.json $LANG_ROOT/template/package.json ./
sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./package.json


### compile CIR(biz + runtime ts) and PIR(pulumi ts) to js
rm -r dist
cp -r $LANG_ROOT/src/pluto ./
cp $LANG_ROOT/aws-runtime.ts ./
yarn link @pulumi/dapr
npx tsc --outDir dist
rm -r ./pluto
rm ./aws-runtime.ts


### add dependencies
cp -r $LANG_ROOT/node_modules ./dist/
# cp ./package.json ./dist/
# pushd ./dist
# npm install
# popd
mkdir dist/node_modules/@pluto
cp -r dist/pluto dist/node_modules/@pluto/pluto


### add and configure Dapr
cp -r $LANG_ROOT/.dapr ./dist/
cp -r dapr ./dist/.dapr/components


### build container image
# aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 811762874732.dkr.ecr.us-east-1.amazonaws.com
# docker build --platform=linux/amd64 --tag $IMAGE_NAME .
# docker push $IMAGE_NAME