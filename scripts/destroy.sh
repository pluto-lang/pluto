PROJECT_NAME=${1-"pulumi-dapr"}
STAGE=${2-staging}

SCRIPT_DIR=$(cd $(dirname $0);pwd)
LANG_ROOT=$(dirname $SCRIPT_DIR)

TMP_DIR=/tmp/pluto/tmp
mkdir -p $TMP_DIR

### generate pulumi configuration
pushd $TMP_DIR
cp -r $LANG_ROOT/template/* ./
sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./Pulumi.yaml
mv ./Pulumi.prod.yaml ./Pulumi.$STAGE.yaml

pulumi down -s $STAGE -y
popd

rm -r $TMP_DIR