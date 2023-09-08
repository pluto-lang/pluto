PROJECT_NAME=${1-"pulumi-dapr"}
STAGE=${2-staging}

SCRIPT_DIR=$(cd $(dirname $0);pwd)
LANG_ROOT=$(dirname $SCRIPT_DIR)

CMD=${3-"destroy"}  # state, destroy

TMP_DIR=$(mktemp -d)
mkdir -p $TMP_DIR

### generate pulumi configuration
pushd $TMP_DIR > /dev/null 2>&1
cp -r $LANG_ROOT/template/* ./
sed -i "" "s/%{project_name}/${PROJECT_NAME}/g" ./Pulumi.yaml
mv ./Pulumi.prod.yaml ./Pulumi.$STAGE.yaml

pulumi stack init --stack $STAGE > /dev/null 2>&1
if [ "state" = $CMD ]; then
    pulumi stack -s $STAGE

elif [ "destroy" = $CMD ]; then
    pulumi down -s $STAGE -y
fi
popd > /dev/null 2>&1

rm -r $TMP_DIR
